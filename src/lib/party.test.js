import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { clock } from './clock.svelte.js';
import { critters, isAvailableIn } from './critters.js';
import { setLocale } from './i18n.svelte.js';
import {
  awardTrophies,
  catchFromList,
  medalOf,
  milestoneDescription,
  milestoneIcons,
  milestones,
  milestoneTitle,
  party,
  shownTrophies,
  trophyMilestone,
} from './party.svelte.js';
import { importProgress, markCaught, progress, restore, trophyKey, unmarkCaught } from './progress.svelte.js';

/** @typedef {import('./progress.svelte.js').Trophy} Trophy */
/** @typedef {import('./party.svelte.js').Milestone} Milestone */

const OCTOBER = new Date(2026, 9, 15, 12);
const NOVEMBER = new Date(2026, 10, 1, 9);
const all = critters.map((critter) => critter.id);
const fish = critters.filter((critter) => critter.type === 'fish').map((critter) => critter.id);
const notInNovember = /** @type {string} */ (
  critters.find((critter) => critter.type === 'fish' && !isAvailableIn(critter, 'north', 11))?.id
);
/**
 * @param {string} type
 * @param {number} [month]
 * @param {import('./critters.js').Hemisphere} [hemisphere]
 */
const inMonth = (type, month = 10, hemisphere = 'north') =>
  critters.filter((critter) => critter.type === type && isAvailableIn(critter, hemisphere, month)).map((critter) => critter.id);
/**
 * @param {string[]} caught
 * @param {import('./critters.js').Hemisphere} [hemisphere]
 */
const reached = (caught, hemisphere = 'north') => milestones(new Set(caught), hemisphere, OCTOBER).map(trophyKey);
/** @param {string[]} caught */
const load = (caught) => importProgress(JSON.stringify({ version: 2, caught }));
const saved = () => JSON.parse(localStorage.getItem('acnh-critters') ?? 'null');
const earned = () => progress.trophies.map(trophyKey);
// October has 34 of the 80 insects, so catching all of them reaches only the month's milestone.
const bugs = inMonth('bug');
const lastBug = bugs[bugs.length - 1];
const octoberBugs = { kind: 'month', scope: 'bug', year: 2026, month: 10, date: '2026-10-15' };
const oneBugToGo = () => load(bugs.slice(0, -1));
/** @param {Omit<Trophy, 'date'>} trophy */
const milestoneOf = (trophy) => /** @type {Milestone} */ (trophyMilestone({ ...trophy, date: '2026-10-15' }));

