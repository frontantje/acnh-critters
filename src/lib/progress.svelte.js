import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import { CATEGORIES, critters } from './critters.js';
import { guessHemisphere } from './hemisphere.js';
import { browserLocale, i18n, isLocale, LOCALES, setLocale, t } from './i18n.svelte.js';
import { decodeTransferCode, encodeTransferCode, findTransferCode, normalizeName } from './transfer.js';

/** @typedef {import('./critters.js').Hemisphere} Hemisphere */
/** @typedef {import('./i18n.svelte.js').Locale} Locale */
/** @typedef {import('./transfer.js').ExportData} ExportData */
/** @typedef {{ id: number, name: string, avatar: string | null }} Profile */
/**
 * @typedef {{
 *   hemisphere: Hemisphere, trackDonations: boolean, showCaught: boolean, name: string, avatar: string | null,
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

export const progress = $state({
  hemisphere: /** @type {Hemisphere} */ ('north'),
  trackDonations: false,
  showCaught: false,
  name: '',
  avatar: /** @type {string | null} */ (null),
  /** null to follow the browser's language. */
  locale: /** @type {Locale | null} */ (null),
  caught: /** @type {SvelteSet<string>} */ (new SvelteSet()),
  donated: /** @type {SvelteSet<string>} */ (new SvelteSet()),
  synced: /** @type {SvelteSet<string>} */ (new SvelteSet()),
});

/** Every profile is kept in memory too, so the app still works when storage is blocked. */
const store = /** @type {SvelteMap<number, Saved>} */ (new SvelteMap());

class Profiles {
  /** null for a new profile that isn't saved yet. */
  active = $state(/** @type {number | null} */ (null));

  /**
   * A getter, since $derived would go stale when read outside components (e.g. in restore()).
   * @returns {Profile[]}
   */
  get list() {
    return [...store].sort(([a], [b]) => a - b).map(([id, saved]) => ({ id, name: saved.name, avatar: saved.avatar }));
  }
}

export const profiles = new Profiles();

let previous = $state(/** @type {number | null} */ (null));

window.addEventListener('storage', onStorage);

export function restore() {
  store.clear();
  for (const id of savedIds()) load(id, readStorage(storageKey(id)));
  const oldLocale = moveOldLocale();
  const last = Number(readStorage(ACTIVE_KEY));
  if (store.has(last)) show(last);
  else showFirst(oldLocale);
}

export function save() {
  const id = profiles.active ?? nextId();
  write(id, snapshot());
  if (profiles.active !== id) {
    profiles.active = id;
    rememberActive();
  }
}

/**
 * Not saved until its welcome screen is left, so closing the app there leaves no empty profile.
 * @param {string} name
 * @param {string | null} [avatar]
 */
export function addProfile(name, avatar = null) {
  if (!nameAllowed(name, null) || !avatarAllowed(avatar, null)) return false;
  previous = profiles.active;
  // Children sharing a tablet usually share the hemisphere and language too.
  startNew(progress.hemisphere, progress.locale);
  progress.name = normalizeName(name);
  progress.avatar = avatar;
  return true;
}

export function previousProfile() {
  if (profiles.active !== null) return undefined;
  const { list } = profiles;
  return list.find(({ id }) => id === previous) ?? list[0];
}

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

export function deleteProfile() {
  if (profiles.active === null) return;
  store.delete(profiles.active);
  removeStorage(storageKey(profiles.active));
  showFirst();
  rememberActive();
}

export function activeProfile() {
  return profiles.list.find(({ id }) => id === profiles.active);
}

/** @param {Pick<Profile, 'id' | 'name'>} profile */
export function profileName(profile) {
  return profile.name || t('profileNumbered', { number: String(profile.id) });
}

/**
 * @param {string} name
 * @param {number | null} [id] null for a new one
 */
export function nameAllowed(name, id = profiles.active) {
  return (id !== null || !!normalizeName(name)) && !takenName(name, id);
}

/**
 * @param {string} name
 * @param {number | null} [id] null for a new one
 */
export function takenName(name, id = profiles.active) {
  const normalized = normalizeName(name);
  if (!normalized && id === null) return null;
  // A new profile's number doesn't matter, since it has a name.
  const profile = { id: id ?? 0, name: normalized };
  const others = new Set(profiles.list.filter((other) => other.id !== id).flatMap(labels));
  return labels(profile).some((label) => others.has(label)) ? profileName(profile) : null;
}

/**
 * No two profiles share a picture, so kids who can't read yet can still find their own.
 * @param {string | null} avatar
 * @param {number | null} [id] null for a new one
 */
