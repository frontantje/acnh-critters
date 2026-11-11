import { available, critters, dialog, expect, importData, openMenuItem, row, setShowCaught, stored, test } from './support.js';

// October has 34 of the 80 insects, so catching all of them is only the month's party, not half of them.
const bugs = available('bug');
const lastBug = bugs[bugs.length - 1];
const sea = critters.filter((c) => c.type === 'sea');

/**
 * Starts with these critters caught, as if they came from another device.
 * @param {import('@playwright/test').Page} page
 * @param {{ id: string }[]} caught
 */
async function startWith(page, caught, opener = 'Import data from another device') {
  await page.goto('/');
  await importData(page, { version: 1, settings: { name: 'Kim' }, caught: caught.map((c) => c.id) }, opener);
  await expect(page.getByRole('tab').first()).toBeVisible();
}
/**
 * @param {import('@playwright/test').Page} page
 * @param {string} [opener]
 */
const oneBugToGo = (page, opener) => startWith(page, bugs.slice(0, -1), opener);
/** @param {import('@playwright/test').Page} page */
const oneCritterToGo = (page) => startWith(page, critters.filter((c) => c.id !== lastBug.id));

/** @param {import('@playwright/test').Page} page */
const catchLastBug = (page, label = 'Caught it') => row(page, lastBug.name.en).getByRole('button', { name: label }).click();
/** @param {import('@playwright/test').Page} page */
const confetti = (page) => dialog(page).locator('[data-confetti]');

test('catching the last of the month’s insects from the list throws a party and earns a trophy', async ({ page }) => {
  await oneBugToGo(page);
  // Caught before, so the import itself doesn't celebrate.
  await expect(dialog(page)).toHaveCount(0);

  await catchLastBug(page);
  const party = page.getByRole('dialog', { name: 'All the insects of October!' });
  await expect(party).toBeVisible();
  expect(await party.evaluate((d) => d.matches(':modal'))).toBe(true);
  expect(await party.locator('img').count()).toBe(1);
  // The smallest kind of party: one burst.
  await expect(confetti(page)).toHaveCount(1);
  await expect(confetti(page).locator('span')).toHaveCount(45);
  // The list's own burst would only play dimmed behind it.
  await expect(page.locator('body > [data-confetti]')).toHaveCount(0);

  await party.getByRole('button', { name: 'Yay!' }).click();
  await expect(dialog(page)).toHaveCount(0);
  expect((await stored(page)).trophies).toEqual([{ kind: 'month', scope: 'bug', year: 2026, month: 10, date: '2026-10-15' }]);
});

test('a catch that reaches nothing new has no party', async ({ page }) => {
  await oneBugToGo(page);
  await row(page, 'Pale chub').getByRole('button', { name: 'Caught it' }).click();
  await expect(row(page, 'Pale chub')).toHaveCount(0);
  await expect(dialog(page)).toHaveCount(0);
  expect(await stored(page)).not.toHaveProperty('trophies');
});

test.describe('in the Critterpedia Sync', () => {
  // Its animations ignore quick input while playing.
  test.use({ reducedMotion: 'reduce' });

  test('catches there were made long before, so they earn their trophy without a party', async ({ page }) => {
    await startWith(page, available('sea').filter((c) => c.id !== sea[0].id));
    await openMenuItem(page, 'Critterpedia Sync');
    await dialog(page).getByRole('button', { name: /Sea creatures/ }).click();
    await dialog(page).getByRole('button', { name: 'Caught', exact: true }).click();
    await dialog(page).getByRole('button', { name: 'Exit Critterpedia Sync' }).click();

    await expect(dialog(page)).toHaveCount(0);
    const saved = await stored(page);
    expect(saved.caught).toContain(sea[0].id);
    // Half of them came with the import; the sync finished October's.
    expect(saved.trophies).toEqual([
      { kind: 'half', scope: 'sea', date: '2026-10-15' },
      { kind: 'month', scope: 'sea', year: 2026, month: 10, date: '2026-10-15' },
    ]);
  });
});

