// The player's progress: settings, caught and donated critters, and which
// categories have been through a Critterpedia Sync. A device can hold several
// profiles (e.g. one per child), each with its own progress. They're kept in
// localStorage: profile 1 under "acnh-critters" (where the progress was before
// there were profiles), the others under "acnh-critters-2", "acnh-critters-3"
// and so on, each in this format:
//
//   { "version": 1,
//     "settings": { "hemisphere": "north", "trackDonations": false, "showCaught": false, "name": "", "locale": "de" },
//     "caught": ["bitterling", ...], "donated": ["bitterling", ...], "synced": ["fish", ...] }
//
// "name" is the profile's name, which also goes into its exports. "locale" is
// the language picked in the menu (or by an import); it's missing while the
// profile follows the browser's language. "acnh-critters-active" holds the
// number of the profile switched to last.
//
// The app works on a copy of every profile in memory and saves each change to
// localStorage. So it keeps working when storage is unavailable (e.g. blocked
// site data), just without remembering anything. Changes made in other tabs
// or windows arrive as "storage" events and update the copy.
//
// Exports are transfer codes (see transfer.js) holding one profile, plus the
// language shown. Import also still accepts the JSON above, e.g. from older
// export files.

import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import { CATEGORIES, critters } from './critters.js';
import { guessHemisphere } from './hemisphere.js';
import { browserLocale, i18n, isLocale, LOCALES, setLocale, t } from './i18n.svelte.js';
import { decodeTransferCode, encodeTransferCode, findTransferCode, normalizeName } from './transfer.js';

/** @typedef {import('./critters.js').Hemisphere} Hemisphere */
/** @typedef {import('./i18n.svelte.js').Locale} Locale */
/** @typedef {import('./transfer.js').ExportData} ExportData */
/** @typedef {{ id: number, name: string }} Profile */
/**
 * A profile's progress, checked and with defaults filled in.
 * @typedef {{
 *   hemisphere: Hemisphere, trackDonations: boolean, showCaught: boolean, name: string,
 *   locale: Locale | null, caught: string[], donated: string[], synced: string[],
 * }} Saved
 */

const STORAGE_KEY = 'acnh-critters';
const ACTIVE_KEY = `${STORAGE_KEY}-active`;
// Where version 1.0.0 kept the language, before it moved into the profile.
const OLD_LOCALE_KEY = `${STORAGE_KEY}-locale`;
const FORMAT_VERSION = 1;
const KNOWN_IDS = new Set(critters.map((critter) => critter.id));
const KNOWN_CATEGORIES = new Set(CATEGORIES.map((category) => category.id));

/** The profile shown. */
export const progress = $state({
  hemisphere: /** @type {Hemisphere} */ ('north'),
  trackDonations: false,
  showCaught: false,
  name: '',
  /** The language picked in the menu or by an import, or null to follow the browser. */
  locale: /** @type {Locale | null} */ (null),
  caught: /** @type {SvelteSet<string>} */ (new SvelteSet()),
  donated: /** @type {SvelteSet<string>} */ (new SvelteSet()),
  synced: /** @type {SvelteSet<string>} */ (new SvelteSet()),
});

/** Every saved profile's progress, by number. */
const store = /** @type {SvelteMap<number, Saved>} */ (new SvelteMap());

class Profiles {
  /**
   * The number of the profile shown, or null for a new one that hasn't been
   * saved yet (on its welcome screen). It gets a number when it's first saved.
   */
  active = $state(/** @type {number | null} */ (null));

  /**
   * The saved profiles, by number. A getter rather than $derived, which would
   * keep a stale list when read outside components (e.g. in restore()).
   * @returns {Profile[]}
   */
  get list() {
    return [...store].sort(([a], [b]) => a - b).map(([id, saved]) => ({ id, name: saved.name }));
  }
}

export const profiles = new Profiles();

/** The profile shown before a new one was added. */
let previous = $state(/** @type {number | null} */ (null));

