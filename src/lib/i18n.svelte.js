// The UI language. Follows the browser's language until the player picks one
// in the menu; that choice is kept in localStorage (separately from progress,
// so importing an export never switches the language).

import { germanTerms, messages } from './messages.js';

/** @typedef {'en' | 'de'} Locale */
/** @typedef {keyof typeof messages.en} MessageKey */

const STORAGE_KEY = 'acnh-critters-locale';

/** @type {{ id: Locale, label: string }[]} */
export const LOCALES = [
  { id: 'en', label: 'English' },
  { id: 'de', label: 'Deutsch' },
];

export const i18n = $state({ locale: storedLocale() ?? pickLocale(browserLanguages()) });
document.documentElement.lang = i18n.locale;

/** @param {Locale} locale */
export function setLocale(locale) {
  i18n.locale = locale;
  document.documentElement.lang = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Storage unavailable; the choice just won't be remembered.
  }
}

/**
 * The current language's text for a message, with {placeholders} filled in.
 * @param {MessageKey} key
 * @param {Record<string, string>} [values]
 */
export function t(key, values = {}) {
  return messages[i18n.locale][key].replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');
}

/**
 * Translates a location, shadow size or speed value from the critter data.
 * @param {string} english
 */
export function term(english) {
  return i18n.locale === 'de' ? (germanTerms[english] ?? english) : english;
}

/** @returns {Locale | null} */
function storedLocale() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isLocale(stored) ? stored : null;
  } catch {
    return null;
  }
}

/**
 * The first supported language in a preference list like navigator.languages,
 * e.g. ['fr-FR', 'de-DE'] -> 'de'. Falls back to English.
 * @param {readonly (string | undefined)[]} tags
 * @returns {Locale}
 */
export function pickLocale(tags) {
  for (const tag of tags) {
    const base = tag?.toLowerCase().split('-')[0];
    if (isLocale(base)) return base;
  }
  return 'en';
}

function browserLanguages() {
  return navigator.languages?.length ? navigator.languages : [navigator.language];
}

/**
 * @param {unknown} value
 * @returns {value is Locale}
 */
function isLocale(value) {
  return LOCALES.some((locale) => locale.id === value);
}