beforeEach(() => {
  localStorage.clear();
  restore();
  clock.now = OCTOBER;
  party.queue = [];
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('milestones', () => {
  test('none with nothing caught', () => {
    expect(reached([])).toEqual([]);
  });

  test('all of a category there is this month, in the hemisphere’s own months', () => {
    expect(reached(inMonth('bug'))).toEqual(['month-bug-2026-10']);
    expect(reached(inMonth('bug', 10, 'south'), 'south')).toEqual(['month-bug-2026-10']);
    expect(reached(inMonth('bug'), 'south')).toEqual([]);
  });

  test('half of a category', () => {
    expect(reached(fish.slice(0, 40))).toEqual(['half-fish']);
    expect(reached(fish.slice(0, 39))).toEqual([]);
  });

  test('everything reaches all of them, from bronze up to the rainbow, a category before all critters', () => {
    expect(reached(all)).toEqual([
      'month-fish-2026-10', 'month-bug-2026-10', 'month-sea-2026-10',
      'month-all-2026-10',
      'half-fish', 'half-bug', 'half-sea',
      'half-all',
      'full-fish', 'full-bug', 'full-sea',
      'full-all',
    ]);
    expect(milestones(new Set(all), 'north', OCTOBER).map((milestone) => milestone.size)).toEqual([1, 1, 1, 2, 3, 3, 3, 4, 5, 5, 5, 6]);
  });

  test('half of the insects and all of the month at once: the silver one after the bronze one', () => {
    const halfAndMonth = [...inMonth('fish'), ...inMonth('sea'), ...bugs.slice(0, -1)];
    // 39 insects: October's but the last, and 6 from other months.
    const otherBugs = critters.filter((critter) => critter.type === 'bug' && !bugs.includes(critter.id)).slice(0, 6);
    load([...halfAndMonth, ...otherBugs.map((critter) => critter.id)]);
    catchFromList(lastBug);
    expect(party.queue.map(trophyKey)).toEqual(['month-bug-2026-10', 'month-all-2026-10', 'half-bug']);
  });
});

describe('catchFromList', () => {
  test('a catch from the list that reaches a milestone celebrates it and earns its trophy', () => {
    oneBugToGo();
    expect(party.queue).toEqual([]);

    expect(catchFromList(lastBug)).toBe(true);
    expect(party.queue).toEqual([{ kind: 'month', scope: 'bug', year: 2026, month: 10, size: 1 }]);
    expect(progress.trophies).toEqual([octoberBugs]);
    expect(saved().trophies).toEqual([octoberBugs]);
  });

  test('the catch and its trophy are saved in one write', () => {
    oneBugToGo();
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    catchFromList(lastBug);
    expect(setItem.mock.calls.filter(([key]) => key === 'acnh-critters')).toHaveLength(1);
  });

  test('a catch that reaches nothing new has no party', () => {
    load(fish.slice(0, 40));
    expect(catchFromList(fish[40])).toBe(false);
    expect(party.queue).toEqual([]);
    expect(progress.trophies).toEqual([]);
  });

  test('after a correction, reaching it again celebrates again, without a second trophy', () => {
    oneBugToGo();
    catchFromList(lastBug);
    party.queue = [];

    clock.now = new Date(2026, 9, 16, 12);
    unmarkCaught(lastBug);
    catchFromList(lastBug);
    expect(party.queue).toMatchObject([{ kind: 'month', scope: 'bug' }]);
    expect(progress.trophies).toEqual([octoberBugs]);
  });

  test('the last insect of a month whose other critters are all caught: a party for the insects, then one for the month', () => {
    load([...inMonth('fish'), ...inMonth('sea'), ...bugs.slice(0, -1)]);
    catchFromList(lastBug);
    expect(party.queue.map(trophyKey)).toEqual(['month-bug-2026-10', 'month-all-2026-10']);
  });

  test('every milestone reached at once gets its party, building up to the biggest, and all are earned', () => {
    const last = inMonth('fish')[0];
    load(all.filter((id) => id !== last));
    catchFromList(last);
    const keys = ['month-fish-2026-10', 'month-all-2026-10', 'full-fish', 'full-all'];
    expect(party.queue.map(trophyKey)).toEqual(keys);
    expect(earned()).toEqual(keys);
  });

  test('the same month in another year is another trophy', () => {
    oneBugToGo();
    clock.now = new Date(2025, 9, 15, 12);
    catchFromList(lastBug);
    unmarkCaught(lastBug);
    clock.now = OCTOBER;
    catchFromList(lastBug);
    expect(earned()).toEqual(['month-bug-2025-10', 'month-bug-2026-10']);
  });
});

describe('awardTrophies', () => {
  test('catches from the sync or an import earn their trophies, but without a party', () => {
    oneBugToGo();
    markCaught(lastBug);
    expect(progress.trophies).toEqual([]);

    awardTrophies();
    expect(party.queue).toEqual([]);
    expect(saved().trophies).toEqual([octoberBugs]);
  });

  test('only saves when there is a new one', () => {
    load(fish.slice(0, 40));
    awardTrophies();
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    awardTrophies();
    expect(setItem).not.toHaveBeenCalled();
    expect(earned()).toEqual(['half-fish']);
  });

  test('a new month earns its trophy when all of its critters were caught before', () => {
    load(inMonth('bug', 11));
    awardTrophies(OCTOBER);
    expect(earned()).toEqual([]);
    awardTrophies(new Date(2026, 10, 1, 9));
    expect(progress.trophies).toEqual([{ kind: 'month', scope: 'bug', year: 2026, month: 11, date: '2026-11-01' }]);
  });

  test('a category caught in full earns no more month medals, even after a catch is taken back', () => {
    load(fish);
    awardTrophies(OCTOBER);
    const october = ['month-fish-2026-10', 'half-fish', 'full-fish'];
    expect(earned()).toEqual(october);

    awardTrophies(NOVEMBER);
    expect(earned()).toEqual(october);
    // All of November's fish are still caught, but the category isn't new to finish.
    unmarkCaught(notInNovember);
    awardTrophies(NOVEMBER);
    expect(earned()).toEqual(october);
  });

  test('all 200 caught earn no more month medals at all', () => {
    load(all);
    awardTrophies(OCTOBER);
    expect(earned()).toHaveLength(12);
    awardTrophies(NOVEMBER);
    expect(earned()).toHaveLength(12);
  });

  test('a catch taken back and caught again in a finished category: the gold party again, but no month medal', () => {
    const last = inMonth('fish')[0];
    load(fish.filter((id) => id !== last));
    catchFromList(last);
    expect(party.queue.map(trophyKey)).toEqual(['month-fish-2026-10', 'full-fish']);
    party.queue = [];

    unmarkCaught(last);
    catchFromList(last);
    expect(party.queue.map(trophyKey)).toEqual(['full-fish']);
  });
});

describe('trophies', () => {
  test('every milestone’s trophy stands for it again', () => {
    load(all);
    awardTrophies();
    expect(progress.trophies.map(trophyMilestone)).toEqual(milestones(new Set(all), 'north', OCTOBER));
  });

  test('ones this version doesn’t know stand for nothing', () => {
    for (const trophy of [{ kind: 'mega', scope: 'all' }, { kind: 'half', scope: 'snail' }, { kind: 'month', scope: 'fish' }]) {
      expect(trophyMilestone({ ...trophy, date: '2026-10-15' })).toBeNull();
    }
  });

  test('the trophy case shows the newest day first and the biggest of a day on top, without unknown ones', () => {
    const shown = shownTrophies([
      { kind: 'half', scope: 'fish', date: '2026-10-14' },
      { kind: 'month', scope: 'bug', year: 2026, month: 10, date: '2026-10-15' },
      { kind: 'mega', scope: 'all', date: '2026-10-16' },
      { kind: 'full', scope: 'bug', date: '2026-10-15' },
    ]);
    expect(shown.map((trophy) => trophy.key)).toEqual(['full-bug', 'month-bug-2026-10', 'half-fish']);
  });

  test('the trophy case knows which ones it hasn’t shown yet', () => {
    const shown = shownTrophies([
      { kind: 'half', scope: 'fish', date: '2026-10-14', seen: true },
      { kind: 'full', scope: 'fish', date: '2026-10-15' },
    ]);
    expect(shown.map(({ key, seen }) => [key, seen])).toEqual([['full-fish', false], ['half-fish', true]]);
  });

  test('titles and descriptions, in both languages', () => {
    const shown = [
      milestoneOf({ kind: 'month', scope: 'fish', year: 2026, month: 10 }),
      milestoneOf({ kind: 'half', scope: 'sea' }),
      milestoneOf({ kind: 'full', scope: 'all' }),
    ];

    setLocale('en');
    expect(shown.map(milestoneTitle)).toEqual(['All the fish of October!', 'Half of all sea creatures!', 'All 200 critters!']);
    expect(shown.map(milestoneDescription)).toEqual([
      'Caught all there were in October 2026.',
      'Caught half of the 40.',
      'Caught every single one.',
    ]);

    setLocale('de');
    expect(shown.map(milestoneTitle)).toEqual(['Alle Fische im Oktober!', 'Die Hälfte aller Meerestiere!', 'Alle 200 Tiere!']);
    expect(shown.map(milestoneDescription)).toEqual([
      'Alle gefangen, die es im Oktober 2026 gab.',
      'Die Hälfte der 40 gefangen.',
      'Jedes einzelne gefangen.',
    ]);
  });

  test('a month is a bronze medal, half silver, all of a category gold, and all 200 the rainbow one', () => {
    expect(medalOf(milestoneOf({ kind: 'month', scope: 'sea', year: 2026, month: 10 }))).toBe('bronze');
    expect(medalOf(milestoneOf({ kind: 'month', scope: 'all', year: 2026, month: 10 }))).toBe('bronze');
    expect(medalOf(milestoneOf({ kind: 'half', scope: 'fish' }))).toBe('silver');
    expect(medalOf(milestoneOf({ kind: 'half', scope: 'all' }))).toBe('silver');
    expect(medalOf(milestoneOf({ kind: 'full', scope: 'bug' }))).toBe('gold');
    expect(medalOf(milestoneOf({ kind: 'full', scope: 'all' }))).toBe('rainbow');
  });

  test('a category shows its own critter; all of them shows one of each', () => {
    const icons = (/** @type {string} */ scope) => milestoneIcons(milestoneOf({ kind: 'half', scope }));
    expect(icons('bug')).toHaveLength(1);
    expect(new Set([...icons('fish'), ...icons('bug'), ...icons('sea')])).toEqual(new Set(icons('all')));
    expect(new Set(icons('all')).size).toBe(3);
  });
});
