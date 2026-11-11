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
  // A bronze medal with the category's symbol and the month's number.
  await expect(party.locator('[data-medal="bronze"] [data-symbol]')).toHaveCount(1);
  await expect(party.locator('[data-medal="bronze"] [data-month]')).toHaveText('10');
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
  const yay = party.getByRole('button', { name: 'Yay!' });
  await expect(yay).toBeFocused();
  // Further downs without an up are key repeats.
  await page.keyboard.down('Enter');
  await page.keyboard.down('Enter');
  await page.keyboard.up('Enter');
  await expect(party).toBeVisible();

  // A fresh press counts once the party has had its moment on screen.
  await expect(yay).toBeEnabled();
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

/**
 * Says Yay to the parties before the last one, which is left open.
 * @param {import('@playwright/test').Page} page
 * @param {string[]} titles
 */
async function partiesUpTo(page, titles) {
  for (const title of titles.slice(0, -1)) {
    await page.getByRole('dialog', { name: title }).getByRole('button', { name: 'Yay!' }).click();
  }
  return page.getByRole('dialog', { name: titles[titles.length - 1] });
}

// The last critter of all: every milestone it finishes, building up.
const FINALE = ['All the insects of October!', 'All the critters of October!', 'All 80 insects!', 'All 200 critters!'];

test('the last insect of a month whose other critters are caught: first its party, then the whole month’s', async ({ page }) => {
  await startWith(page, available('all').filter((c) => c.id !== lastBug.id));
  await catchLastBug(page);
  const month = await partiesUpTo(page, ['All the insects of October!', 'All the critters of October!']);
  // Each with its own medal and confetti.
  await expect(month.locator('[data-medal="bronze"] [data-symbol]')).toHaveCount(3);
  await expect(confetti(page).first().locator('span')).toHaveCount(70);
  await month.getByRole('button', { name: 'Yay!' }).click();
  await expect(dialog(page)).toHaveCount(0);
});

test('a double tap on Yay doesn’t skip the next party', async ({ page }) => {
  await startWith(page, available('all').filter((c) => c.id !== lastBug.id));
  await catchLastBug(page);
  await expect(page.getByRole('dialog', { name: 'All the insects of October!' }).getByRole('button', { name: 'Yay!' })).toBeEnabled();
  // Both taps in the page, so the second surely lands in the next party's first half second.
  await page.evaluate(async () => {
    const shown = () => document.querySelector('dialog[open]');
    shown()?.querySelector('button')?.click();
    while (!shown()) await new Promise(requestAnimationFrame);
    shown()?.querySelector('button')?.click();
  });
  await expect(page.getByRole('dialog', { name: 'All the critters of October!' })).toBeVisible();
});

test('every milestone the very last critter finishes gets its party, up to the rainbow medal', async ({ page }) => {
  await oneCritterToGo(page);
  await expect(page.getByTestId('golden-frame')).toHaveCount(0);
  await catchLastBug(page);
  const party = await partiesUpTo(page, FINALE);
  // The rainbow medal, with one category's symbol each.
  await expect(party.locator('[data-medal="rainbow"] [data-symbol]')).toHaveCount(3);
  await expect(confetti(page).first().locator('span')).toHaveCount(170);
  await expect(confetti(page)).toHaveCount(3);
  // Its gloss and sparkles.
  expect(await party.locator('[data-medal]').evaluate((medal) => medal.getAnimations({ subtree: true }).length)).toBeGreaterThan(0);
  await party.getByRole('button', { name: 'Yay!' }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.getByTestId('golden-frame')).toBeVisible();
});