export function avatarAllowed(avatar, id = profiles.active) {
  return avatar === null || (KNOWN_IDS.has(avatar) && !profiles.list.some((other) => other.id !== id && other.avatar === avatar));
}

/** @param {string | null} avatar */
export function setAvatar(avatar) {
  if (!avatarAllowed(avatar)) return false;
  progress.avatar = avatar;
  if (profiles.active !== null) save();
  return true;
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

/** @param {string} name */
export function setName(name) {
  if (!nameAllowed(name)) return false;
  progress.name = normalizeName(name);
  // A new profile is only saved once its welcome screen is left.
  if (profiles.active !== null) save();
  return true;
}

/**
 * Uses the language shown, even one from the browser, so it carries over to the other device.
 * @returns {ExportData}
 */
export function exportData() {
  const data = toJSON(snapshot());
  return { ...data, settings: { ...data.settings, locale: i18n.locale } };
}

/** @param {string} [name] */
export function transferCode(name = progress.name) {
  const data = exportData();
  return encodeTransferCode({ ...data, settings: { ...data.settings, name } });
}

/**
 * Also takes the storage JSON, which older versions exported.
 * @param {string} text
 */
export function importProgress(text) {
  const saved = parse(text);
  apply({
    ...saved,
    name: progress.name || (takenName(saved.name) ? '' : saved.name),
    avatar: progress.avatar ?? (avatarAllowed(saved.avatar) ? saved.avatar : null),
    locale: saved.locale ?? progress.locale,
  });
  save();
}

/** @param {number} id */
const storageKey = (id) => (id === 1 ? STORAGE_KEY : `${STORAGE_KEY}-${id}`);

/**
 * Returns 0 for other keys and odd spellings like "acnh-critters-02", so each profile has one key.
 * @param {string} key
 */
function profileId(key) {
  const prefix = `${STORAGE_KEY}-`;
  const id = key === STORAGE_KEY ? 1 : key.startsWith(prefix) ? Number(key.slice(prefix.length)) : 0;
  return Number.isInteger(id) && id > 0 && storageKey(id) === key ? id : 0;
}

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

/** Counts profiles in storage too, even unreadable ones, so a new one never overwrites one. */
function nextId() {
  return Math.max(0, ...store.keys(), ...savedIds()) + 1;
}

/**
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

/** @param {Locale | null} [locale] */
function showFirst(locale = null) {
  const first = profiles.list[0];
  if (first) show(first.id);
  else startNew(guessHemisphere(), locale);
}

/**
 * Without a name, "Profile 2" in every language, so a name can't clash in either.
 * @param {Pick<Profile, 'id' | 'name'>} profile
 */
function labels(profile) {
  const names = profile.name
    ? [profile.name]
    : LOCALES.map(({ id }) => t('profileNumbered', { number: String(profile.id) }, id));
  return names.map((name) => name.toLocaleLowerCase());
}

/**
 * @param {Hemisphere} hemisphere
 * @param {Locale | null} locale
 */
function startNew(hemisphere, locale) {
  apply({ hemisphere, trackDonations: false, showCaught: false, name: '', avatar: null, locale, caught: [], donated: [], synced: [] });
  profiles.active = null;
}

/** So the next start opens the profile shown. */
function rememberActive() {
  if (profiles.active === null) removeStorage(ACTIVE_KEY);
  else writeStorage(ACTIVE_KEY, String(profiles.active));
}

/** Keeps the old key until profile 1 has the language, so a failed save can't lose it. */
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
 * Takes over other tabs' changes, so tabs don't undo each other's work.
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
 * @returns {boolean}
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
    avatar: progress.avatar,
    locale: progress.locale,
    caught: [...progress.caught],
    donated: [...progress.donated],
    synced: [...progress.synced],
  };
}

/** @param {Saved} saved */
function toJSON(saved) {
  return {
    version: FORMAT_VERSION,
    settings: {
      hemisphere: saved.hemisphere,
      trackDonations: saved.trackDonations,
      showCaught: saved.showCaught,
      name: saved.name,
      ...(saved.avatar ? { avatar: saved.avatar } : {}),
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
    avatar: KNOWN_IDS.has(settings.avatar) ? settings.avatar : null,
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
  progress.avatar = saved.avatar;
  progress.locale = saved.locale;
  progress.caught = new SvelteSet(saved.caught);
  progress.donated = new SvelteSet(saved.donated);
  progress.synced = new SvelteSet(saved.synced);
  setLocale(saved.locale ?? browserLocale());
}
