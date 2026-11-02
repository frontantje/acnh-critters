import { available, critters, expect, hemisphereSelect, list, monthSelect, row, rowNames, rows, setShowCaught, skipWelcome, test } from './support.js';

const LAST_CHANCE = 'Last chance';

/**
 * @param {any} critter
 * @param {'north' | 'south'} hemisphere
 * @param {number} month
 */
function monthsLeft(critter, hemisphere, month) {
  let count = 0;
  while (count < 12 && critter[hemisphere].some((/** @type {any} */ p) => p.months.includes(((month - 1 + count) % 12) + 1))) count += 1;
  return count;
}

/**
 * @param {any} critter
 * @param {'north' | 'south'} hemisphere
 * @param {number} month
 * @param {number} hour
 */
function timeGroup(critter, hemisphere, month, hour) {
  const hours = critter[hemisphere].find((/** @type {any} */ p) => p.months.includes(month)).hours;
  return hours.length === 24 ? 1 : hours.includes(hour) ? 0 : 2;
}

/**
 * Worked out independently of the app's code, so it can't share its bugs.
 * @param {any[]} list
 * @param {'north' | 'south'} hemisphere
 * @param {number} month
 * @param {number} hour
 */
function expectedOrder(list, hemisphere, month, hour) {
  return list
    .map((c, i) => {
      const left = monthsLeft(c, hemisphere, month);
      const time = timeGroup(c, hemisphere, month, hour);
      return { name: c.name.en, bottom: time === 2 && left > 1 ? 1 : 0, left, time, i };
    })
    .sort((a, b) => a.bottom - b.bottom || a.left - b.left || a.time - b.time || a.i - b.i);
}

/** @param {import('@playwright/test').Page} page */
const shownNames = (page) => rowNames(rows(page));

/** @param {import('@playwright/test').Page} page */
const warnedNames = async (page) =>
  rowNames(list(page).locator('li').filter({ hasText: LAST_CHANCE }));

/**
 * @param {import('@playwright/test').BrowserContext} context
 * @param {string} dateTime
 */
const setNow = (context, dateTime) => context.clock.setFixedTime(new Date(`${dateTime}:00`));

test.describe('sorting', () => {
  test('all months: Critterpedia order', async ({ page }) => {
    await skipWelcome(page);
    await monthSelect(page).selectOption({ label: 'All months' });
    expect(await shownNames(page)).toEqual(critters.map((c) => c.name.en));
  });

  // The tests run at noon (see support.js).
  for (const [hemisphere, month] of /** @type {const} */ ([['north', 10], ['south', 10], ['north', 3]])) {
    test(`${hemisphere}, month ${month}: leaving soon first, others outside their hours at the bottom`, async ({ page }) => {
      await skipWelcome(page);
      await hemisphereSelect(page).selectOption(hemisphere);
      await monthSelect(page).selectOption(String(month));
      const expected = expectedOrder(available('all', hemisphere, month), hemisphere, month, 12);

      expect(await shownNames(page)).toEqual(expected.map((e) => e.name));
      expect(expected[0]).toMatchObject({ bottom: 0, left: 1 });
      expect(expected[expected.length - 1]).toMatchObject({ bottom: 1, left: 12 });
    });
  }

  test('leaving-soon critters outside their hours stay at the end of their group', async ({ page }) => {
    await skipWelcome(page);
    const names = await shownNames(page);
    // Turtle and ladybug leave after October, the carp never; only the turtle is outside its hours.
    expect(names.indexOf('Snapping turtle')).toBeGreaterThan(names.indexOf('Ladybug'));
    expect(names.indexOf('Snapping turtle')).toBeLessThan(names.indexOf('Crucian carp'));
  });

  test('at night, night critters move up within their group', async ({ page, context }) => {
    await setNow(context, '2026-10-15T21:00');
    await skipWelcome(page);
    const names = await shownNames(page);
    expect(names).toEqual(expectedOrder(available('all'), 'north', 10, 21).map((e) => e.name));
    // Both leave after October; at noon the order would be the other way round.
    expect(names.indexOf('Scorpion')).toBeLessThan(names.indexOf('Red dragonfly'));
    // The red dragonfly is outside its hours at 9 PM, but stays with the leaving-soon group.
    expect(names.indexOf('Red dragonfly')).toBeLessThan(names.indexOf('Crucian carp'));
  });

  test('each tab is sorted the same way', async ({ page }) => {
    await skipWelcome(page);
    await page.getByRole('tab', { name: 'Insects', exact: true }).click();
    expect(await shownNames(page)).toEqual(expectedOrder(available('bug'), 'north', 10, 12).map((e) => e.name));
  });
});

