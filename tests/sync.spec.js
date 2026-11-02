import { critters, expect, importData, monthSelect, normalize, row, rows, skipWelcome, startApp, stored, test } from './support.js';

// Animations ignore quick repeated input while playing, so they're off here.
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
    await dialog(page).getByRole('button', { name: i % 2 === 0 ? 'Caught' : 'Not caught', exact: true }).click();
  }

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

  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Export data' }).click();
  const code = normalize((await page.getByRole('dialog').locator('output').textContent()) ?? '');
  const other = await newDevice();
  await importData(other, code);
  await openFromMenu(other);
  await expect(categories(other).first()).toHaveText('Fish 80 of 80 caught ✓ Synced');
});

test.describe('going back', () => {
  /** @param {import('@playwright/test').Page} page */
  const backButton = (page) => dialog(page).locator('[data-action="back"]');
  /** @param {import('@playwright/test').Page} page */
  const caughtButton = (page) => dialog(page).getByRole('button', { name: 'Caught', exact: true });
  /** @param {import('@playwright/test').Page} page */
  const nextButton = (page) => dialog(page).getByRole('button', { name: 'Not caught', exact: true });
  /** @param {import('@playwright/test').Page} page */
  const badge = (page) => dialog(page).locator('[data-verdict]');

  /** @param {import('@playwright/test').Page} page */
  async function startSeaCreatures(page) {
    await startApp(page);
    await page.getByRole('button', { name: 'Start Critterpedia Sync' }).click();
    await dialog(page).getByRole('button', { name: /Sea creatures/ }).click();
  }

  test('shows each critter with its ✓ or ✗, which can then be changed', async ({ page }) => {
    await startSeaCreatures(page);
    // Hidden, not removed, so the buttons above it don't move when it shows up.
    await expect(backButton(page)).toBeHidden();
    await expect(badge(page)).toHaveCount(0);
    await caughtButton(page).click();
    await nextButton(page).click();
    await expect(progressLine(page)).toHaveText('Sea creatures · 3 of 40');

    await dialog(page).getByRole('button', { name: `Back to ${sea[1].name.en}` }).click();
    await expect(progressLine(page)).toHaveText('Sea creatures · 2 of 40');
    await expect(currentName(page)).toHaveText(sea[1].name.en);
    await expect(badge(page)).toHaveAttribute('data-verdict', 'not-caught');
    await expect(badge(page)).toContainText('Not caught');
    // Going back changes nothing yet.
    expect((await stored(page)).caught).toEqual([sea[0].id]);
    // Still on Back, so pressing it again doesn't catch.
    await expect(dialog(page).getByRole('button', { name: `Back to ${sea[0].name.en}` })).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(progressLine(page)).toHaveText('Sea creatures · 1 of 40');
    await expect(badge(page)).toHaveAttribute('data-verdict', 'caught');
    await expect(backButton(page)).toBeHidden();
    await expect(caughtButton(page)).toBeFocused();

    // Changed to not caught, then on to where it left off.
    await nextButton(page).click();
    await expect(progressLine(page)).toHaveText('Sea creatures · 3 of 40');
    await expect(badge(page)).toHaveCount(0);
    expect((await stored(page)).caught).toEqual([]);
  });

  test('after changing one further back, it continues where it left off', async ({ page }) => {
    await startSeaCreatures(page);
    for (let i = 0; i < 3; i++) await caughtButton(page).click();
    await expect(progressLine(page)).toHaveText('Sea creatures · 4 of 40');
    for (let i = 0; i < 3; i++) await backButton(page).click();
    await expect(progressLine(page)).toHaveText('Sea creatures · 1 of 40');

    await nextButton(page).click();
    // Not on to the second one, which Next would otherwise un-catch.
    await expect(progressLine(page)).toHaveText('Sea creatures · 4 of 40');
    expect((await stored(page)).caught).toEqual([sea[1].id, sea[2].id]);
  });

  test('← goes back as well', async ({ page }) => {
    await startSeaCreatures(page);
    await page.keyboard.press('ArrowRight');
    await expect(progressLine(page)).toHaveText('Sea creatures · 2 of 40');
    await expect(backButton(page)).toHaveAttribute('aria-keyshortcuts', 'ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(progressLine(page)).toHaveText('Sea creatures · 1 of 40');
    await expect(badge(page)).toHaveAttribute('data-verdict', 'not-caught');

    await page.keyboard.press('Enter');
    await expect(progressLine(page)).toHaveText('Sea creatures · 2 of 40');
    expect((await stored(page)).caught).toEqual([sea[0].id]);
  });

  test('right after a category is finished, leads back to its last critter', async ({ page }) => {
    await page.goto('/');
    await importData(page, { version: 1, caught: sea.slice(1).map((c) => c.id) });
    await openFromMenu(page);
    await categories(page).nth(2).click();
    await caughtButton(page).click();
    await expect(categories(page).nth(2)).toHaveText('Sea creatures 40 of 40 caught ✓ Synced');

    await dialog(page).getByRole('button', { name: `Back to ${sea[0].name.en}` }).click();
    await expect(progressLine(page)).toHaveText('Sea creatures · 1 of 1');
    await expect(badge(page)).toHaveAttribute('data-verdict', 'caught');
    await expect(caughtButton(page)).toBeFocused();
    expect((await stored(page)).synced).toEqual(['sea']);

    await nextButton(page).click();
    await expect(categories(page).nth(2)).toHaveText('Sea creatures 39 of 40 caught ✓ Synced');
    expect((await stored(page)).caught).not.toContain(sea[0].id);
  });

  test('is gone once another category is started', async ({ page }) => {
    await page.goto('/');
    await importData(page, { version: 1, caught: sea.slice(1).map((c) => c.id) });
    await openFromMenu(page);
    await categories(page).nth(2).click();
    await caughtButton(page).click();
    await categories(page).first().click();
    await expect(backButton(page)).toBeHidden();
  });
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
    await expect(dialog(page).getByRole('button', { name: 'Hab ich', exact: true })).toBeVisible();
    await expect(dialog(page).getByRole('button', { name: 'Hab ich nicht', exact: true })).toBeVisible();
    await expect(dialog(page).getByRole('button', { name: 'Faunapädie-Abgleich beenden' })).toBeVisible();
  });

  test('opens from the German menu', async ({ page }) => {
    await skipWelcome(page, 'Nein danke, zeig mir einfach die Liste');
    await openFromMenu(page, 'Menü', 'Faunapädie-Abgleich');
  });
});
