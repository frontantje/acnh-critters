// Sorting by season and time of day, and the "last chance" tint at the end of a month.
import { available, critters, expect, hemisphereSelect, list, monthSelect, normalize, row, rows, setShowCaught, skipWelcome, test } from './support.js';

const LAST_CHANCE = 'Last chance: gone next month';

/**
 * Months in a row, from `month` on, that a critter can be caught (12 = all year).
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
 * 0 catchable at `hour` (with a time window), 1 outside its window, 2 all day.
 * @param {any} critter
 * @param {'north' | 'south'} hemisphere
 * @param {number} month
 * @param {number} hour
 */
function timeGroup(critter, hemisphere, month, hour) {
  const hours = critter[hemisphere].find((/** @type {any} */ p) => p.months.includes(month)).hours;
  return hours.length === 24 ? 2 : hours.includes(hour) ? 0 : 1;
}

/**
 * The expected order, worked out independently of the app's code.
 * @param {any[]} list in Critterpedia order
 * @param {'north' | 'south'} hemisphere
 * @param {number} month
 * @param {number} hour
 */
function expectedOrder(list, hemisphere, month, hour) {
  return list
    .map((c, i) => ({ name: c.name.en, left: monthsLeft(c, hemisphere, month), time: timeGroup(c, hemisphere, month, hour), i }))
    .sort((a, b) => a.left - b.left || a.time - b.time || a.i - b.i);
}

/** Names of the shown rows, top to bottom. @param {import('@playwright/test').Page} page */
const shownNames = async (page) => (await rows(page).locator('span:first-child').allTextContents()).map(normalize);

/** Names of the rows carrying the "last chance" note. @param {import('@playwright/test').Page} page */
const warnedNames = async (page) =>
  (await list(page).locator('li').filter({ hasText: LAST_CHANCE }).locator('span:first-child').allTextContents()).map(normalize);

/**
 * @param {import('@playwright/test').BrowserContext} context
 * @param {string} dateTime e.g. "2026-10-28T12:00"
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
    test(`${hemisphere}, month ${month}: by season, then catchable now / later / all day`, async ({ page }) => {
      await skipWelcome(page);
      await hemisphereSelect(page).selectOption(hemisphere);
      await monthSelect(page).selectOption(String(month));
      const expected = expectedOrder(available('all', hemisphere, month), hemisphere, month, 12);

      expect(await shownNames(page)).toEqual(expected.map((e) => e.name));
      expect(expected[0].left).toBe(1);
      expect(expected[expected.length - 1]).toMatchObject({ left: 12, time: 2 });
    });
  }

  test('at night, night critters move up within their season', async ({ page, context }) => {
    await setNow(context, '2026-10-15T21:00');
    await skipWelcome(page);
    const names = await shownNames(page);
    expect(names).toEqual(expectedOrder(available('all'), 'north', 10, 21).map((e) => e.name));
    // Both leave after October; at noon the order would be the other way round.
    expect(names.indexOf('Scorpion')).toBeLessThan(names.indexOf('Red dragonfly'));
  });

  test('each tab is sorted the same way', async ({ page }) => {
    await skipWelcome(page);
    await page.getByRole('tab', { name: 'Insects', exact: true }).click();
    expect(await shownNames(page)).toEqual(expectedOrder(available('bug'), 'north', 10, 12).map((e) => e.name));
  });
});

test.describe('last chance tint', () => {
  // In list order at noon: they're the first season group.
  const leavingAfterOctober = expectedOrder(available('all'), 'north', 10, 12)
    .filter((e) => e.left === 1)
    .map((e) => e.name);

  test('in the last six days of the month, uncaught critters gone next month are flagged', async ({ page, context }) => {
    await setNow(context, '2026-10-28T12:00');
    await skipWelcome(page);
    expect(leavingAfterOctober.length).toBeGreaterThan(0);
    expect(await warnedNames(page)).toEqual(leavingAfterOctober);

    // The tint differs from normal rows.
    const background = (/** @type {string} */ name) => row(page, name).evaluate((li) => getComputedStyle(li).backgroundColor);
    const allYear = available('all').find((c) => monthsLeft(c, 'north', 10) === 12);
    expect(await background(leavingAfterOctober[0])).not.toBe(await background(allYear.name.en));
  });

  test('caught critters are not flagged', async ({ page, context }) => {
    await setNow(context, '2026-10-28T12:00');
    await skipWelcome(page);
    await setShowCaught(page, true);
    await row(page, leavingAfterOctober[0]).getByRole('button', { name: 'Caught it' }).click();
    expect(await warnedNames(page)).toEqual(leavingAfterOctober.slice(1));
  });

  test('only for the current month, not when another month is selected', async ({ page, context }) => {
    await setNow(context, '2026-10-28T12:00');
    await skipWelcome(page);
    await monthSelect(page).selectOption({ label: 'November' });
    expect(await warnedNames(page)).toEqual([]);
    await monthSelect(page).selectOption({ label: 'All months' });
    expect(await warnedNames(page)).toEqual([]);
  });

  test('a week or more before the end of the month, nothing is flagged', async ({ page, context }) => {
    await setNow(context, '2026-10-25T12:00'); // 25–31: exactly a week to go
    await skipWelcome(page);
    expect(await warnedNames(page)).toEqual([]);
  });

  test('the note is translated', async ({ newDevice }) => {
    const page = await newDevice({ locale: 'de-DE' });
    await setNow(page.context(), '2026-10-30T12:00');
    await page.reload();
    await page.getByRole('button', { name: 'Nein danke, zeig mir einfach die Liste' }).click();
    await expect(list(page).getByText('Letzte Chance: nächsten Monat weg').first()).toBeAttached();
  });
});
