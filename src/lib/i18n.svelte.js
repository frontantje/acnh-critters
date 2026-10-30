// The UI language. Each profile follows the browser's language until one is
// picked in the menu; the profile keeps that choice (see progress.svelte.js).
// Exports carry the language shown, and importing one applies it as if it had
// been picked in the menu.

import { germanTerms, messages } from './messages.js';

/** @typedef {'en' | 'de'} Locale */
/** @typedef {keyof typeof messages.en} MessageKey */

/** @type {{ id: Locale, label: string }[]} */
export const LOCALES = [
  { id: 'en', label: 'English' },
  { id: 'de', label: 'Deutsch' },
];

export const i18n = $state({ locale: browserLocale() });
document.documentElement.lang = i18n.locale;

/**
 * Shows the app in a language.
 * @param {Locale} locale
 */
export function setLocale(locale) {
  i18n.locale = locale;
  document.documentElement.lang = locale;
}

/**
 * The current (or another) language's text for a message, with {placeholders}
 * filled in.
 * @param {MessageKey} key
 * @param {Record<string, string>} [values]
 * @param {Locale} [locale]
 */
export function t(key, values = {}, locale = i18n.locale) {
  return messages[locale][key].replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');
}

/**
 * Translates a location, shadow size or speed value from the critter data.
 * @param {string} english
 */
export function term(english) {
  return i18n.locale === 'de' ? (germanTerms[english] ?? english) : english;
}

/**
 * The first supported language in the browser's list, or English.
 * @returns {Locale}
 */
export function browserLocale() {
  return pickLocale(navigator.languages?.length ? navigator.languages : [navigator.language]);
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

/**
 * @param {unknown} value
 * @returns {value is Locale}
 */
export function isLocale(value) {
  return LOCALES.some((locale) => locale.id === value);
}
