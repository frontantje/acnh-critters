import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { clock } from './clock.svelte.js';
import { critters, isAvailableIn } from './critters.js';
import { setLocale } from './i18n.svelte.js';
import {
  awardTrophies,
  catchFromList,
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
const all = critters.map((critter) => critter.id);
const fish = critters.filter((critter) => critter.type === 'fish').map((critter) => critter.id);
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
  party.milestone = null;
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

  test('everything reaches all of them, biggest first', () => {
    expect(reached(all)).toEqual([
      'full-all',
      'full-fish', 'full-bug', 'full-sea',
      'half-all',
      'half-fish', 'half-bug', 'half-sea',
      'month-all-2026-10',
      'month-fish-2026-10', 'month-bug-2026-10', 'month-sea-2026-10',
    ]);
  });
});

describe('catchFromList', () => {
  test('a catch from the list that reaches a milestone celebrates it and earns its trophy', () => {
    oneBugToGo();
    expect(party.milestone).toBeNull();

    expect(catchFromList(lastBug)).toBe(true);
    expect(party.milestone).toEqual({ kind: 'month', scope: 'bug', year: 2026, month: 10, size: 1 });
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
    expect(party.milestone).toBeNull();
    expect(progress.trophies).toEqual([]);
  });

  test('after a correction, reaching it again celebrates again, without a second trophy', () => {
    oneBugToGo();
    catchFromList(lastBug);
    party.milestone = null;

    clock.now = new Date(2026, 9, 16, 12);
    unmarkCaught(lastBug);
    catchFromList(lastBug);
    expect(party.milestone).toMatchObject({ kind: 'month', scope: 'bug' });
    expect(progress.trophies).toEqual([octoberBugs]);
  });

  test('of several reached at once, the biggest shows and all are earned', () => {
    const last = inMonth('fish')[0];
    load(all.filter((id) => id !== last));
    catchFromList(last);
    expect(party.milestone).toMatchObject({ kind: 'full', scope: 'all', size: 5 });
    expect(earned()).toEqual(['full-all', 'full-fish', 'month-all-2026-10', 'month-fish-2026-10']);
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
    expect(party.milestone).toBeNull();
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

  test('a category shows its own critter; all of them shows one of each', () => {
    const icons = (/** @type {string} */ scope) => milestoneIcons(milestoneOf({ kind: 'half', scope }));
    expect(icons('bug')).toHaveLength(1);
    expect(new Set([...icons('fish'), ...icons('bug'), ...icons('sea')])).toEqual(new Set(icons('all')));
    expect(new Set(icons('all')).size).toBe(3);
  });
});
