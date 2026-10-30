import { beforeEach, describe, expect, test, vi } from 'vitest';
import { chosenLocale, i18n, setLocale } from './i18n.svelte.js';
import {
  exportData,
  importProgress,
  markCaught,
  markSynced,
  progress,
  restore,
  setHemisphere,
  setName,
  toggleCaught,
  toggleShowCaught,
  transferCode,
} from './progress.svelte.js';

const STORAGE_KEY = 'acnh-critters';
const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
/** @param {unknown} data */
const load = (data) => importProgress(JSON.stringify(data));

beforeEach(() => {
  load({ version: 1, caught: [] });
  setLocale('en');
  // Also forgets the language choice, so the browser language applies again.
  localStorage.clear();
});

describe('importProgress', () => {
  test('applies an export and saves it', () => {
    const file = {
      version: 1,
      settings: { hemisphere: 'south', trackDonations: true, showCaught: true, name: 'Antje' },
      caught: ['pale-chub', 'koi'],
      donated: ['koi'],
      synced: ['fish'],
    };
    load(file);
    expect(progress.hemisphere).toBe('south');
    expect(progress.trackDonations).toBe(true);
    expect(progress.showCaught).toBe(true);
    expect(progress.name).toBe('Antje');
    expect([...progress.caught]).toEqual(['pale-chub', 'koi']);
    expect([...progress.donated]).toEqual(['koi']);
    expect([...progress.synced]).toEqual(['fish']);
    expect(saved()).toEqual(file);
  });

  test('drops unknown critters and categories', () => {
    load({ version: 1, caught: ['koi', 'dragon', 42], donated: ['unicorn'], synced: ['sea', 'birds'] });
    expect([...progress.caught]).toEqual(['koi']);
    expect([...progress.donated]).toEqual([]);
    expect([...progress.synced]).toEqual(['sea']);
  });

  test('uses defaults for missing or unexpected settings and lists', () => {
    load({
      caught: ['koi'],
      donated: 'koi',
      synced: {},
      settings: { hemisphere: 'east', trackDonations: 'yes', showCaught: 1, name: 42 },
    });
    expect(progress.hemisphere).toBe('north');
    expect(progress.trackDonations).toBe(false);
    expect(progress.showCaught).toBe(false);
    expect(progress.name).toBe('');
    expect([...progress.donated]).toEqual([]);
    expect([...progress.synced]).toEqual([]);
  });

  test.each(['not json', 'null', '"koi"', '[]', '{}', '{"caught": "koi"}', '{"version": 1}'])(
    'rejects %s',
    (text) => {
      expect(() => importProgress(text)).toThrow("That's not an ACNH Critters transfer code.");
    },
  );

  test('rejects files from a newer version', () => {
    expect(() => load({ version: 2, caught: [] })).toThrow('This code is from a newer version of the app.');
  });

  test('keeps the current progress when a file is rejected', () => {
    load({ version: 1, caught: ['koi'] });
    expect(() => importProgress('nope')).toThrow();
    expect([...progress.caught]).toEqual(['koi']);
    expect(saved().caught).toEqual(['koi']);
  });

  test('error messages follow the language', () => {
    setLocale('de');
    try {
      expect(() => importProgress('nope')).toThrow('Das ist kein ACNH-Critters-Übertragungscode.');
    } finally {
      setLocale('en');
    }
  });
});

