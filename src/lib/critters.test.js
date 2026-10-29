import { afterEach, describe, expect, test } from 'vitest';
import {
  critterName,
  critters,
  daysLeftInMonth,
  isAvailableIn,
  locationText,
  monthName,
  monthsLeft,
  notesText,
  sortForMonth,
  timeOfDayGroup,
  timeText,
} from './critters.js';
import { setLocale } from './i18n.svelte.js';

/** @typedef {import('./critters.js').Critter} Critter */
/** @typedef {{ months: number[], hours: number[] }} Period */

/** @param {string} id */
const byId = (id) => /** @type {Critter} */ (critters.find((critter) => critter.id === id));

/** A real critter with made-up availability. @param {Period[]} periods */
const withPeriods = (periods) => ({ ...critters[0], north: periods, south: periods });

const ALL_DAY = Array.from({ length: 24 }, (_, hour) => hour);
/**
 * Hours from start (inclusive) to end (exclusive), wrapping past midnight.
 * @param {number} start
 * @param {number} end
 */
function hours(start, end) {
  const list = [];
  for (let hour = start; hour !== end; hour = (hour + 1) % 24) list.push(hour);
  return list.sort((a, b) => a - b);
}

/** Times use non-breaking spaces; this lets expectations use plain ones. @param {string} text */
const plain = (text) => text.replace(/ /g, ' ');
/**
 * @param {Period[]} periods
 * @param {number} [month]
 */
const time = (periods, month = 0) => plain(timeText(withPeriods(periods), 'north', month));

afterEach(() => setLocale('en'));

describe('timeText', () => {
  test.each([
    [4, 21, '4 AM – 9 PM', '4–21 Uhr'],
    [21, 4, '9 PM – 4 AM', '21–4 Uhr'],
    [16, 9, '4 PM – 9 AM', '16–9 Uhr'],
    [0, 4, '12 AM – 4 AM', '0–4 Uhr'],
    [12, 16, '12 PM – 4 PM', '12–16 Uhr'],
    [21, 0, '9 PM – 12 AM', '21–24 Uhr'],
    [5, 6, '5 AM – 6 AM', '5–6 Uhr'],
  ])('%i–%i h is "%s" / "%s"', (start, end, english, german) => {
    const periods = [{ months: [1], hours: hours(start, end) }];
    expect(time(periods)).toBe(english);
    setLocale('de');
    expect(time(periods)).toBe(german);
  });

  test('all 24 hours are "All day" / "Ganztägig"', () => {
    expect(time([{ months: [1], hours: ALL_DAY }])).toBe('All day');
    setLocale('de');
    expect(time([{ months: [1], hours: ALL_DAY }])).toBe('Ganztägig');
  });

  test('lists two daily windows in order', () => {
    const periods = [{ months: [1], hours: [...hours(21, 4), ...hours(9, 16)].sort((a, b) => a - b) }];
    expect(time(periods)).toBe('9 AM – 4 PM, 9 PM – 4 AM');
    setLocale('de');
    expect(time(periods)).toBe('9–16 Uhr, 21–4 Uhr');
  });

  test('keeps each time together with non-breaking spaces', () => {
    const periods = [{ months: [1], hours: hours(21, 4) }];
    expect(timeText(withPeriods(periods), 'north', 1)).toBe('9 PM – 4 AM');
    setLocale('de');
    expect(timeText(withPeriods(periods), 'north', 1)).toBe('21–4 Uhr');
  });

  describe('hours that change by season', () => {
    const seasonal = [
      { months: [3, 4, 5, 6], hours: hours(16, 9) },
      { months: [9, 10, 11], hours: ALL_DAY },
    ];

    test('shows the hours of the selected month', () => {
      expect(time(seasonal, 4)).toBe('4 PM – 9 AM');
      expect(time(seasonal, 10)).toBe('All day');
    });

    test('lists every season for all months, or a month without the critter', () => {
      expect(time(seasonal, 0)).toBe('Mar – Jun: 4 PM – 9 AM · Sep – Nov: All day');
      expect(time(seasonal, 1)).toBe('Mar – Jun: 4 PM – 9 AM · Sep – Nov: All day');
      setLocale('de');
      expect(time(seasonal, 0)).toBe('Mär – Jun: 16–9 Uhr · Sep – Nov: Ganztägig');
    });

    test('month ranges wrap around the new year and can be single months or gaps', () => {
      expect(time([{ months: [1, 2, 11, 12], hours: ALL_DAY }, { months: [5], hours: hours(4, 21) }])).toBe(
        'Nov – Feb: All day · May: 4 AM – 9 PM',
      );
      expect(time([{ months: [1, 3], hours: ALL_DAY }, { months: [6], hours: hours(4, 21) }])).toBe(
        'Jan, Mar: All day · Jun: 4 AM – 9 PM',
      );
    });
  });

  test('works on the real data', () => {
    expect(plain(timeText(byId('char'), 'north', 0))).toBe('Mar – Jun: 4 PM – 9 AM · Sep – Nov: All day');
    expect(plain(timeText(byId('char'), 'south', 4))).toBe('All day');
    expect(plain(timeText(byId('piranha'), 'south', 1))).toBe('9 AM – 4 PM, 9 PM – 4 AM');
  });
});

describe('monthName', () => {
  test('in both languages and lengths', () => {
    expect(monthName(3)).toBe('March');
    expect(monthName(3, 'short')).toBe('Mar');
    setLocale('de');
    expect(monthName(3)).toBe('März');
    expect(monthName(12, 'short')).toBe('Dez');
  });
});

