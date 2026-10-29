// The player's progress: settings plus caught and donated critters. Kept in
// localStorage and exportable as a JSON file to move between devices. Both use
// the same format:
//
//   { "version": 1,
//     "settings": { "hemisphere": "north", "trackDonations": false, "showCaught": false },
//     "caught": ["bitterling", ...], "donated": ["bitterling", ...] }

import { SvelteSet } from 'svelte/reactivity';
import { critters } from './critters.js';
import { guessHemisphere } from './hemisphere.js';

/** @typedef {import('./critters.js').Hemisphere} Hemisphere */

const STORAGE_KEY = 'acnh-critters';
const FORMAT_VERSION = 1;
const KNOWN_IDS = new Set(critters.map((critter) => critter.id));

export const progress = $state({
  hemisphere: /** @type {Hemisphere} */ ('north'),
  trackDonations: false,
  showCaught: false,
  caught: /** @type {SvelteSet<string>} */ (new SvelteSet()),
  donated: /** @type {SvelteSet<string>} */ (new SvelteSet()),
});

/**
 * Loads saved progress. Returns false if there is none (e.g. on the first
 * visit), in which case the hemisphere is guessed from the time zone.
 */
export function restore() {
  const text = readStorage();
  if (text !== null) {
    try {
      apply(parse(text));
      return true;
    } catch (error) {
      console.error('Ignoring unreadable saved progress:', error);
    }
  }
  progress.hemisphere = guessHemisphere();
  return false;
}

export function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialize()));
  } catch (error) {
    // Storage can be unavailable, e.g. in some private browsing modes.
    console.error('Could not save progress:', error);
  }
}

/** @param {string} value */
export function setHemisphere(value) {
  progress.hemisphere = value === 'south' ? 'south' : 'north';
  save();
}

export function toggleShowCaught() {
  progress.showCaught = !progress.showCaught;
  save();
}

/** @param {string} id */
export function toggleCaught(id) {
  if (progress.caught.has(id)) {
    progress.caught.delete(id);
    // A critter can't be donated without being caught.
    progress.donated.delete(id);
  } else {
    progress.caught.add(id);
  }
  save();
}

/**
 * Replaces the current progress with an exported file's contents.
 * Throws an Error with a user-facing message if the file isn't valid.
 * @param {string} text
 */
export function importProgress(text) {
  apply(parse(text));
  save();
}

/** Downloads the current progress as a JSON file. */
export function exportProgress() {
  const blob = new Blob([JSON.stringify(serialize(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `acnh-critters-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function readStorage() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function serialize() {
  return {
    version: FORMAT_VERSION,
    settings: {
      hemisphere: progress.hemisphere,
      trackDonations: progress.trackDonations,
      showCaught: progress.showCaught,
    },
    caught: [...progress.caught],
    donated: [...progress.donated],
  };
}

/**
 * @param {string} text
 * @returns {{
 *   hemisphere: Hemisphere, trackDonations: boolean, showCaught: boolean,
 *   caught: string[], donated: string[],
 * }}
 */
function parse(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("This file isn't an ACNH Critters export.");
  }
  if (typeof data !== 'object' || data === null || !Array.isArray(data.caught)) {
    throw new Error("This file isn't an ACNH Critters export.");
  }
  if (data.version > FORMAT_VERSION) {
    throw new Error('This file was exported from a newer version of the app.');
  }

  // Drops anything that isn't a known critter id, e.g. from a hand-edited file.
  /** @param {unknown} list */
  const knownIds = (list) => (Array.isArray(list) ? list.filter((id) => KNOWN_IDS.has(id)) : []);
  const settings = data.settings ?? {};
  return {
    hemisphere: settings.hemisphere === 'south' ? 'south' : 'north',
    trackDonations: settings.trackDonations === true,
    showCaught: settings.showCaught === true,
    caught: knownIds(data.caught),
    donated: knownIds(data.donated),
  };
}

/** @param {ReturnType<typeof parse>} saved */
function apply(saved) {
  progress.hemisphere = saved.hemisphere;
  progress.trackDonations = saved.trackDonations;
  progress.showCaught = saved.showCaught;
  progress.caught = new SvelteSet(saved.caught);
  progress.donated = new SvelteSet(saved.donated);
}