window.addEventListener('storage', onStorage);

/**
 * Loads the saved profiles and shows the one switched to last. Without any
 * (e.g. on the first visit), a new profile is started, with the hemisphere
 * guessed from the time zone.
 */
export function restore() {
  store.clear();
  for (const id of savedIds()) load(id, readStorage(storageKey(id)));
  const oldLocale = moveOldLocale();
  const last = Number(readStorage(ACTIVE_KEY));
  if (store.has(last)) show(last);
  else showFirst(oldLocale);
}

/** Saves the profile shown, giving it a number if it's new. */
export function save() {
  const id = profiles.active ?? nextId();
  write(id, snapshot());
  if (profiles.active !== id) {
    profiles.active = id;
    rememberActive();
  }
}

/**
 * Starts a new profile and shows it, unless the name isn't allowed (see
 * nameAllowed). Returns whether it was started. It's saved once its welcome
 * screen is left, so closing the app before that leaves no empty profile
 * behind. It starts with the hemisphere and language of the profile shown so
 * far, since children sharing a tablet usually share those too.
 * @param {string} name
 */
export function addProfile(name) {
  if (!nameAllowed(name, null)) return false;
  previous = profiles.active;
  startNew(progress.hemisphere, progress.locale);
  progress.name = normalizeName(name);
  return true;
}

/**
 * While a new profile isn't saved yet, the saved one to go back to: the one
 * shown before it was added (or the first one, if that's gone since).
 */
export function previousProfile() {
  if (profiles.active !== null) return undefined;
  const { list } = profiles;
  return list.find(({ id }) => id === previous) ?? list[0];
}

/** Leaves a new profile that isn't saved yet, for the one from previousProfile(). */
export function cancelNewProfile() {
  const back = previousProfile();
  if (back) switchProfile(back.id);
}

/** @param {number} id */
export function switchProfile(id) {
  if (id === profiles.active || !store.has(id)) return;
  show(id);
  rememberActive();
}

/**
 * Deletes the profile shown and shows the first one left. After the last one,
 * a new profile is started, as on a first visit.
 */
export function deleteProfile() {
  if (profiles.active === null) return;
  store.delete(profiles.active);
  removeStorage(storageKey(profiles.active));
  showFirst();
  rememberActive();
}

/** The saved profile shown, if it has been saved. */
export function activeProfile() {
  return profiles.list.find(({ id }) => id === profiles.active);
}

/**
 * A profile's name, or "Profile 2" and so on for one without.
 * @param {Profile} profile
 */
export function profileName(profile) {
  return profile.name || t('profileNumbered', { number: String(profile.id) });
}

/**
 * Whether a profile may be given a name: a new one needs one, and no two
 * profiles share one.
 * @param {string} name
 * @param {number | null} [id] the profile to be named, or null for a new one
 */
export function nameAllowed(name, id = profiles.active) {
  return (id !== null || !!normalizeName(name)) && !takenName(name, id);
}

/**
 * If another profile already goes by a name (ignoring case), the name as the
 * menu would show it; otherwise null. An empty name stands for the
 * "Profile 2" the profile would be called instead.
 * @param {string} name
 * @param {number | null} [id] the profile to be named, or null for a new one
 */
export function takenName(name, id = profiles.active) {
  const normalized = normalizeName(name);
  if (!normalized && id === null) return null;
  // A new profile's number doesn't matter: it has a name.
  const profile = { id: id ?? 0, name: normalized };
  const others = new Set(profiles.list.filter((other) => other.id !== id).flatMap(labels));
  return labels(profile).some((label) => others.has(label)) ? profileName(profile) : null;
}

/** @param {string} value */
export function setHemisphere(value) {
  progress.hemisphere = value === 'south' ? 'south' : 'north';
  save();
}

