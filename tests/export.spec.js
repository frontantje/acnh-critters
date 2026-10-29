// Export (transfer codes), the name, and importing over existing progress.
import { readFile } from 'node:fs/promises';
import { expect, hemisphereSelect, importData, normalize, row, skipWelcome, stored, test } from './support.js';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const CODE = /ACNH1-[A-Za-z0-9_-]+/;

/** @param {import('@playwright/test').Page} page */
const dialog = (page) => page.getByRole('dialog');
/** @param {import('@playwright/test').Page} page */
const shownCode = async (page) => normalize((await dialog(page).locator('output').textContent()) ?? '');
/** @param {import('@playwright/test').Page} page */
const menuName = (page) => page.getByTestId('menu-name');

/** @param {import('@playwright/test').Page} page */
async function openExport(page, menu = 'Menu', item = 'Export data') {
  await page.getByRole('button', { name: menu }).click();
  await page.getByRole('button', { name: item }).click();
  await expect(dialog(page)).toBeVisible();
}

/** @param {import('@playwright/test').Page} page */
async function openImport(page) {
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Import data' }).click();
  await expect(dialog(page)).toBeVisible();
}

/**
 * Replaces the Web Share API (only real on devices) with a stand-in that
 * records what was shared. Must run before the page loads.
 * @param {import('@playwright/test').Page} page
 * @param {{ outcome?: 'shared' | 'cancelled' | 'failed' } | null} options null: no Web Share at all
 */
async function fakeShare(page, options) {
  await page.addInitScript((options) => {
    const nav = /** @type {any} */ (navigator);
    if (!options) {
      Object.defineProperty(nav, 'canShare', { value: undefined });
      Object.defineProperty(nav, 'share', { value: undefined });
      return;
    }
    /** @type {any} */ (window).shared = [];
    Object.defineProperty(nav, 'canShare', { value: () => true });
    Object.defineProperty(nav, 'share', {
      value: async (/** @type {ShareData} */ data) => {
        /** @type {any} */ (window).shared.push({ title: data.title, text: data.text });
        if (options.outcome === 'cancelled') throw new DOMException('Share canceled', 'AbortError');
        if (options.outcome === 'failed') throw new DOMException('Not allowed', 'NotAllowedError');
      },
    });
  }, options);
}

/** @param {import('@playwright/test').Page} page */
const shared = (page) => page.evaluate(() => /** @type {any} */ (window).shared);

