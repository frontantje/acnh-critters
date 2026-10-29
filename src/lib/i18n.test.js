import { afterEach, describe, expect, test, vi } from 'vitest';
import { i18n, pickLocale, setLocale, t, term } from './i18n.svelte.js';

const STORAGE_KEY = 'acnh-critters-locale';

afterEach(() => {
  setLocale('en');
  localStorage.clear();
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
  test('remembers the choice and sets the page language', () => {
    setLocale('de');
    expect(i18n.locale).toBe('de');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('de');
    expect(document.documentElement.lang).toBe('de');
  });

  test('a remembered choice wins over the browser language on the next visit', async () => {
    localStorage.setItem(STORAGE_KEY, 'de');
    vi.resetModules();
    const fresh = await import('./i18n.svelte.js');
    expect(fresh.i18n.locale).toBe('de');
  });

  test('an unsupported remembered value is ignored', async () => {
    localStorage.setItem(STORAGE_KEY, 'fr');
    vi.resetModules();
    const fresh = await import('./i18n.svelte.js');
    expect(fresh.i18n.locale).toBe('en');
  });
});
