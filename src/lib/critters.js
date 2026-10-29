import critters from '../../data/critters.json';

/** @typedef {(typeof critters)[number]} Critter */
/** @typedef {'north' | 'south'} Hemisphere */

export { critters };

export const TABS = [
  { id: 'all', label: 'All' },
  { id: 'fish', label: 'Fish' },
  { id: 'bug', label: 'Insects' },
  { id: 'sea', label: 'Sea creatures' },
];

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * @param {Critter} critter
 * @param {Hemisphere} hemisphere
 * @param {number} month 1–12
 */
export function isAvailableIn(critter, hemisphere, month) {
  return critter[hemisphere].some((period) => period.months.includes(month));
}

/**
 * The catch time in the given month, e.g. "4 AM – 9 PM". For all months
 * (month 0), critters whose hours change by season list each season.
 * @param {Critter} critter
 * @param {Hemisphere} hemisphere
 * @param {number} month 1–12, or 0 for all months
 */
export function timeText(critter, hemisphere, month) {
  const periods = critter[hemisphere];
  const current = periods.find((period) => period.months.includes(month));
  if (current) return current.time;
  if (periods.length === 1) return periods[0].time;
  return periods.map((period) => `${formatMonths(period.months)}: ${period.time}`).join(' · ');
}

/** @param {Critter} critter */
export function locationText(critter) {
  return critter.location ?? 'Sea (diving)';
}

/** @param {Critter} critter */
export function notesText(critter) {
  const notes = [];
  if (critter.shadow) notes.push(`Shadow size: ${critter.shadow}`);
  if (critter.speed) notes.push(`Speed: ${critter.speed}`);
  return notes.join(' · ');
}

/**
 * Formats months as ranges, e.g. [1, 2, 3, 11, 12] -> "Nov – Mar".
 * @param {number[]} months
 */
function formatMonths(months) {
  if (months.length === 12) return 'All year';
  const included = new Set(months);
  /** @param {number} month */
  const next = (month) => (month % 12) + 1;
  /** @param {number} month */
  const name = (month) => MONTHS[month - 1].slice(0, 3);

  const ranges = [];
  for (let start = 1; start <= 12; start++) {
    // A range starts at an included month whose previous month isn't included.
    const previous = start === 1 ? 12 : start - 1;
    if (!included.has(start) || included.has(previous)) continue;
    let end = start;
    while (included.has(next(end))) end = next(end);
    ranges.push(start === end ? name(start) : `${name(start)} – ${name(end)}`);
  }
  return ranges.join(', ');
}