/** @param {Locale} locale */
export function chooseLocale(locale) {
  progress.locale = locale;
  setLocale(locale);
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
 * Names the profile shown (trimmed, at most 20 characters), unless the name
 * isn't allowed (see nameAllowed). Returns whether it was. A new profile on its
 * welcome screen isn't saved by this; leaving the welcome screen saves it.
 * @param {string} name
 */
export function setName(name) {
  if (!nameAllowed(name)) return false;
  progress.name = normalizeName(name);
  if (profiles.active !== null) save();
  return true;
}

/**
 * Everything for moving to another device: the profile's progress plus the
 * language shown right now, whether it was picked in the menu or came from the
 * browser. (Importing applies it as if picked in the menu.)
 * @returns {ExportData}
 */
export function exportData() {
  const data = toJSON(snapshot());
  return { ...data, settings: { ...data.settings, locale: i18n.locale } };
}

/**
 * The export as a transfer code.
 * @param {string} [name] name to put in the code instead of the profile's
 */
export function transferCode(name = progress.name) {
  const data = exportData();
  return encodeTransferCode({ ...data, settings: { ...data.settings, name } });
}

/**
 * Replaces the progress of the profile shown with an export: a transfer code,
 * text containing one (e.g. a pasted message or a downloaded file), or the
 * JSON format. Throws an Error with a user-facing message if it isn't valid.
 * @param {string} text
 */
export function importProgress(text) {
  const saved = parse(text);
  apply({
    ...saved,
    // A profile keeps its own name. The export's only names one without, and
    // only if no other profile goes by it.
    name: progress.name || (takenName(saved.name) ? '' : saved.name),
    // An export without a language keeps the profile's.
    locale: saved.locale ?? progress.locale,
  });
  save();
}

/** @param {number} id */
const storageKey = (id) => (id === 1 ? STORAGE_KEY : `${STORAGE_KEY}-${id}`);

/**
 * The profile a storage key belongs to, or 0 for other keys, including odd
 * spellings such as "acnh-critters-02".
 * @param {string} key
 */
function profileId(key) {
  const prefix = `${STORAGE_KEY}-`;
  const id = key === STORAGE_KEY ? 1 : key.startsWith(prefix) ? Number(key.slice(prefix.length)) : 0;
  return Number.isInteger(id) && id > 0 && storageKey(id) === key ? id : 0;
}

/** The numbers of the profiles in storage, readable or not, in order. */
function savedIds() {
  const ids = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const id = profileId(localStorage.key(i) ?? '');
      if (id) ids.push(id);
    }
  } catch {
    // Storage unavailable.
  }
  return ids.sort((a, b) => a - b);
}

/**
 * One more than the highest number in use, here or in storage. Profiles that
 * can't be read (damaged, or saved by a newer version) count too, so a new
 * profile never overwrites one.
 */
function nextId() {
  return Math.max(0, ...store.keys(), ...savedIds()) + 1;
}

/**
 * Takes a profile's saved text into memory, or drops the profile if there is
 * none or it's unreadable.
 * @param {number} id
 * @param {string | null} text
 */
function load(id, text) {
  if (text !== null) {
    try {
      store.set(id, parse(text));
      return;
    } catch (error) {
      console.error(`Ignoring unreadable saved progress (profile ${id}):`, error);
    }
  }
  store.delete(id);
}

/**
 * Keeps a profile's progress and saves it to storage. Returns false if that
 * failed; it's still kept in memory then.
 * @param {number} id
 * @param {Saved} saved
 */
function write(id, saved) {
  store.set(id, saved);
  return writeStorage(storageKey(id), JSON.stringify(toJSON(saved)));
}

/** @param {number} id */
function show(id) {
  apply(/** @type {Saved} */ (store.get(id)));
  profiles.active = id;
}

/**
 * Shows the first saved profile, or starts a new one if there is none.
 * @param {Locale | null} [locale] the new one's language
 */
function showFirst(locale = null) {
  const first = profiles.list[0];
  if (first) show(first.id);
  else startNew(guessHemisphere(), locale);
}

