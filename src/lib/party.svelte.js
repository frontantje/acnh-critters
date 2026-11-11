import { CATEGORIES, categoryIcon, countCaught, critters, isAvailableIn, monthName } from './critters.js';
import { clock } from './clock.svelte.js';
import { t } from './i18n.svelte.js';
import { addTrophies, markCaught, progress, trophyFields, trophyKey } from './progress.svelte.js';

/** @typedef {import('./critters.js').Hemisphere} Hemisphere */
/** @typedef {import('./i18n.svelte.js').MessageKey} MessageKey */
/** @typedef {import('./progress.svelte.js').Trophy} Trophy */
/** @typedef {'fish' | 'bug' | 'sea' | 'all'} Scope */
/** @typedef {'month' | 'half' | 'full'} Kind */
/**
 * size: how big a deal it is, 1–6 by medal and a category before all critters, for the confetti and the order of parties.
 * @typedef {{ kind: Kind, scope: Scope, year?: number, month?: number, size: number }} Milestone
 */

/** @type {Record<Kind, [number, number]>} */
const SIZES = { month: [1, 2], half: [3, 4], full: [5, 6] };

/** @type {Scope[]} */
const SCOPES = [.../** @type {Scope[]} */ (CATEGORIES.map((category) => category.id)), 'all'];

/** @type {Record<Scope, MessageKey>} */
const THINGS = { fish: 'partyThingsFish', bug: 'partyThingsBug', sea: 'partyThingsSea', all: 'partyThingsAll' };
/** @type {Record<Kind, MessageKey>} */
const TITLES = { month: 'partyMonth', half: 'partyHalf', full: 'partyFull' };
/** @type {Record<Kind, MessageKey>} */
const DESCRIPTIONS = { month: 'trophyMonth', half: 'trophyHalf', full: 'trophyFull' };

const TOTALS = countCaught(critters, new Set());

// The parties still to show, one popup after another.
export const party = $state({ queue: /** @type {Milestone[]} */ ([]) });

/**
 * @param {Kind} kind
 * @param {Scope} scope
 */
const sizeOf = (kind, scope) => SIZES[kind][scope === 'all' ? 1 : 0];

/**
 * In the order their parties show, building up: smallest first, and a category before all critters.
 * @param {{ has: (id: string) => boolean }} caught
 * @param {Hemisphere} hemisphere
 * @param {Date} now
 * @returns {Milestone[]}
 */
export function milestones(caught, hemisphere, now) {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const all = countCaught(critters, caught);
  const thisMonth = countCaught(critters.filter((critter) => isAvailableIn(critter, hemisphere, month)), caught);
  /** @type {Milestone[]} */
  const reached = [];
  for (const scope of SCOPES) {
    const { caught: done, total } = all[scope];
    const monthDone = thisMonth[scope];
    if (monthDone.total > 0 && monthDone.caught === monthDone.total) {
      reached.push({ kind: 'month', scope, year, month, size: sizeOf('month', scope) });
    }
    if (done * 2 >= total) reached.push({ kind: 'half', scope, size: sizeOf('half', scope) });
    if (done === total) reached.push({ kind: 'full', scope, size: sizeOf('full', scope) });
  }
  return reached.sort((a, b) => a.size - b.size);
}

/**
 * Only list catches celebrate, since the sync and imports record critters caught long before.
 * @param {string} id
 * @returns {boolean} whether a party started
 */
export function catchFromList(id) {
  const now = clock.now;
  const had = new Set(milestones(progress.caught, progress.hemisphere, now).map(trophyKey));
  const reached = withoutFinishedMonths(milestones(new Set([...progress.caught, id]), progress.hemisphere, now)).filter(
    (milestone) => !had.has(trophyKey(milestone)),
  );
  markCaught(id, reached.map((milestone) => toTrophy(milestone, now)));
  if (reached.length === 0) return false;
  party.queue.push(...reached);
  return true;
}

/** Milestones reached some other way (the sync, an import, a new month) still earn their trophy, just without a party. */
export function awardTrophies(now = clock.now) {
  addTrophies(withoutFinishedMonths(milestones(progress.caught, progress.hemisphere, now)).map((milestone) => toTrophy(milestone, now)));
}

/**
 * Going by the earned gold or rainbow medal, so a scope caught in full earns no more month medals, even after a catch is taken back.
 * @param {Milestone[]} reached
 */
function withoutFinishedMonths(reached) {
  const finished = new Set(progress.trophies.filter((trophy) => trophy.kind === 'full').map((trophy) => trophy.scope));
  return reached.filter((milestone) => milestone.kind !== 'month' || !finished.has(milestone.scope));
}

/**
 * Null for a trophy this version doesn't know, e.g. one saved by a newer version.
 * @param {Trophy} trophy
 * @returns {Milestone | null}
 */
export function trophyMilestone(trophy) {
  const kind = /** @type {Kind} */ (trophy.kind);
  const scope = /** @type {Scope} */ (trophy.scope);
  if (!Object.hasOwn(SIZES, kind) || !SCOPES.includes(scope)) return null;
  if (kind !== 'month') return { kind, scope, size: sizeOf(kind, scope) };
  if (trophy.year === undefined || trophy.month === undefined) return null;
  return { kind, scope, year: trophy.year, month: trophy.month, size: sizeOf(kind, scope) };
}

/**
 * Newest day first, the biggest of a day on top; trophies this version doesn't know are left out.
 * @param {Trophy[]} trophies
 */
export function shownTrophies(trophies) {
  return trophies
    .flatMap((trophy) => {
      const milestone = trophyMilestone(trophy);
      return milestone ? [{ key: trophyKey(trophy), date: trophy.date, seen: trophy.seen === true, milestone }] : [];
    })
    .reverse()
    .sort((a, b) => b.date.localeCompare(a.date) || b.milestone.size - a.milestone.size);
}

/** @param {Milestone} milestone */
export function milestoneTitle(milestone) {
  return t(TITLES[milestone.kind], messageValues(milestone));
}

/** @param {Milestone} milestone */
export function milestoneDescription(milestone) {
  return t(DESCRIPTIONS[milestone.kind], messageValues(milestone));
}

/**
 * For titles and descriptions alike, since a message leaves out what it doesn't use.
 * @param {Milestone} milestone
 */
function messageValues({ scope, year, month }) {
  return {
    things: t(THINGS[scope]),
    month: month ? monthName(month) : '',
    year: String(year ?? ''),
    total: String(TOTALS[scope].total),
  };
}

/**
 * @param {Milestone} milestone
 * @returns {'bronze' | 'silver' | 'gold' | 'rainbow'}
 */
export function medalOf({ kind, scope }) {
  if (kind === 'month') return 'bronze';
  if (kind === 'half') return 'silver';
  return scope === 'all' ? 'rainbow' : 'gold';
}

/** @param {Milestone} milestone */
export function milestoneIcons(milestone) {
  const categories = milestone.scope === 'all' ? CATEGORIES.map((category) => category.id) : [milestone.scope];
  return categories.map((category) => /** @type {string} */ (categoryIcon(category)));
}

/**
 * @param {Milestone} milestone
 * @param {Date} now
 * @returns {Trophy}
 */
function toTrophy(milestone, now) {
  return trophyFields({ ...milestone, date: localDate(now) });
}

/** @param {Date} date */
function localDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