test('while all 200 are caught, the app has a golden frame and the rainbow medal by its title', async ({ page }) => {
  // Imported, so the medal is earned without a party.
  await startWith(page, critters);
  const frame = page.getByTestId('golden-frame');
  const medal = page.getByRole('img', { name: 'All 200 critters!' });
  await expect(frame).toBeVisible();
  await expect(medal).toBeVisible();
  const title = await page.getByRole('heading', { name: 'ACNH Critters' }).boundingBox();
  const beside = await medal.boundingBox();
  if (!title || !beside) throw new Error('title not shown');
  expect(beside.x).toBeGreaterThan(title.x + title.width);
  // Big, so it's seen.
  expect(beside.height).toBeGreaterThan(title.height * 1.5);

  // Taps go through the frame; taking a catch back takes both away, though the trophy stays.
  await setShowCaught(page, true);
  await row(page, 'Pale chub').getByRole('button').click();
  await expect(page.getByTestId('caught-total')).toHaveText('199 of 200 caught');
  await expect(frame).toHaveCount(0);
  await expect(medal).toHaveCount(0);
  expect((await stored(page)).trophies).toContainEqual({ kind: 'full', scope: 'all', date: '2026-10-15' });

  // Caught again: its parties again, and both back.
  await row(page, 'Pale chub').getByRole('button').click();
  const party = await partiesUpTo(page, ['All 80 fish!', 'All 200 critters!']);
  await party.getByRole('button', { name: 'Yay!' }).click();
  await expect(frame).toBeVisible();
  await expect(medal).toBeVisible();
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the rainbow medal holds still, and there is no confetti', async ({ page }) => {
    await oneCritterToGo(page);
    await catchLastBug(page);
    const medal = (await partiesUpTo(page, FINALE)).locator('[data-medal="rainbow"]');
    await expect(medal).toBeVisible();
    expect(await medal.evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(0);
    await expect(page.locator('[data-confetti]')).toHaveCount(0);
  });
});

test('milestones reached before, e.g. brought by an import, earn their trophies without a party', async ({ page }) => {
  await oneCritterToGo(page);
  await expect(dialog(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.getByRole('button', { name: 'Trophies' })).toHaveAccessibleName(/^Trophies\s*New\s*8$/);
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
  const medals = await dialog(page).locator('[data-medal]').evaluateAll((all) => all.map((medal) => medal.getAttribute('data-medal')));
  expect(medals).toEqual(['gold', 'gold', 'silver', 'silver', 'silver', 'silver', 'bronze', 'bronze']);
});

test('the trophy case starts empty, and each party leaves its trophy there', async ({ page }) => {
  await oneBugToGo(page);
  await openMenuItem(page, 'Trophies');
  await expect(page.getByRole('dialog', { name: 'Trophies' })).toContainText('No trophies yet. Every party leaves one here.');
  await page.keyboard.press('Escape');

  await catchLastBug(page);
  await page.getByRole('button', { name: 'Yay!' }).click();
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.getByRole('button', { name: 'Trophies' })).toHaveAccessibleName(/^Trophies\s*New\s*1$/);
  await page.getByRole('button', { name: 'Trophies' }).click();
  await expect(dialog(page).getByRole('listitem')).toHaveText(
    ['All the insects of October! Caught all there were in October 2026. Earned on October 15, 2026'],
    { useInnerText: true },
  );
});

test('new trophies, also ones earned quietly, have a dot until the trophy case has shown them', async ({ page }) => {
  // Half the fish come with the import, so that trophy is earned without a party.
  await startWith(page, [...critters.filter((c) => c.type === 'fish').slice(0, 40), ...bugs.slice(0, -1)]);
  const menu = page.getByRole('button', { name: 'Menu' });
  await expect(menu.locator('[data-new-dot]')).toBeVisible();
  await expect(menu).toHaveAccessibleDescription('new trophies');
  await catchLastBug(page);
  await page.getByRole('button', { name: 'Yay!' }).click();

  await menu.click();
  const item = page.getByRole('button', { name: 'Trophies' });
  await expect(item.locator('[data-new-dot]')).toBeVisible();
  await item.click();
  const trophies = page.getByRole('dialog', { name: 'Trophies' });
  await expect(trophies.getByRole('img', { name: 'New' })).toHaveCount(2);
  // Seen once shown, though their dots stay until the case is closed.
  expect((await stored(page)).trophies.map((/** @type {{ seen?: boolean }} */ trophy) => trophy.seen)).toEqual([true, true]);
  await page.keyboard.press('Escape');

  await expect(menu.locator('[data-new-dot]')).toHaveCount(0);
  await expect(menu).toHaveAccessibleDescription('');
  await openMenuItem(page, 'Trophies');
  await expect(trophies.getByRole('listitem')).toHaveCount(2);
  await expect(trophies.getByRole('img', { name: 'New' })).toHaveCount(0);
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
