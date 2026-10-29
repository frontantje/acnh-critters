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
 * 0 catchable at `hour` (with a time window), 1 all day, 2 outside its window.
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
 * The expected order, worked out independently of the app's code: critters
 * outside their hours at the bottom, unless they leave after this month (those
 * stay at the end of their group); then by season, time group and Critterpedia
 * order.
 * @param {any[]} list in Critterpedia order
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
    // The snapping turtle (9 PM – 4 AM) leaves after October and is out at noon:
    // after the ladybug (leaving too, catchable now), before the all-year crucian carp.
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
    // The red dragonfly (8 AM – 7 PM) is out, but stays with the leaving-soon group.
    expect(names.indexOf('Red dragonfly')).toBeLessThan(names.indexOf('Crucian carp'));
  });

  test('each tab is sorted the same way', async ({ page }) => {
    await skipWelcome(page);
    await page.getByRole('tab', { name: 'Insects', exact: true }).click();
    expect(await shownNames(page)).toEqual(expectedOrder(available('bug'), 'north', 10, 12).map((e) => e.name));
  });
});

test.describe('year-round tint', () => {
  const yearRound = critters.filter((c) => monthsLeft(c, 'north', 1) === 12).map((c) => c.name.en);
  /** @param {import('@playwright/test').Page} page */
  const notedYearRound = async (page) =>
    (await list(page).locator('li').filter({ hasText: 'All year' }).locator('span:first-child').allTextContents()).map(normalize);

  test('uncaught critters catchable all year are tinted, in a month and for all months', async ({ page }) => {
    await skipWelcome(page);
    expect(yearRound.length).toBeGreaterThan(0);
    expect((await notedYearRound(page)).sort()).toEqual([...yearRound].sort());

    const background = (/** @type {string} */ name) => row(page, name).evaluate((li) => getComputedStyle(li).backgroundColor);
    const seasonal = available('all').find((c) => monthsLeft(c, 'north', 10) < 12);
    expect(await background(yearRound[0])).not.toBe(await background(seasonal.name.en));

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

test.describe('last chance tint', () => {
  /**
   * Critters gone after `month` (north), in list order at noon: the top group.
   * @param {number} month
   */
  const leavingAfter = (month) =>
    expectedOrder(available('all', 'north', month), 'north', month, 12)
      .filter((e) => e.left === 1)
      .map((e) => e.name);

  test('uncaught critters gone after the selected month are flagged, on any day', async ({ page }) => {
    // The tests run on 15 October, well before the month's end.
    await skipWelcome(page);
    expect(leavingAfter(10).length).toBeGreaterThan(0);
    expect(await warnedNames(page)).toEqual(leavingAfter(10));
    // They're exactly the top of the list.
    expect((await shownNames(page)).slice(0, leavingAfter(10).length)).toEqual(leavingAfter(10));

    // The tint differs from normal and year-round rows.
    const background = (/** @type {string} */ name) => row(page, name).evaluate((li) => getComputedStyle(li).backgroundColor);
    const normal = available('all').find((c) => ![1, 12].includes(monthsLeft(c, 'north', 10)));
    const allYear = available('all').find((c) => monthsLeft(c, 'north', 10) === 12);
    const red = await background(leavingAfter(10)[0]);
    expect(red).not.toBe(await background(normal.name.en));
    expect(red).not.toBe(await background(allYear.name.en));
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

test.describe('color legend', () => {
  /** @param {import('@playwright/test').Page} page */
  const entries = (page) => page.getByTestId('legend').locator(':scope > span');
  /**
   * @param {import('@playwright/test').Locator} locator
   */
  const backgroundOf = (locator) => locator.evaluate((el) => getComputedStyle(el).backgroundColor);

  test('explains just the colors that can show', async ({ page }) => {
    await skipWelcome(page);
    await expect(entries(page)).toHaveText(['Gone after this month', 'Catchable all year']);
    await setShowCaught(page, true);
    await expect(entries(page)).toHaveText(['Gone after this month', 'Catchable all year', 'Caught']);
    await monthSelect(page).selectOption({ label: 'All months' });
    await expect(entries(page)).toHaveText(['Catchable all year', 'Caught']);
  });

  test('its squares have the rows’ colors', async ({ page }) => {
    await skipWelcome(page);
    const swatch = (/** @type {number} */ i) => entries(page).nth(i).locator('span');
    const leaving = available('all').find((c) => monthsLeft(c, 'north', 10) === 1);
    const allYear = available('all').find((c) => monthsLeft(c, 'north', 10) === 12);
    expect(await backgroundOf(swatch(0))).toBe(await backgroundOf(row(page, leaving.name.en)));
    expect(await backgroundOf(swatch(1))).toBe(await backgroundOf(row(page, allYear.name.en)));
  });

  test('sits between the pinned bar and the list, and scrolls away with it', async ({ page }) => {
    await skipWelcome(page);
    const bar = await page.locator('div.sticky').boundingBox();
    const legend = await page.getByTestId('legend').boundingBox();
    const firstRow = await rows(page).first().boundingBox();
    if (!bar || !legend || !firstRow) throw new Error('not rendered');
    expect(legend.y).toBeGreaterThanOrEqual(bar.y + bar.height - 1);
    expect(legend.y + legend.height).toBeLessThanOrEqual(firstRow.y + 1);

    await page.evaluate(() => scrollTo(0, 1500));
    await expect(page.getByTestId('legend')).not.toBeInViewport();
  });
});

test.describe('last chance tint in German', () => {
  test.use({ locale: 'de-DE' });

  test('the note is translated', async ({ page }) => {
    await skipWelcome(page, 'Nein danke, zeig mir einfach die Liste');
    await expect(list(page).getByText('Letzte Chance: nächsten Monat weg').first()).toBeAttached();
  });

  test('so is the legend', async ({ page }) => {
    await skipWelcome(page, 'Nein danke, zeig mir einfach die Liste');
    await expect(page.getByTestId('legend').locator(':scope > span')).toHaveText(['Nach diesem Monat weg', 'Ganzjährig fangbar']);
  });
});