describe('export', () => {
  test('is the saved progress plus the language shown, even if it was never picked in the menu', () => {
    load({ version: 1, settings: { hemisphere: 'south' }, caught: ['koi'] });
    expect(chosenLocale()).toBeNull(); // following the browser
    expect(exportData()).toEqual({ ...saved(), settings: { ...saved().settings, locale: 'en' } });

    setLocale('de');
    expect(exportData()).toEqual({ ...saved(), settings: { ...saved().settings, locale: 'de' } });
    // The saved progress itself never holds the language.
    expect(saved().settings).not.toHaveProperty('locale');
  });

  test('a browser language carries over, too', () => {
    // German from the browser, never picked in the menu…
    i18n.locale = 'de';
    expect(chosenLocale()).toBeNull();
    const code = transferCode();

    // …imported on a device whose browser is English.
    i18n.locale = 'en';
    importProgress(code);
    expect(i18n.locale).toBe('de');
    expect(chosenLocale()).toBe('de');
  });

  test('importing one with a language applies and remembers it', () => {
    load({ version: 1, settings: { locale: 'de' }, caught: [] });
    expect(i18n.locale).toBe('de');
    expect(chosenLocale()).toBe('de');
    expect(saved().settings).not.toHaveProperty('locale');
  });

  test('importing one without a language, or an unknown one, keeps the current language', () => {
    setLocale('de');
    load({ version: 1, caught: [] });
    load({ version: 1, settings: { locale: 'fr' }, caught: [] });
    expect(i18n.locale).toBe('de');
  });

  test('a transfer code carries everything', () => {
    load({
      version: 1,
      settings: { hemisphere: 'south', trackDonations: true, showCaught: true },
      caught: ['koi', 'tarantula'],
      donated: ['koi'],
      synced: ['bug'],
    });
    setLocale('de');
    const expected = exportData();
    const code = transferCode();

    load({ version: 1, caught: [] });
    setLocale('en');
    importProgress(code);
    expect(exportData()).toEqual(expected);
  });

  test('a whole pasted email with a code imports too', () => {
    load({ version: 1, caught: ['koi'] });
    const code = transferCode();
    load({ version: 1, caught: [] });
    importProgress(`To import my progress on another device …\r\n\r\n${code}\r\n\r\nSent from my iPhone`);
    expect([...progress.caught]).toEqual(['koi']);
  });

  test('a damaged code is rejected', () => {
    expect(() => importProgress('ACNH1-broken')).toThrow("That's not an ACNH Critters transfer code.");
  });

  test('the code carries the name, and importing remembers it', () => {
    load({ version: 1, caught: [] });
    const code = transferCode('Antje’s Insel 🏝');
    expect(progress.name).toBe(''); // only the code has it so far
    importProgress(code);
    expect(progress.name).toBe('Antje’s Insel 🏝');
    expect(saved().settings.name).toBe('Antje’s Insel 🏝');
  });

  test('transferCode uses the saved name unless given another', () => {
    setName('Antje');
    const withSaved = transferCode();
    load({ version: 1, caught: [] });
    importProgress(withSaved);
    expect(progress.name).toBe('Antje');
  });
});

describe('setName', () => {
  test('trims, cuts to 20 characters and saves', () => {
    setName('  Antje  ');
    expect(saved().settings.name).toBe('Antje');
    setName('A very long island name indeed');
    expect(progress.name).toBe('A very long island n');
    // Emoji count as one character each.
    setName('🏝'.repeat(25));
    expect(Array.from(progress.name)).toHaveLength(20);
  });

  test('an empty name clears it', () => {
    setName('Antje');
    setName('   ');
    expect(saved().settings.name).toBe('');
  });
});

describe('restore', () => {
  test('returns false when nothing is saved', () => {
    expect(restore()).toBe(false);
  });

  test('loads saved progress', () => {
    load({ version: 1, settings: { hemisphere: 'south' }, caught: ['koi'], synced: ['bug'] });
    progress.caught.clear();
    progress.hemisphere = 'north';

    expect(restore()).toBe(true);
    expect([...progress.caught]).toEqual(['koi']);
    expect(progress.hemisphere).toBe('south');
    expect([...progress.synced]).toEqual(['bug']);
  });

  test('ignores unreadable saved data', () => {
    localStorage.setItem(STORAGE_KEY, 'garbage');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(restore()).toBe(false);
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });
});

describe('changes are saved right away', () => {
  test('toggleCaught catches and un-catches; un-catching also removes the donation', () => {
    load({ version: 1, caught: ['koi'], donated: ['koi'] });
    toggleCaught('koi');
    expect([...progress.caught]).toEqual([]);
    expect([...progress.donated]).toEqual([]);
    expect(saved()).toMatchObject({ caught: [], donated: [] });

    toggleCaught('koi');
    expect(saved()).toMatchObject({ caught: ['koi'], donated: [] });
  });

  test('markCaught and markSynced only ever add', () => {
    markCaught('koi');
    markCaught('koi');
    markSynced('sea');
    markSynced('sea');
    expect(saved()).toMatchObject({ caught: ['koi'], synced: ['sea'] });
  });

  test('setHemisphere accepts only north and south', () => {
    setHemisphere('south');
    expect(saved().settings.hemisphere).toBe('south');
    setHemisphere('east');
    expect(progress.hemisphere).toBe('north');
    expect(saved().settings.hemisphere).toBe('north');
  });

  test('toggleShowCaught flips the setting', () => {
    toggleShowCaught();
    expect(saved().settings.showCaught).toBe(true);
    toggleShowCaught();
    expect(saved().settings.showCaught).toBe(false);
  });
});