describe('isAvailableIn', () => {
  test('checks the hemisphere’s months', () => {
    expect(isAvailableIn(byId('char'), 'north', 4)).toBe(true);
    expect(isAvailableIn(byId('char'), 'north', 7)).toBe(false);
    expect(isAvailableIn(byId('char'), 'south', 4)).toBe(true);
    expect(isAvailableIn(byId('char'), 'south', 10)).toBe(true);
    expect(isAvailableIn(byId('char'), 'south', 7)).toBe(false);
  });
});

describe('monthsLeft', () => {
  test.each(
    /** @type {const} */ ([
      ['char', 'north', 3, 4],
      ['char', 'north', 6, 1],
      ['char', 'north', 7, 0],
      ['char', 'north', 9, 3],
      ['bitterling', 'north', 11, 5], // Nov – Mar, across the new year
      ['bitterling', 'north', 3, 1],
      ['bitterling', 'south', 5, 5],
      ['crucian-carp', 'north', 10, 12], // all year
    ]),
  )('%s (%s) from month %i: %i', (id, hemisphere, month, left) => {
    expect(monthsLeft(byId(id), hemisphere, month)).toBe(left);
  });
});

describe('timeOfDayGroup', () => {
  test.each(
    /** @type {const} */ ([
      ['char', 4, 20, 0], // 4 PM – 9 AM in spring
      ['char', 4, 12, 1],
      ['char', 10, 12, 2], // all day in autumn
      ['piranha', 7, 10, 0], // 9 AM – 4 PM and 9 PM – 4 AM
      ['piranha', 7, 17, 1],
      ['piranha', 7, 22, 0],
      ['tarantula', 1, 2, 0], // 7 PM – 4 AM, past midnight
      ['tarantula', 1, 4, 1],
      ['crucian-carp', 10, 3, 2],
    ]),
  )('%s in month %i at %i h: group %i', (id, month, hour, group) => {
    expect(timeOfDayGroup(byId(id), 'north', month, hour)).toBe(group);
  });
});

describe('sortForMonth', () => {
  test('all months keeps Critterpedia order', () => {
    expect(sortForMonth(critters, 'north', 0, 12)).toBe(critters);
  });

  test.each(
    /** @type {const} */ ([
      ['north', 10, 12],
      ['north', 10, 21],
      ['south', 10, 3],
      ['north', 1, 0],
      ['south', 6, 17],
    ]),
  )('%s, month %i, %i h: by season, then catchable now / later / all day, then Critterpedia order', (hemisphere, month, hour) => {
    const available = critters.filter((c) => isAvailableIn(c, hemisphere, month));
    const sorted = sortForMonth(available, hemisphere, month, hour);
    const keys = sorted.map((c) => [monthsLeft(c, hemisphere, month), timeOfDayGroup(c, hemisphere, month, hour), critters.indexOf(c)]);

    expect(sorted).toHaveLength(available.length);
    expect(keys).toEqual([...keys].sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]));
    expect(keys[0][0]).toBe(1);
    expect(keys[keys.length - 1][0]).toBe(12);
    // All three time groups show up, so the second key really does something.
    expect(new Set(keys.map((k) => k[1]))).toEqual(new Set([0, 1, 2]));
  });

  test('the hour changes the order within a season', () => {
    const available = critters.filter((c) => isAvailableIn(c, 'north', 10));
    const names = (/** @type {number} */ hour) => sortForMonth(available, 'north', 10, hour).map((c) => c.id);
    expect(names(12)).not.toEqual(names(21));
    // All four leave after October. Each pair is the other way round in
    // Critterpedia order, so only the time of day can put them like this.
    // Noon: the ladybug (8 AM – 5 PM) before the snapping turtle (9 PM – 4 AM).
    expect(names(12).indexOf('ladybug')).toBeLessThan(names(12).indexOf('snapping-turtle'));
    // 9 PM: the scorpion (7 PM – 4 AM) before the red dragonfly (8 AM – 7 PM).
    expect(names(21).indexOf('scorpion')).toBeLessThan(names(21).indexOf('red-dragonfly'));
  });
});

describe('daysLeftInMonth', () => {
  test.each([
    ['2026-10-15', 17],
    ['2026-10-25', 7],
    ['2026-10-26', 6],
    ['2026-10-31', 1],
    ['2026-04-24', 7],
    ['2026-02-28', 1],
    ['2028-02-28', 2], // leap year
    ['2026-12-31', 1],
  ])('%s: %i, counting that day', (date, days) => {
    expect(daysLeftInMonth(new Date(`${date}T12:00:00`))).toBe(days);
  });
});

describe('row texts', () => {
  test('critterName follows the language', () => {
    expect(critterName(byId('char'))).toBe('Char');
    setLocale('de');
    expect(critterName(byId('char'))).toBe('Saibling');
  });

  test('locationText translates, and sea creatures are caught diving', () => {
    expect(locationText(byId('char'))).toBe('River (clifftop)');
    expect(locationText(byId('octopus'))).toBe('Sea (diving)');
    setLocale('de');
    expect(locationText(byId('char'))).toBe('Fluss (auf Klippen)');
    expect(locationText(byId('octopus'))).toBe('Meer (tauchen)');
  });

  test('locationText falls back to English for an untranslated value', () => {
    setLocale('de');
    const renamed = /** @type {Critter} */ ({ ...byId('char'), location: 'Somewhere new' });
    expect(locationText(renamed)).toBe('Somewhere new');
  });

  test('notesText lists shadow size and speed where the critter has them', () => {
    expect(notesText(byId('pale-chub'))).toBe('Shadow size: X-Small');
    expect(notesText(byId('octopus'))).toBe('Shadow size: Medium · Speed: Slow');
    expect(notesText(byId('ant'))).toBe('');
    setLocale('de');
    expect(notesText(byId('octopus'))).toBe('Schattengröße: Mittel · Tempo: Langsam');
  });
});
