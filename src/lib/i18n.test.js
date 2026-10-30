import { afterEach, describe, expect, test, vi } from 'vitest';
import { browserLocale, i18n, pickLocale, setLocale, t, term } from './i18n.svelte.js';

afterEach(() => {
  setLocale('en');
  vi.restoreAllMocks();
});

describe('pickLocale', () => {
  test.each([
    [['de-DE'], 'de'],
    [['de-CH', 'en'], 'de'],
    [['en-GB', 'de-DE'], 'en'],
    [['fr-FR', 'de-DE'], 'de'],
    [['fr-FR'], 'en'],
    [['DE'], 'de'],
    [[], 'en'],
    [[undefined], 'en'],
  ])('%j -> %s', (tags, locale) => {
    expect(pickLocale(tags)).toBe(locale);
  });
});

describe('t', () => {
  test('fills in placeholders', () => {
    expect(t('syncCount', { caught: '3', total: '80' })).toBe('3 of 80 caught');
  });

  test('follows the current language', () => {
    setLocale('de');
    expect(t('syncCount', { caught: '3', total: '80' })).toBe('3 von 80 gefangen');
  });

  test('leaves a missing placeholder empty', () => {
    expect(t('speed')).toBe('Speed: ');
  });
});

describe('term', () => {
  test('translates data values into German only', () => {
    expect(term('River (mouth)')).toBe('River (mouth)');
    setLocale('de');
    expect(term('River (mouth)')).toBe('Flussmündung');
    expect(term('Not in the list')).toBe('Not in the list');
  });
});

describe('setLocale', () => {
  test('switches the text and the page language', () => {
    setLocale('de');
    expect(i18n.locale).toBe('de');
    expect(document.documentElement.lang).toBe('de');
  });
});

// Remembering a language picked in the menu is up to the profile (progress.test.js).
describe('browserLocale', () => {
  test('is the first supported language in the browser’s list', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['fr-FR', 'de-AT', 'en']);
    expect(browserLocale()).toBe('de');
  });

  test('is what the app starts in', async () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['de-DE']);
    vi.resetModules();
    const fresh = await import('./i18n.svelte.js');
    expect(fresh.i18n.locale).toBe('de');
    expect(document.documentElement.lang).toBe('de');
  });
});