test.describe('export', () => {
  test('shows a transfer code that carries everything to another device', async ({ page, newDevice }) => {
    await skipWelcome(page);
    await row(page, 'Pale chub').getByRole('button', { name: 'Caught it' }).click();
    await hemisphereSelect(page).selectOption('south');
    const before = await stored(page);
    await openExport(page);
    const code = await shownCode(page);
    expect(code).toMatch(new RegExp(`^${CODE.source}$`));

    const other = await newDevice();
    await importData(other, code);
    await expect(hemisphereSelect(other)).toHaveValue('south');
    expect(await stored(other)).toEqual(before);
  });

  test('Copy code puts the code on the clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await skipWelcome(page);
    await openExport(page);
    await dialog(page).getByRole('button', { name: 'Copy code' }).click();
    await expect(dialog(page).getByRole('button', { name: 'Copied!' })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await shownCode(page));
  });

  test('Send by email opens a mail with instructions and the code', async ({ page }) => {
    await skipWelcome(page);
    await openExport(page);
    const code = await shownCode(page);
    const href = await dialog(page).getByRole('link', { name: 'Send by email' }).getAttribute('href');
    const mail = new URL(href ?? '');
    expect(mail.protocol).toBe('mailto:');
    expect(mail.searchParams.get('subject')).toBe('My ACNH Critters data');
    expect(mail.searchParams.get('body')).toBe(
      `To import my ACNH Critters progress on another device, open the app, choose "Import data" and paste this code:\r\n\r\n${code}`,
    );
  });

  test('Download saves the code as a text file that imports again', async ({ page, newDevice }) => {
    await skipWelcome(page);
    await row(page, 'Pale chub').getByRole('button', { name: 'Caught it' }).click();
    await openExport(page);
    const [download] = await Promise.all([page.waitForEvent('download'), dialog(page).getByRole('button', { name: 'Download as text file' }).click()]);
    expect(download.suggestedFilename()).toBe('acnh-critters-2026-10-15.txt');
    const contents = await readFile(await download.path(), 'utf8');
    expect(contents).toContain(await shownCode(page));

    const other = await newDevice();
    await other.getByRole('button', { name: 'Import data from another device' }).click();
    const [chooser] = await Promise.all([other.waitForEvent('filechooser'), dialog(other).getByRole('button', { name: 'Open a downloaded file instead' }).click()]);
    await chooser.setFiles({ name: download.suggestedFilename(), mimeType: 'text/plain', buffer: Buffer.from(contents) });
    await expect(other.getByRole('tab', { name: 'All', exact: true })).toBeVisible();
    expect((await stored(other)).caught).toEqual(['pale-chub']);
  });

  test.describe('in German', () => {
    test.use({ locale: 'de-DE' });

    test('the email is in German', async ({ page }) => {
      await skipWelcome(page, 'Nein danke, zeig mir einfach die Liste');
      await openExport(page, 'Menü', 'Daten exportieren');
      const href = await dialog(page).getByRole('link', { name: 'Per E-Mail senden' }).getAttribute('href');
      const body = new URL(href ?? '').searchParams.get('body') ?? '';
      expect(body).toMatch(/^Um meinen ACNH-Critters-Fortschritt .* wähle „Daten importieren“ und füge diesen Code ein:\r\n\r\nACNH1-/);
    });
  });
});

test.describe('share menu', () => {
  test('is offered only where the browser has one', async ({ page }) => {
    await fakeShare(page, null);
    await skipWelcome(page);
    await openExport(page);
    await expect(dialog(page).locator('.grid > button, .grid > a')).toHaveText(['Copy code', 'Send by email', 'Download as text file']);
  });

  test('shares the instructions and the code as text', async ({ page }) => {
    await fakeShare(page, {});
    await skipWelcome(page);
    await openExport(page);
    await dialog(page).getByRole('button', { name: 'Share', exact: true }).click();
    await expect.poll(() => shared(page)).toHaveLength(1);
    const [{ title, text }] = await shared(page);
    expect(title).toBe('My ACNH Critters data');
    expect(text).toContain('choose "Import data"');
    expect(text.match(CODE)?.[0]).toBe(await shownCode(page));
  });

  test('closing it without sharing shows no error', async ({ page }) => {
    await fakeShare(page, { outcome: 'cancelled' });
    await skipWelcome(page);
    await openExport(page);
    await dialog(page).getByRole('button', { name: 'Share', exact: true }).click();
    await expect.poll(() => shared(page)).toHaveLength(1);
    await expect(dialog(page).getByRole('alert')).toHaveCount(0);
  });

  test('a failed share suggests copying instead', async ({ page }) => {
    await fakeShare(page, { outcome: 'failed' });
    await skipWelcome(page);
    await openExport(page);
    await dialog(page).getByRole('button', { name: 'Share', exact: true }).click();
    await expect(dialog(page).getByRole('alert')).toHaveText("Sharing didn't work. Try copying the code instead.");
  });

  test.describe('on Apple devices', () => {
    test.use({ userAgent: IPHONE });

    test('mentions AirDrop and Mail', async ({ page }) => {
      await fakeShare(page, {});
      await skipWelcome(page);
      await openExport(page);
      await expect(dialog(page).getByRole('button', { name: 'AirDrop, Mail & more' })).toBeVisible();
    });
  });
});