test.describe('year-round mark', () => {
  const yearRound = critters.filter((c) => monthsLeft(c, 'north', 1) === 12).map((c) => c.name.en);
  /** @param {import('@playwright/test').Page} page */
  const notedYearRound = async (page) =>
    rowNames(list(page).locator('li').filter({ hasText: 'All year' }));

  test('uncaught critters catchable all year say so, in a month and for all months', async ({ page }) => {
    await skipWelcome(page);
    expect(yearRound.length).toBeGreaterThan(0);
    expect((await notedYearRound(page)).sort()).toEqual([...yearRound].sort());
    await expect(row(page, yearRound[0]).locator('p', { hasText: 'All year' })).toBeVisible();

    await monthSelect(page).selectOption({ label: 'All months' });
    expect(await notedYearRound(page)).toEqual(critters.filter((c) => yearRound.includes(c.name.en)).map((c) => c.name.en));
  });

  test('caught ones stay green instead', async ({ page }) => {
    await skipWelcome(page);
    await setShowCaught(page, true);
    await row(page, yearRound[0]).getByRole('button', { name: 'Caught it' }).click();
    expect(await notedYearRound(page)).not.toContain(yearRound[0]);
  });
});

test.describe('last chance mark', () => {
  /** @param {number} month */
  const leavingAfter = (month) =>
    expectedOrder(available('all', 'north', month), 'north', month, 12)
      .filter((e) => e.left === 1)
      .map((e) => e.name);

  test('uncaught critters gone after the selected month are flagged, on any day', async ({ page }) => {
    // The tests run on 15 October, well before the month's end.
    await skipWelcome(page);
    expect(leavingAfter(10).length).toBeGreaterThan(0);
    expect(await warnedNames(page)).toEqual(leavingAfter(10));
    expect((await shownNames(page)).slice(0, leavingAfter(10).length)).toEqual(leavingAfter(10));
    // In words, not only in colour.
    await expect(row(page, leavingAfter(10)[0]).locator('p', { hasText: LAST_CHANCE })).toBeVisible();
  });

  test('another month flags what leaves after that month; all months flags nothing', async ({ page }) => {
    await skipWelcome(page);
    await monthSelect(page).selectOption({ label: 'November' });
    expect(await warnedNames(page)).toEqual(leavingAfter(11));
    await monthSelect(page).selectOption({ label: 'All months' });
    expect(await warnedNames(page)).toEqual([]);
  });

  test('caught critters are not flagged', async ({ page }) => {
    await skipWelcome(page);
    await setShowCaught(page, true);
    await row(page, leavingAfter(10)[0]).getByRole('button', { name: 'Caught it' }).click();
    expect(await warnedNames(page)).toEqual(leavingAfter(10).slice(1));
  });
});

test.describe('caught mark', () => {
  test('a caught critter says so instead of its other marks; the card turns green', async ({ page }) => {
    await skipWelcome(page);
    await setShowCaught(page, true);
    const leaving = available('all').find((c) => monthsLeft(c, 'north', 10) === 1);
    const card = row(page, leaving.name.en);
    const background = () => card.evaluate((li) => getComputedStyle(li).backgroundColor);
    const before = await background();
    await card.getByRole('button', { name: 'Caught it' }).click();
    await expect(card.locator('p', { hasText: 'Caught' })).toBeVisible();
    await expect(card.locator('p', { hasText: LAST_CHANCE })).toHaveCount(0);
    expect(await background()).not.toBe(before);
  });
});

test.describe('marks in German', () => {
  test.use({ locale: 'de-DE' });

  test('are translated', async ({ page }) => {
    await skipWelcome(page, 'Nein danke, zeig mir einfach die Liste');
    await expect(list(page).locator('li p', { hasText: 'Letzte Chance' }).first()).toBeVisible();
    await expect(list(page).locator('li p', { hasText: 'Ganzjährig' }).first()).toBeVisible();
  });
});
