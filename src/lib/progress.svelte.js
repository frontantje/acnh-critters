// The player's progress: settings, caught and donated critters, and which
// categories have been through a Critterpedia Sync. Kept in localStorage under
// "acnh-critters" in this format:
//
//   { "version": 1,
//     "settings": { "hemisphere": "north", "trackDonations": false, "showCaught": false, "name": "" },
//     "caught": ["bitterling", ...], "donated": ["bitterling", ...], "synced": ["fish", ...] }
//
// "name" is the name given when exporting (or carried by an imported code).
// Exports are transfer codes (see transfer.js) holding all of this plus the
// language picked in the menu, which is stored separately (see i18n.svelte.js).
// Import also still accepts the JSON above, e.g. from older export files.

import { SvelteSet } from 'svelte/reactivity';
import { CATEGORIES, critters } from './critters.js';
import { guessHemisphere } from './hemisphere.js';
import { chosenLocale, isLocale, setLocale, t } from './i18n.svelte.js';
import { decodeTransferCode, encodeTransferCode, findTransferCode, normalizeName } from './transfer.js';

/** @typedef {import('./critters.js').Hemisphere} Hemisphere */
/** @typedef {import('./i18n.svelte.js').Locale} Locale */
/** @typedef {import('./transfer.js').ExportData} ExportData */

const STORAGE_KEY = 'acnh-critters';
const FORMAT_VERSION = 1;
const KNOWN_IDS = new Set(critters.map((critter) => critter.id));
const KNOWN_CATEGORIES = new Set(CATEGORIES.map((category) => category.id));

export const progress = $state({
  hemisphere: /** @type {Hemisphere} */ ('north'),
  trackDonations: false,
  showCaught: false,
  name: '',
  caught: /** @type {SvelteSet<string>} */ (new SvelteSet()),
  donated: /** @type {SvelteSet<string>} */ (new SvelteSet()),
  synced: /** @type {SvelteSet<string>} */ (new SvelteSet()),
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

/** @param {string} id */
export function markCaught(id) {
  progress.caught.add(id);
  save();
}

/** @param {string} category */
export function markSynced(category) {
  progress.synced.add(category);
  save();
}

/**
 * Remembers the name used for an export (trimmed, at most 20 characters).
 * @param {string} name
 */
export function setName(name) {
  progress.name = normalizeName(name);
  save();
}

/**
 * Everything saved in this browser, for moving to another device: the progress
 * plus the language picked in the menu, if any.
 * @returns {ExportData}
 */
export function exportData() {
  const data = serialize();
  const locale = chosenLocale();
  return locale ? { ...data, settings: { ...data.settings, locale } } : data;
}

/**
 * The export as a transfer code.
 * @param {string} [name] name to put in the code instead of the saved one
 */
export function transferCode(name = progress.name) {
  const data = exportData();
  return encodeTransferCode({ ...data, settings: { ...data.settings, name } });
}

/**
 * Replaces the current progress with an export: a transfer code, text
 * containing one (e.g. a pasted message or a downloaded file), or the JSON
 * format. Throws an Error with a user-facing message if it isn't valid.
 * @param {string} text
 */
export function importProgress(text) {
  apply(parse(text));
  save();
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
      name: progress.name,
    },
    caught: [...progress.caught],
    donated: [...progress.donated],
    synced: [...progress.synced],
  };
}

/**
 * @param {string} text
 * @returns {{
 *   hemisphere: Hemisphere, trackDonations: boolean, showCaught: boolean, name: string,
 *   locale: Locale | null, caught: string[], donated: string[], synced: string[],
 * }}
 */
function parse(text) {
  const code = text.trim().startsWith('{') ? null : findTransferCode(text);
  let data;
  try {
    data = code ? decodeTransferCode(code) : JSON.parse(text);
  } catch {
    throw new Error(t('importInvalid'));
  }
  if (typeof data !== 'object' || data === null || !Array.isArray(data.caught)) {
    throw new Error(t('importInvalid'));
  }
  if (data.version > FORMAT_VERSION) {
    throw new Error(t('importTooNew'));
  }

  // Drops anything unknown, e.g. from a hand-edited file.
  /**
   * @param {unknown} list
   * @param {Set<string>} known
   */
  const only = (list, known) => (Array.isArray(list) ? list.filter((id) => known.has(id)) : []);
  const settings = data.settings ?? {};
  return {
    hemisphere: settings.hemisphere === 'south' ? 'south' : 'north',
    trackDonations: settings.trackDonations === true,
    showCaught: settings.showCaught === true,
    name: normalizeName(settings.name),
    locale: isLocale(settings.locale) ? settings.locale : null,
    caught: only(data.caught, KNOWN_IDS),
    donated: only(data.donated, KNOWN_IDS),
    synced: only(data.synced, KNOWN_CATEGORIES),
  };
}

/** @param {ReturnType<typeof parse>} saved */
function apply(saved) {
  progress.hemisphere = saved.hemisphere;
  progress.trackDonations = saved.trackDonations;
  progress.showCaught = saved.showCaught;
  progress.name = saved.name;
  progress.caught = new SvelteSet(saved.caught);
  progress.donated = new SvelteSet(saved.donated);
  progress.synced = new SvelteSet(saved.synced);
  // Only exports carry a language; the saved progress never does.
  if (saved.locale) setLocale(saved.locale);
}
