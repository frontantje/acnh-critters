import { critters, expect, importData, monthSelect, normalize, row, rows, skipWelcome, startApp, stored, test } from './support.js';

// The sync's logic, with its animations off (they ignore quick repeated input
// while playing). The animations themselves are tested in effects.spec.js.
test.use({ reducedMotion: 'reduce' });

const sea = critters.filter((c) => c.type === 'sea');
const fishIds = critters.filter((c) => c.type === 'fish').map((c) => c.id);

/** @param {import('@playwright/test').Page} page */
const dialog = (page) => page.getByRole('dialog');
/** @param {import('@playwright/test').Page} page */
const categories = (page) => dialog(page).locator('ul button');
/** @param {import('@playwright/test').Page} page */
const progressLine = (page) => dialog(page).locator('p.text-center');
/** @param {import('@playwright/test').Page} page */
const currentName = (page) => dialog(page).locator('[aria-live] p');

/** @param {import('@playwright/test').Page} page */
async function openFromMenu(page, menu = 'Menu', item = 'Critterpedia Sync') {
  await page.getByRole('button', { name: menu }).click();
  await page.getByRole('button', { name: item }).click();
  await expect(dialog(page)).toBeVisible();
}

test('starts from the welcome screen as a modal dialog', async ({ page }) => {
  await startApp(page);
  await page.getByRole('button', { name: 'Start Critterpedia Sync' }).click();

  await expect(page.getByRole('dialog', { name: 'Critterpedia Sync' })).toBeVisible();
  expect(await dialog(page).evaluate((d) => d.matches(':modal') && d.contains(document.activeElement))).toBe(true);
  await expect(categories(page)).toHaveText(['Fish 0 of 80 caught', 'Insects 0 of 80 caught', 'Sea creatures 0 of 40 caught']);
  // Choosing the sync counts as leaving the welcome screen.
  expect(await stored(page)).not.toBeNull();
});

test('goes through uncaught critters in Critterpedia order; Caught saves, Next skips', async ({ page }) => {
  await startApp(page);
  await page.getByRole('button', { name: 'Start Critterpedia Sync' }).click();
  await dialog(page).getByRole('button', { name: /Sea creatures/ }).click();
  await expect(progressLine(page)).toHaveText('Sea creatures · 1 of 40');
  await expect(dialog(page).locator('[aria-live] img')).toHaveAttribute('src', sea[0].icon);

  for (const [i, critter] of sea.entries()) {
    await expect(currentName(page)).toHaveText(critter.name.en);
    await dialog(page).getByRole('button', { name: i % 2 === 0 ? 'Caught' : 'Next', exact: true }).click();
  }

  // Back at the categories, with a checkmark on the finished one.
  await expect(categories(page)).toHaveText([
    'Fish 0 of 80 caught',
    'Insects 0 of 80 caught',
    'Sea creatures 20 of 40 caught ✓ Synced',
  ]);
  const saved = await stored(page);
  expect([...saved.caught].sort()).toEqual(sea.filter((_, i) => i % 2 === 0).map((c) => c.id).sort());
  expect(saved.synced).toEqual(['sea']);
});

test('re-running a synced category shows only critters that are still uncaught', async ({ page }) => {
  await page.goto('/');
  await importData(page, { version: 1, caught: sea.filter((_, i) => i % 2 === 0).map((c) => c.id), synced: ['sea'] });
  await openFromMenu(page);
  await expect(categories(page).nth(2)).toHaveText('Sea creatures 20 of 40 caught ✓ Synced');

  await categories(page).nth(2).click();
  await expect(progressLine(page)).toHaveText('Sea creatures · 1 of 20');
  await expect(currentName(page)).toHaveText(sea[1].name.en);
});

