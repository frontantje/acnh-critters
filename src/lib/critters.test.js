import { afterEach, describe, expect, test } from 'vitest';
import { critterName, critters, isAvailableIn, locationText, monthName, notesText, timeText } from './critters.js';
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
