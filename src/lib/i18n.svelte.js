// A picked language isn't saved here, since each profile keeps its own (progress.svelte.js).

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

/** @param {Locale} locale */
export function setLocale(locale) {
  i18n.locale = locale;
  document.documentElement.lang = locale;
}

/**
 * @param {MessageKey} key
 * @param {Record<string, string>} [values]
 * @param {Locale} [locale]
 */
export function t(key, values = {}, locale = i18n.locale) {
  return messages[locale][key].replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');
}

/** @param {string} english */
export function term(english) {
  return i18n.locale === 'de' ? (germanTerms[english] ?? english) : english;
}

/** @returns {Locale} */
export function browserLocale() {
  return pickLocale(navigator.languages?.length ? navigator.languages : [navigator.language]);
}

/**
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
