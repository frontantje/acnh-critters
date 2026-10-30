import critters from '../../data/critters.json';
import { i18n, t, term } from './i18n.svelte.js';

/** @typedef {(typeof critters)[number]} Critter */
/** @typedef {'north' | 'south'} Hemisphere */

export { critters };

/** @typedef {{ id: string, label: import('./i18n.svelte.js').MessageKey }} Tab */

/** @type {Tab[]} */
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
 * @param {number} month
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
 * @param {Critter} critter
 * @param {Hemisphere} hemisphere
 * @param {number} month
 */
export function monthsLeft(critter, hemisphere, month) {
  let count = 0;
  while (count < 12 && isAvailableIn(critter, hemisphere, ((month - 1 + count) % 12) + 1)) count += 1;
  return count;
}

/**
 * A sort key: catchable now first, then all day, then outside its hours.
 * @param {Critter} critter
 * @param {Hemisphere} hemisphere
 * @param {number} month 1–12
 * @param {number} hour
 */
export function timeOfDayGroup(critter, hemisphere, month, hour) {
  const hours = critter[hemisphere].find((period) => period.months.includes(month))?.hours ?? [];
  if (hours.length === 24) return 1;
  return hours.includes(hour) ? 0 : 2;
}

/**
 * Critters gone after this month stay together even outside their hours; ties keep the list's Critterpedia order.
 * @param {Critter[]} list
 * @param {Hemisphere} hemisphere
 * @param {number} month 1–12, or 0 for all months
 * @param {number} hour
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

/** @param {number[]} hours */
function formatHours(hours) {
  if (hours.length === 24) return t('allDay');
  return cyclicRuns(hours, 0, 23)
    .map(([first, last]) => formatHourRange(first, (last + 1) % 24))
    .join(', ');
}

/**
 * Non-breaking spaces keep each time together, so the only line break is before the dash.
 * @param {number} start
 * @param {number} end exclusive
 */
function formatHourRange(start, end) {
  if (i18n.locale === 'de') return `${start}–${end || 24} Uhr`;
  /** @param {number} hour */
  const format = (hour) => `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`;
  return `${format(start)} – ${format(end)}`;
}

/** @param {number[]} months */
function formatMonths(months) {
  if (months.length === 12) return t('allYear');
  /** @param {number} month */
  const name = (month) => monthName(month, 'short');
  return cyclicRuns(months, 1, 12)
    .map(([first, last]) => (first === last ? name(first) : `${name(first)} – ${name(last)}`))
    .join(', ');
}

/**
 * The full cycle has no run start, so callers handle it first.
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
    const previous = first === min ? max : first - 1;
    if (!included.has(first) || included.has(previous)) continue;
    let last = first;
    while (included.has(next(last))) last = next(last);
    runs.push([first, last]);
  }
  return runs;
}