/**
 * What a profile goes by, in lower case: its name, or without one its
 * "Profile 2" in every language, so that no name clashes in either.
 * @param {Profile} profile
 */
function labels(profile) {
  const names = profile.name
    ? [profile.name]
    : LOCALES.map(({ id }) => t('profileNumbered', { number: String(profile.id) }, id));
  return names.map((name) => name.toLocaleLowerCase());
}

/**
 * Shows an empty profile, not saved yet.
 * @param {Hemisphere} hemisphere
 * @param {Locale | null} locale
 */
function startNew(hemisphere, locale) {
  apply({ hemisphere, trackDonations: false, showCaught: false, name: '', locale, caught: [], donated: [], synced: [] });
  profiles.active = null;
}

/** So the next start opens the profile shown. */
function rememberActive() {
  if (profiles.active === null) removeStorage(ACTIVE_KEY);
  else writeStorage(ACTIVE_KEY, String(profiles.active));
}

/**
 * Moves a language picked in version 1.0.0, which kept it outside the
 * progress, into profile 1. The old key is only removed once that's saved.
 * Returns the language if there's no profile 1 to take it, for the new
 * profile started in its place.
 */
function moveOldLocale() {
  const old = readStorage(OLD_LOCALE_KEY);
  if (old === null) return null;
  if (!isLocale(old)) {
    removeStorage(OLD_LOCALE_KEY);
    return null;
  }
  const first = store.get(1);
  if (!first) return old;
  if (first.locale || write(1, { ...first, locale: old })) removeStorage(OLD_LOCALE_KEY);
  return null;
}

/**
 * Takes over changes another tab or window made: added, changed and deleted
 * profiles, or all of them cleared. If the profile shown was deleted there,
 * the first one left is shown, as after deleting it here.
 * @param {StorageEvent} event
 */
function onStorage(event) {
  if (event.storageArea !== localStorage) return;
  const id = event.key === null ? null : profileId(event.key);
  if (id === 0) return;
  if (id === null) store.clear();
  else load(id, event.newValue);
  if (profiles.active === null || (id !== null && id !== profiles.active)) return;
  const shown = store.get(profiles.active);
  if (shown) apply(shown);
  else showFirst();
}

/** @param {string} key */
function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * @param {string} key
 * @param {string} value
 * @returns {boolean} false if storage is unavailable (e.g. in some private browsing modes) or full
 */
function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`Could not save ${key}:`, error);
    return false;
  }
}

/** @param {string} key */
function removeStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage unavailable.
  }
}

/** @returns {Saved} */
function snapshot() {
  return {
    hemisphere: progress.hemisphere,
    trackDonations: progress.trackDonations,
    showCaught: progress.showCaught,
    name: progress.name,
    locale: progress.locale,
    caught: [...progress.caught],
    donated: [...progress.donated],
    synced: [...progress.synced],
  };
}

/**
 * The storage format described at the top.
 * @param {Saved} saved
 */
function toJSON(saved) {
  return {
    version: FORMAT_VERSION,
    settings: {
      hemisphere: saved.hemisphere,
      trackDonations: saved.trackDonations,
      showCaught: saved.showCaught,
      name: saved.name,
      ...(saved.locale ? { locale: saved.locale } : {}),
    },
    caught: saved.caught,
    donated: saved.donated,
    synced: saved.synced,
  };
}

/**
 * @param {string} text
 * @returns {Saved}
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

/** @param {Saved} saved */
function apply(saved) {
  progress.hemisphere = saved.hemisphere;
  progress.trackDonations = saved.trackDonations;
  progress.showCaught = saved.showCaught;
  progress.name = saved.name;
  progress.locale = saved.locale;
  progress.caught = new SvelteSet(saved.caught);
  progress.donated = new SvelteSet(saved.donated);
  progress.synced = new SvelteSet(saved.synced);
  setLocale(saved.locale ?? browserLocale());
}