test.describe('name', () => {
  test('is at most 20 characters, goes into the code and the email subject', async ({ page }) => {
    await skipWelcome(page);
    await openExport(page);
    const withoutName = await shownCode(page);
    const field = dialog(page).getByLabel('Name (optional)');
    // Typed like a user would, so the input's maxlength applies.
    await field.pressSequentially('Antje’s island of many critters');
    await expect(field).toHaveValue('Antje’s island of ma');
    await expect.poll(() => shownCode(page)).not.toBe(withoutName);
    const href = await dialog(page).getByRole('link', { name: 'Send by email' }).getAttribute('href');
    expect(new URL(href ?? '').searchParams.get('subject')).toBe('ACNH Critters data: Antje’s island of ma');
  });

  test('is shown at the bottom of the menu after exporting', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await skipWelcome(page);
    await page.getByRole('button', { name: 'Menu' }).click();
    await expect(menuName(page)).toHaveCount(0);
    await page.getByRole('button', { name: 'Export data' }).click();
    await dialog(page).getByLabel('Name (optional)').fill('  Antje  ');
    await dialog(page).getByRole('button', { name: 'Copy code' }).click();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Menu' }).click();
    await expect(menuName(page)).toHaveText('Antje');
    expect((await stored(page)).settings.name).toBe('Antje');
    // It's offered again next time.
    await page.getByRole('button', { name: 'Export data' }).click();
    await expect(dialog(page).getByLabel('Name (optional)')).toHaveValue('Antje');
  });

  test('is not saved when closing the dialog without exporting', async ({ page }) => {
    await skipWelcome(page);
    await openExport(page);
    await dialog(page).getByLabel('Name (optional)').fill('Antje');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Menu' }).click();
    await expect(menuName(page)).toHaveCount(0);
  });

  test('comes along when importing', async ({ page, newDevice }) => {
    await skipWelcome(page);
    await openExport(page);
    await dialog(page).getByLabel('Name (optional)').fill('Antje');
    const code = await shownCode(page);

    const other = await newDevice();
    await importData(other, code);
    await other.getByRole('button', { name: 'Menu' }).click();
    await expect(menuName(other)).toHaveText('Antje');
  });
});

test.describe('import from the menu', () => {
  test('replaces the progress on this device, after a warning', async ({ page, newDevice }) => {
    const source = await newDevice();
    await source.getByRole('button', { name: 'No thanks, just show me the list' }).click();
    await row(source, 'Koi').getByRole('button', { name: 'Caught it' }).click();
    await openExport(source);
    const code = await shownCode(source);

    await skipWelcome(page);
    await row(page, 'Pale chub').getByRole('button', { name: 'Caught it' }).click();
    await openImport(page);
    await expect(dialog(page).getByText('This replaces the progress on this device.')).toBeVisible();
    const replace = dialog(page).getByRole('button', { name: 'Replace my progress' });
    await expect(replace).toBeDisabled();
    await dialog(page).getByLabel('Transfer code').fill(`Here you go:\n${code}\nCheers`);
    await replace.click();

    await expect(dialog(page)).toHaveCount(0);
    expect((await stored(page)).caught).toEqual(['koi']);
    await expect(row(page, 'Koi')).toHaveCount(0); // caught, so hidden
    await expect(row(page, 'Pale chub')).toHaveCount(1);
  });

  test('a bad code keeps the current progress; Escape closes without changes', async ({ page }) => {
    await skipWelcome(page);
    await row(page, 'Pale chub').getByRole('button', { name: 'Caught it' }).click();
    await openImport(page);
    await dialog(page).getByLabel('Transfer code').fill('ACNH1-broken');
    await dialog(page).getByRole('button', { name: 'Replace my progress' }).click();
    await expect(dialog(page).getByRole('alert')).toHaveText("That's not an ACNH Critters transfer code.");

    await page.keyboard.press('Escape');
    await expect(dialog(page)).toHaveCount(0);
    expect((await stored(page)).caught).toEqual(['pale-chub']);
    await expect(page.getByRole('button', { name: 'Menu' })).toBeFocused();
  });

  test('the welcome screen’s import has no warning', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Import data from another device' }).click();
    await expect(dialog(page).getByText('This replaces the progress on this device.')).toHaveCount(0);
    await expect(dialog(page).getByRole('button', { name: 'Import', exact: true })).toBeDisabled();
  });
});