test('exiting keeps what was caught so far, without a checkmark', async ({ page }) => {
  await startApp(page);
  await page.getByRole('button', { name: 'Start Critterpedia Sync' }).click();
  await dialog(page).getByRole('button', { name: /Sea creatures/ }).click();
  await dialog(page).getByRole('button', { name: 'Caught', exact: true }).click();
  await dialog(page).getByRole('button', { name: 'Caught', exact: true }).click();
  await expect(progressLine(page)).toHaveText('Sea creatures · 3 of 40');

  await dialog(page).getByRole('button', { name: 'Exit Critterpedia Sync' }).click();
  await expect(dialog(page)).toHaveCount(0);
  expect(await stored(page)).toMatchObject({ caught: [sea[0].id, sea[1].id], synced: [] });

  // The list hides them like any other catch.
  await page.getByRole('tab', { name: 'Sea creatures', exact: true }).click();
  await monthSelect(page).selectOption({ label: 'All months' });
  await expect(rows(page)).toHaveCount(38);
  await expect(row(page, sea[0].name.en)).toHaveCount(0);
});

test('Escape and Done exit, and the list keeps its tab and filters', async ({ page }) => {
  await skipWelcome(page);
  await page.getByRole('tab', { name: 'Insects', exact: true }).click();
  await monthSelect(page).selectOption({ label: 'All months' });

  await openFromMenu(page);
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Insects', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(monthSelect(page)).toHaveValue('0');
  // Focus returns to the menu button.
  await expect(page.getByRole('button', { name: 'Menu' })).toBeFocused();

  await openFromMenu(page);
  await dialog(page).getByRole('button', { name: 'Done' }).click();
  await expect(dialog(page)).toHaveCount(0);
});

test('a fully caught category is marked synced right away, and checkmarks are kept and exported', async ({ page, newDevice }) => {
  await page.goto('/');
  await importData(page, { version: 1, caught: fishIds });
  await openFromMenu(page);

  await categories(page).first().click();
  await expect(categories(page).first()).toHaveText('Fish 80 of 80 caught ✓ Synced');
  await expect(dialog(page).locator('[aria-live]')).toHaveCount(0);

  await dialog(page).getByRole('button', { name: 'Done' }).click();
  await page.reload();
  await openFromMenu(page);
  await expect(categories(page).first()).toContainText('✓');
  await dialog(page).getByRole('button', { name: 'Done' }).click();

  // The checkmark travels in the transfer code.
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Export data' }).click();
  const code = normalize((await page.getByRole('dialog').locator('output').textContent()) ?? '');
  const other = await newDevice();
  await importData(other, code);
  await openFromMenu(other);
  await expect(categories(other).first()).toHaveText('Fish 80 of 80 caught ✓ Synced');
});

test.describe('in German', () => {
  test.use({ locale: 'de-DE' });

  test('is called Faunapädie-Abgleich', async ({ page }) => {
    await startApp(page);
    await page.getByRole('button', { name: 'Faunapädie-Abgleich starten' }).click();
    await expect(page.getByRole('dialog', { name: 'Faunapädie-Abgleich' })).toBeVisible();
    await expect(categories(page)).toHaveText(['Fische 0 von 80 gefangen', 'Insekten 0 von 80 gefangen', 'Meerestiere 0 von 40 gefangen']);

    await categories(page).first().click();
    await expect(progressLine(page)).toHaveText('Fische · 1 von 80');
    await expect(currentName(page)).toHaveText(critters[0].name.de);
    await expect(dialog(page).getByRole('button', { name: 'Gefangen', exact: true })).toBeVisible();
    await expect(dialog(page).getByRole('button', { name: 'Weiter', exact: true })).toBeVisible();
    await expect(dialog(page).getByRole('button', { name: 'Faunapädie-Abgleich beenden' })).toBeVisible();
  });

  test('opens from the German menu', async ({ page }) => {
    await skipWelcome(page, 'Nein danke, zeig mir einfach die Liste');
    await openFromMenu(page, 'Menü', 'Faunapädie-Abgleich');
  });
});
