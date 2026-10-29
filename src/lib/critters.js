import critters from '../../data/critters.json';
import { i18n, t, term } from './i18n.svelte.js';

/** @typedef {(typeof critters)[number]} Critter */
/** @typedef {'north' | 'south'} Hemisphere */

export { critters };

/** @typedef {{ id: string, label: import('./i18n.svelte.js').MessageKey }} Tab */

/** The critter types, in Critterpedia order. @type {Tab[]} */
export const CATEGORIES = [
  { id: 'fish', label: 'tabFish' },
  { id: 'bug', label: 'tabBugs' },
  { id: 'sea', label: 'tabSea' },
];

/** @type {Tab[]} */
export const TABS = [{ id: 'all', label: 'tabAll' }, ...CATEGORIES];

/** @param {Critter} critter */
export function critterName(critter) {
  return critter.name[i18n.locale];
}

/**
 * The month's name in the current language, e.g. 3 -> "March" / "März".
 * @param {number} month 1–12
 * @param {'long' | 'short'} [style]
 */
export function monthName(month, style = 'long') {
  return new Date(2000, month - 1, 1).toLocaleString(i18n.locale, { month: style });
}

/**
 * @param {Critter} critter
 * @param {Hemisphere} hemisphere
 * @param {number} month 1–12
 */
export function isAvailableIn(critter, hemisphere, month) {
  return critter[hemisphere].some((period) => period.months.includes(month));
}

/**
 * How many months in a row, starting with `month`, the critter can be caught:
 * 0 if not in `month`, 1 if it's gone next month, 12 if it's there all year.
 * @param {Critter} critter
 * @param {Hemisphere} hemisphere
 * @param {number} month 1–12
 */
export function monthsLeft(critter, hemisphere, month) {
  let count = 0;
  while (count < 12 && isAvailableIn(critter, hemisphere, ((month - 1 + count) % 12) + 1)) count += 1;
  return count;
}

/**
 * Where the critter's hours in `month` stand at `hour`: 0 it has a time window
 * and can be caught now, 1 it's there all day, 2 it's outside its window.
 * @param {Critter} critter
 * @param {Hemisphere} hemisphere
 * @param {number} month 1–12
 * @param {number} hour 0–23
 */
export function timeOfDayGroup(critter, hemisphere, month, hour) {
  const hours = critter[hemisphere].find((period) => period.months.includes(month))?.hours ?? [];
  if (hours.length === 24) return 1;
  return hours.includes(hour) ? 0 : 2;
}

/**
 * Orders a list (given in Critterpedia order) for the month filter. For all
 * months (0): Critterpedia order. With a month:
 *
 * 1. Critters outside their hours right now go to the bottom, except those
 *    leaving after this month, which stay at the bottom of their own group.
 * 2. Then by season: leaving soonest first, all-year last.
 * 3. Then catchable now, all day, outside their hours.
 * 4. Ties keep Critterpedia order.
 * @param {Critter[]} list
 * @param {Hemisphere} hemisphere
 * @param {number} month 1–12, or 0 for all months
 * @param {number} hour 0–23, the current hour
 */
export function sortForMonth(list, hemisphere, month, hour) {
  if (month === 0) return list;
  return list
    .map((critter) => {
      const left = monthsLeft(critter, hemisphere, month);
      const time = timeOfDayGroup(critter, hemisphere, month, hour);
      return { critter, bottom: time === 2 && left > 1 ? 1 : 0, left, time };
    })
    .sort((a, b) => a.bottom - b.bottom || a.left - b.left || a.time - b.time)
    .map(({ critter }) => critter);
}

/**
 * The catch time in the given month, e.g. "4 AM – 9 PM" / "4–21 Uhr". For all
 * months (month 0), critters whose hours change by season list each season.
 * @param {Critter} critter
 * @param {Hemisphere} hemisphere
 * @param {number} month 1–12, or 0 for all months
 */
export function timeText(critter, hemisphere, month) {
  const periods = critter[hemisphere];
  const current = periods.find((period) => period.months.includes(month));
  if (current) return formatHours(current.hours);
  if (periods.length === 1) return formatHours(periods[0].hours);
  return periods.map((period) => `${formatMonths(period.months)}: ${formatHours(period.hours)}`).join(' · ');
}

/** @param {Critter} critter */
export function locationText(critter) {
  return critter.location ? term(critter.location) : t('diving');
}

/** @param {Critter} critter */
export function notesText(critter) {
  const notes = [];
  if (critter.shadow) notes.push(t('shadowSize', { value: term(critter.shadow) }));
  if (critter.speed) notes.push(t('speed', { value: term(critter.speed) }));
  return notes.join(' · ');
}

/**
 * Formats hours as ranges, e.g. [0, 1, 2, 3, 21, 22, 23] -> "9 PM – 4 AM" / "21–4 Uhr".
 * @param {number[]} hours 0–23
 */
function formatHours(hours) {
  if (hours.length === 24) return t('allDay');
  return cyclicRuns(hours, 0, 23)
    .map(([first, last]) => formatHourRange(first, (last + 1) % 24))
    .join(', ');
}

/**
 * Non-breaking spaces ( ) keep times together when the text wraps; the
 * only break is before the dash.
 * @param {number} start
 * @param {number} end exclusive
 */
function formatHourRange(start, end) {
  if (i18n.locale === 'de') return `${start}–${end || 24} Uhr`;
  /** @param {number} hour */
  const format = (hour) => `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`;
  return `${format(start)} – ${format(end)}`;
}

/**
 * Formats months as ranges, e.g. [1, 2, 3, 11, 12] -> "Nov – Mar".
 * @param {number[]} months 1–12
 */
function formatMonths(months) {
  if (months.length === 12) return t('allYear');
  /** @param {number} month */
  const name = (month) => monthName(month, 'short');
  return cyclicRuns(months, 1, 12)
    .map(([first, last]) => (first === last ? name(first) : `${name(first)} – ${name(last)}`))
    .join(', ');
}

/**
 * Splits values on a cycle (hours 0–23, months 1–12) into runs of consecutive
 * values, ordered by their first value: [1, 2, 11, 12] -> [[11, 2]].
 * Not meant for the full cycle, which has no start.
 * @param {number[]} values
 * @param {number} min
 * @param {number} max
 */
function cyclicRuns(values, min, max) {
  const included = new Set(values);
  /** @param {number} value */
  const next = (value) => (value === max ? min : value + 1);
  /** @type {[number, number][]} */
  const runs = [];
  for (let first = min; first <= max; first++) {
    // A run starts at an included value whose previous value isn't included.
    const previous = first === min ? max : first - 1;
    if (!included.has(first) || included.has(previous)) continue;
    let last = first;
    while (included.has(next(last))) last = next(last);
    runs.push([first, last]);
  }
  return runs;
}