test('a held Enter that caught the critter doesn’t close the party right away', async ({ page }) => {
  await oneBugToGo(page);
  await row(page, lastBug.name.en).getByRole('button', { name: 'Caught it' }).focus();
  await page.keyboard.down('Enter');
  const party = page.getByRole('dialog', { name: 'All the insects of October!' });
  await expect(party.getByRole('button', { name: 'Yay!' })).toBeFocused();
  // Further downs without an up are key repeats.
  await page.keyboard.down('Enter');
  await page.keyboard.down('Enter');
  await page.keyboard.up('Enter');
  await expect(party).toBeVisible();

  await page.keyboard.press('Enter');
  await expect(party).toHaveCount(0);
});

test('a held Enter on its menu item doesn’t close the trophy case right away', async ({ page }) => {
  await oneBugToGo(page);
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Trophies' }).focus();
  await page.keyboard.down('Enter');
  const trophies = page.getByRole('dialog', { name: 'Trophies' });
  await expect(trophies.getByRole('button')).toBeFocused();
  await page.keyboard.down('Enter');
  await page.keyboard.up('Enter');
  await expect(trophies).toBeVisible();
});

test('after taking the catch back, catching it again throws the party again, but keeps one trophy', async ({ page }) => {
  await oneBugToGo(page);
  await catchLastBug(page);
  await page.getByRole('button', { name: 'Yay!' }).click();

  await setShowCaught(page, true);
  await catchLastBug(page, 'Caught');
  await expect(dialog(page)).toHaveCount(0);
  await catchLastBug(page);
  await expect(page.getByRole('dialog', { name: 'All the insects of October!' })).toBeVisible();
  await page.getByRole('button', { name: 'Yay!' }).click();
  expect((await stored(page)).trophies).toHaveLength(1);
});

test('the biggest of several reached at once shows, with the most confetti', async ({ page }) => {
  await oneCritterToGo(page);
  await catchLastBug(page);
  const party = page.getByRole('dialog', { name: 'All 200 critters!' });
  await expect(party).toBeVisible();
  // One of each category's critters, for all of them.
  expect(await party.locator('img').count()).toBe(3);
  await expect(confetti(page).first().locator('span')).toHaveCount(145);
  await expect(confetti(page)).toHaveCount(3);
});

test('milestones reached before, e.g. brought by an import, earn their trophies without a party', async ({ page }) => {
  await oneCritterToGo(page);
  await expect(dialog(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.getByRole('button', { name: 'Trophies' })).toHaveAccessibleName(/^Trophies\s*8$/);
  await page.getByRole('button', { name: 'Trophies' }).click();
  await expect(dialog(page).locator('li p:first-child')).toHaveText([
    'All 40 sea creatures!',
    'All 80 fish!',
    'Half of all critters!',
    'Half of all sea creatures!',
    'Half of all insects!',
    'Half of all fish!',
    'All the sea creatures of October!',
    'All the fish of October!',
  ]);
});

test('the trophy case starts empty, and each party leaves its trophy there', async ({ page }) => {
  await oneBugToGo(page);
  await openMenuItem(page, 'Trophies');
  await expect(page.getByRole('dialog', { name: 'Trophies' })).toContainText('No trophies yet. Every party leaves one here.');
  await page.keyboard.press('Escape');

  await catchLastBug(page);
  await page.getByRole('button', { name: 'Yay!' }).click();
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.getByRole('button', { name: 'Trophies' })).toHaveAccessibleName(/^Trophies\s*1$/);
  await page.getByRole('button', { name: 'Trophies' }).click();
  await expect(dialog(page).getByRole('listitem')).toHaveText(
    ['All the insects of October! Caught all there were in October 2026. Earned on October 15, 2026'],
    { useInnerText: true },
  );
});

test.describe('in German', () => {
  test.use({ locale: 'de-DE' });

  test('the party says Juhu, and so does the trophy', async ({ page }) => {
    await oneBugToGo(page, 'Daten von einem anderen Gerät importieren');
    await row(page, lastBug.name.de).getByRole('button', { name: 'Hab ich!' }).click();
    await page.getByRole('dialog', { name: 'Alle Insekten im Oktober!' }).getByRole('button', { name: 'Juhu!' }).click();

    await openMenuItem(page, 'Trophäen', 'Menü');
    await expect(dialog(page).getByRole('listitem')).toHaveText(
      ['Alle Insekten im Oktober! Alle gefangen, die es im Oktober 2026 gab. Erhalten am 15. Oktober 2026'],
      { useInnerText: true },
    );
  });
});
