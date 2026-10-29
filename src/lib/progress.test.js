import { beforeEach, describe, expect, test, vi } from 'vitest';
import { setLocale } from './i18n.svelte.js';
import {
  importProgress,
  markCaught,
  markSynced,
  progress,
  restore,
  setHemisphere,
  toggleCaught,
  toggleShowCaught,
} from './progress.svelte.js';

const STORAGE_KEY = 'acnh-critters';
const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
/** @param {unknown} data */
const load = (data) => importProgress(JSON.stringify(data));

beforeEach(() => {
  load({ version: 1, caught: [] });
  localStorage.clear();
});

describe('importProgress', () => {
  test('applies an export and saves it', () => {
    const file = {
      version: 1,
      settings: { hemisphere: 'south', trackDonations: true, showCaught: true },
      caught: ['pale-chub', 'koi'],
      donated: ['koi'],
      synced: ['fish'],
    };
    load(file);
    expect(progress.hemisphere).toBe('south');
    expect(progress.trackDonations).toBe(true);
    expect(progress.showCaught).toBe(true);
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
    load({ caught: ['koi'], donated: 'koi', synced: {}, settings: { hemisphere: 'east', trackDonations: 'yes', showCaught: 1 } });
    expect(progress.hemisphere).toBe('north');
    expect(progress.trackDonations).toBe(false);
    expect(progress.showCaught).toBe(false);
    expect([...progress.donated]).toEqual([]);
    expect([...progress.synced]).toEqual([]);
  });

  test.each(['not json', 'null', '"koi"', '[]', '{}', '{"caught": "koi"}', '{"version": 1}'])(
    'rejects %s',
    (text) => {
      expect(() => importProgress(text)).toThrow("This file isn't an ACNH Critters export.");
    },
  );

  test('rejects files from a newer version', () => {
    expect(() => load({ version: 2, caught: [] })).toThrow('This file was exported from a newer version of the app.');
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
      expect(() => importProgress('nope')).toThrow('Diese Datei ist kein ACNH-Critters-Export.');
    } finally {
      setLocale('en');
    }
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
