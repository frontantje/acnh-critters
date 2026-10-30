import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { i18n, setLocale } from './i18n.svelte.js';
import {
  addProfile,
  cancelNewProfile,
  chooseLocale,
  deleteProfile,
  exportData,
  importProgress,
  markCaught,
  markSynced,
  previousProfile,
  profileName,
  profiles,
  progress,
  restore,
  save,
  setHemisphere,
  setName,
  switchProfile,
  takenName,
  toggleCaught,
  toggleShowCaught,
  transferCode,
} from './progress.svelte.js';

const STORAGE_KEY = 'acnh-critters';
const saved = (id = 1) => JSON.parse(localStorage.getItem(id === 1 ? STORAGE_KEY : `${STORAGE_KEY}-${id}`) ?? 'null');
/** @param {unknown} data */
const load = (data) => importProgress(JSON.stringify(data));
/**
 * Adds a profile and leaves its welcome screen, which saves it.
 * @param {string} name
 */
const add = (name) => {
  addProfile(name);
  save();
};

// Every test starts like a first visit, in the browser's language (English).
beforeEach(() => {
  localStorage.clear();
  restore();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const quietErrors = () => vi.spyOn(console, 'error').mockImplementation(() => {});

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
    expect(progress.locale).toBeNull(); // following the browser
    expect(saved().settings).not.toHaveProperty('locale');
    expect(exportData()).toEqual({ ...saved(), settings: { ...saved().settings, locale: 'en' } });

    chooseLocale('de');
    expect(saved().settings.locale).toBe('de');
    expect(exportData()).toEqual(saved());
  });

  test('a browser language carries over, too', () => {
    // German from the browser, never picked in the menu…
    i18n.locale = 'de';
    expect(progress.locale).toBeNull();
    const code = transferCode();

    // …imported on a device whose browser is English.
    i18n.locale = 'en';
    importProgress(code);
    expect(i18n.locale).toBe('de');
    expect(saved().settings.locale).toBe('de');
  });

  test('importing one with a language applies and remembers it', () => {
    load({ version: 1, settings: { locale: 'de' }, caught: [] });
    expect(i18n.locale).toBe('de');
    expect(progress.locale).toBe('de');
    expect(saved().settings.locale).toBe('de');
  });

  test('importing one without a language, or an unknown one, keeps the profile’s language', () => {
    chooseLocale('de');
    load({ version: 1, caught: [] });
    load({ version: 1, settings: { locale: 'fr' }, caught: [] });
    expect(i18n.locale).toBe('de');
    expect(saved().settings.locale).toBe('de');
  });

  test('a transfer code carries everything', () => {
    load({
      version: 1,
      settings: { hemisphere: 'south', trackDonations: true, showCaught: true },
      caught: ['koi', 'tarantula'],
      donated: ['koi'],
      synced: ['bug'],
    });
    chooseLocale('de');
    const expected = exportData();
    const code = transferCode();

    localStorage.clear();
    restore();
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
    save();
    setName('Antje');
    const withSaved = transferCode();
    setName('');
    importProgress(withSaved);
    expect(progress.name).toBe('Antje');
  });

  test('importing one without a name keeps the profile’s name', () => {
    setName('Mia');
    load({ version: 1, caught: ['koi'] });
    expect(progress.name).toBe('Mia');
  });
});

describe('setName', () => {
  test('on the welcome screen of a new profile, it names it without saving it yet', () => {
    expect(setName('  ')).toBe(false); // a new profile needs a name
    expect(setName('Antje')).toBe(true);
    expect(progress.name).toBe('Antje');
    expect(profiles.active).toBeNull();
    expect(saved()).toBeNull();
  });

  test('trims, cuts to 20 characters and saves', () => {
    save();
    setName('  Antje  ');
    expect(saved().settings.name).toBe('Antje');
    setName('A very long island name indeed');
    expect(progress.name).toBe('A very long island n');
    // Emoji count as one character each.
    setName('🏝'.repeat(25));
    expect(Array.from(progress.name)).toHaveLength(20);
  });

  test('an empty name clears it', () => {
    save();
    setName('Antje');
    setName('   ');
    expect(saved().settings.name).toBe('');
  });
});

describe('restore', () => {
  test('starts a new, unsaved profile when nothing is saved', () => {
    restore();
    expect(profiles.active).toBeNull();
    expect(profiles.list).toEqual([]);
  });

  test('loads saved progress', () => {
    load({ version: 1, settings: { hemisphere: 'south' }, caught: ['koi'], synced: ['bug'] });
    progress.caught.clear();
    progress.hemisphere = 'north';

    restore();
    expect(profiles.active).toBe(1);
    expect([...progress.caught]).toEqual(['koi']);
    expect(progress.hemisphere).toBe('south');
    expect([...progress.synced]).toEqual(['bug']);
  });

  test('ignores unreadable saved data', () => {
    localStorage.setItem(STORAGE_KEY, 'garbage');
    const consoleError = quietErrors();
    restore();
    expect(profiles.active).toBeNull();
    expect(consoleError).toHaveBeenCalledOnce();
  });

  test('a language picked before there were profiles moves into profile 1', () => {
    // As saved by version 1.0.0.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, caught: ['koi'] }));
    localStorage.setItem('acnh-critters-locale', 'de');
    restore();
    expect(profiles.active).toBe(1);
    expect(i18n.locale).toBe('de');
    expect(saved().settings.locale).toBe('de');
    expect(localStorage.getItem('acnh-critters-locale')).toBeNull();
  });

  test('the old language setting doesn’t override one saved in the profile', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, settings: { locale: 'en' }, caught: [] }));
    localStorage.setItem('acnh-critters-locale', 'de');
    restore();
    expect(i18n.locale).toBe('en');
    expect(localStorage.getItem('acnh-critters-locale')).toBeNull();
  });

  test('without a readable profile 1, the old language goes to the new profile and is kept', () => {
    localStorage.setItem(STORAGE_KEY, 'garbage');
    localStorage.setItem('acnh-critters-locale', 'de');
    quietErrors();
    restore();
    expect(profiles.active).toBeNull();
    expect(i18n.locale).toBe('de');
    save();
    // Number 2: the unreadable profile 1 isn't overwritten.
    expect(saved(2).settings.locale).toBe('de');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('garbage');
    expect(localStorage.getItem('acnh-critters-locale')).toBe('de');
  });

  test('if saving it into profile 1 fails, the old language is kept for the next start', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, caught: [] }));
    localStorage.setItem('acnh-critters-locale', 'de');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError');
    });
    quietErrors();
    restore();
    expect(i18n.locale).toBe('de');
    vi.restoreAllMocks();
    expect(localStorage.getItem('acnh-critters-locale')).toBe('de');
  });

  test('applies the language saved with the profile', () => {
    load({ version: 1, settings: { locale: 'de' }, caught: [] });
    setLocale('en');
    restore();
    expect(i18n.locale).toBe('de');
  });
});

describe('profiles', () => {
  const names = () => profiles.list.map((profile) => profileName(profile));

  test('the first one is saved where the progress was before there were profiles', () => {
    markCaught('koi');
    setName('Antje');
    expect(profiles.list).toEqual([{ id: 1, name: 'Antje' }]);
    expect(saved()).toMatchObject({ settings: { name: 'Antje' }, caught: ['koi'] });
    expect(localStorage.getItem('acnh-critters-active')).toBe('1');
  });

  test('a new one starts empty, with the hemisphere and language of the one shown before', () => {
    setHemisphere('south');
    chooseLocale('de');
    toggleShowCaught();
    markCaught('koi');
    addProfile('  Mia ');

    expect(profiles.active).toBeNull();
    expect(progress).toMatchObject({ name: 'Mia', hemisphere: 'south', locale: 'de', showCaught: false });
    expect([...progress.caught]).toEqual([]);
    // It's saved once its welcome screen is left.
    expect(profiles.list).toEqual([{ id: 1, name: '' }]);
    expect(localStorage.getItem('acnh-critters-active')).toBe('1');

    save();
    expect(profiles.active).toBe(2);
    expect(profiles.list).toEqual([{ id: 1, name: '' }, { id: 2, name: 'Mia' }]);
    expect(saved(2)).toMatchObject({ settings: { name: 'Mia', hemisphere: 'south', locale: 'de' }, caught: [] });
    expect(saved().caught).toEqual(['koi']);
    expect(localStorage.getItem('acnh-critters-active')).toBe('2');
  });

  test('a new one not saved yet can be left for the one shown before', () => {
    markCaught('koi');
    add('Mia');
    switchProfile(1);
    addProfile('Leo');
    expect(previousProfile()).toEqual({ id: 1, name: '' });
    cancelNewProfile();
    expect(profiles.active).toBe(1);
    expect([...progress.caught]).toEqual(['koi']);
    expect(previousProfile()).toBeUndefined();
    expect(profiles.list.map(({ id }) => id)).toEqual([1, 2]);
  });

  test('without a profile before (first visit, or after deleting the last one), there’s none to go back to', () => {
    expect(previousProfile()).toBeUndefined();
    markCaught('koi');
    deleteProfile();
    expect(previousProfile()).toBeUndefined();
  });

  test('one never saved is gone on the next start, which opens the one before', () => {
    markCaught('koi');
    addProfile('Mia');
    restore();
    expect(profiles.active).toBe(1);
    expect(profiles.list).toEqual([{ id: 1, name: '' }]);
  });

  test('each one has its own progress and language; the one switched to last opens next time', () => {
    markCaught('koi');
    add('Mia');
    chooseLocale('de');
    markCaught('tarantula');

    switchProfile(1);
    expect([...progress.caught]).toEqual(['koi']);
    expect(i18n.locale).toBe('en');
    switchProfile(2);
    expect([...progress.caught]).toEqual(['tarantula']);
    expect(i18n.locale).toBe('de');

    setLocale('en');
    restore();
    expect(profiles.active).toBe(2);
    expect(progress.name).toBe('Mia');
    expect(i18n.locale).toBe('de');
    expect(profiles.list).toEqual([{ id: 1, name: '' }, { id: 2, name: 'Mia' }]);
  });

  test('switching only remembers the profile; a change only saves the profile', () => {
    markCaught('koi');
    add('Mia');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    switchProfile(1);
    markCaught('tarantula');
    expect(setItem.mock.calls.map(([key]) => key)).toEqual(['acnh-critters-active', STORAGE_KEY]);
  });

  test('importing replaces only the profile shown', () => {
    markCaught('koi');
    add('Mia');
    load({ version: 1, caught: ['tarantula'] });
    expect(saved(2).caught).toEqual(['tarantula']);
    expect(saved().caught).toEqual(['koi']);
  });

  test('an import keeps the profile’s name; the export’s only names one without', () => {
    markCaught('koi');
    const code = transferCode('Antje');
    addProfile('Mia');
    importProgress(code);
    expect(progress.name).toBe('Mia');
    expect(saved(2)).toMatchObject({ settings: { name: 'Mia' }, caught: ['koi'] });
  });

  test('an import doesn’t give a profile the name of another one', () => {
    save();
    setName('Antje');
    const code = transferCode();
    add('Mia');
    setName('');
    importProgress(code);
    expect(progress.name).toBe('');
  });

  test('deleting one shows the first one left; deleting the last one starts over', () => {
    markCaught('koi');
    add('Mia');
    add('Leo');
    switchProfile(2);

    deleteProfile();
    expect(profiles.active).toBe(1);
    expect([...progress.caught]).toEqual(['koi']);
    expect(profiles.list.map(({ id }) => id)).toEqual([1, 3]);
    expect(saved(2)).toBeNull();
    expect(localStorage.getItem('acnh-critters-active')).toBe('1');

    deleteProfile();
    expect(progress.name).toBe('Leo');

    deleteProfile();
    expect(profiles.active).toBeNull();
    expect(profiles.list).toEqual([]);
    expect(progress.name).toBe('');
    expect(localStorage.length).toBe(0);
    restore();
    expect(profiles.active).toBeNull();
  });

  test('new ones are numbered after the highest, also after deleting', () => {
    markCaught('koi');
    add('Mia');
    add('Leo');
    switchProfile(2);
    deleteProfile();
    add('Ida');
    expect(profiles.list).toEqual([{ id: 1, name: '' }, { id: 3, name: 'Leo' }, { id: 4, name: 'Ida' }]);
  });

  test('a new one never takes the number of an unreadable profile, or of one added in another tab', () => {
    markCaught('koi');
    localStorage.setItem('acnh-critters-2', 'garbage');
    addProfile('Mia');
    // Another tab saves profile 3 while Mia's welcome screen is open.
    localStorage.setItem('acnh-critters-3', JSON.stringify({ version: 1, settings: { name: 'Leo' }, caught: [] }));
    save();
    expect(profiles.active).toBe(4);
    expect(localStorage.getItem('acnh-critters-2')).toBe('garbage');
    expect(saved(3).settings.name).toBe('Leo');
  });

  test('ones without a name are called by their number, which doesn’t change', () => {
    markCaught('koi');
    add('Mia');
    add('Leo');
    setName('');
    expect(names()).toEqual(['Profile 1', 'Mia', 'Profile 3']);
    switchProfile(1);
    deleteProfile();
    expect(names()).toEqual(['Mia', 'Profile 3']);
    setLocale('de');
    expect(names()).toEqual(['Mia', 'Profil 3']);
  });

  test('takenName finds a name another profile goes by, ignoring case', () => {
    markCaught('koi');
    add('Mia');
    expect(takenName(' mia ')).toBeNull(); // its own
    expect(takenName('MIA', null)).toBe('MIA'); // for a new profile
    expect(takenName('profile 1')).toBe('profile 1');
    expect(takenName('Leo')).toBeNull();
    expect(takenName('', null)).toBeNull();
    // Without a name, profile 2 would be called "Profile 2", which is free.
    expect(takenName('')).toBeNull();
    setName('Profile 3');
    add('Leo');
    expect(takenName('')).toBe('Profile 3');
  });

  test('a name can’t be what a profile without one is called, in either language', () => {
    markCaught('koi'); // "Profile 1" or "Profil 1"
    add('Mia');
    expect(takenName('Profil 1')).toBe('Profil 1');
    setLocale('de');
    expect(takenName('Profile 1')).toBe('Profile 1');
  });

  test('setName and addProfile refuse names that aren’t allowed', () => {
    markCaught('koi');
    add('Mia');
    expect(setName('profile 1')).toBe(false);
    expect(progress.name).toBe('Mia');
    expect(setName('Mia!')).toBe(true);

    // A new profile needs a name, and one no other profile has.
    expect(addProfile('  ')).toBe(false);
    expect(addProfile('MIA!')).toBe(false);
    expect(profiles.active).toBe(2);
    expect(addProfile('Leo')).toBe(true);
    expect(profiles.active).toBeNull();
  });

  test('only "acnh-critters" and "acnh-critters-<number>" are profiles', () => {
    const data = JSON.stringify({ version: 1, caught: ['koi'] });
    for (const key of ['acnh-critters-02', 'acnh-critters-1', 'acnh-critters-x', 'something-else', 'acnh-critters-3']) {
      localStorage.setItem(key, data);
    }
    // The profile used last is gone, so the first one opens.
    localStorage.setItem('acnh-critters-active', '7');
    restore();
    expect(profiles.list.map(({ id }) => id)).toEqual([3]);
    expect(profiles.active).toBe(3);
  });

  test('an unreadable one is left out; the others still open', () => {
    markCaught('koi');
    add('Mia');
    localStorage.setItem(STORAGE_KEY, 'garbage');
    const consoleError = quietErrors();
    restore();
    expect(profiles.active).toBe(2);
    expect(profiles.list).toEqual([{ id: 2, name: 'Mia' }]);
    expect(consoleError).toHaveBeenCalledOnce();
  });

  test('all of it keeps working in memory when storage is unavailable', () => {
    // E.g. with site data blocked, where every storage access throws.
    const blocked = () => {
      throw new DOMException('Blocked', 'SecurityError');
    };
    for (const method of /** @type {const} */ (['getItem', 'setItem', 'removeItem', 'key'])) {
      vi.spyOn(Storage.prototype, method).mockImplementation(blocked);
    }
    quietErrors();
    restore();
    markCaught('koi');
    add('Mia');
    markCaught('tarantula');
    switchProfile(1);
    expect([...progress.caught]).toEqual(['koi']);
    switchProfile(2);
    expect([...progress.caught]).toEqual(['tarantula']);
    deleteProfile();
    expect(profiles.list).toEqual([{ id: 1, name: '' }]);
    expect([...progress.caught]).toEqual(['koi']);
  });
});

describe('changes from another tab', () => {
  /**
   * Browsers only send "storage" events to other tabs, so this fakes one.
   * @param {string} key
   * @param {string | null} value
   */
  function otherTab(key, value) {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
    window.dispatchEvent(new StorageEvent('storage', { key, newValue: value, storageArea: localStorage }));
  }

  test('a profile added there shows up here', () => {
    markCaught('koi');
    otherTab('acnh-critters-2', JSON.stringify({ version: 1, settings: { name: 'Leo' }, caught: [] }));
    expect(profiles.list).toEqual([{ id: 1, name: '' }, { id: 2, name: 'Leo' }]);
    expect(profiles.active).toBe(1);
  });

  test('a change to the profile shown is shown here too', () => {
    markCaught('koi');
    otherTab(STORAGE_KEY, JSON.stringify({ version: 1, caught: ['koi', 'tarantula'] }));
    expect([...progress.caught]).toEqual(['koi', 'tarantula']);
  });

  test('when the profile shown is deleted there, the first one left is shown, and it isn’t saved back', () => {
    markCaught('koi');
    add('Mia');
    otherTab('acnh-critters-2', null);
    expect(profiles.active).toBe(1);
    expect(profiles.list).toEqual([{ id: 1, name: '' }]);
    markCaught('tarantula');
    expect(saved(2)).toBeNull();
    expect(saved().caught).toEqual(['koi', 'tarantula']);
  });

  test('when everything is cleared there, the app starts over', () => {
    markCaught('koi');
    localStorage.clear();
    window.dispatchEvent(new StorageEvent('storage', { key: null, storageArea: localStorage }));
    expect(profiles.active).toBeNull();
    expect(profiles.list).toEqual([]);
  });

  test('other keys and session storage are left alone', () => {
    markCaught('koi');
    otherTab('acnh-critters-active', '5');
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: null, storageArea: sessionStorage }));
    expect(profiles.list).toEqual([{ id: 1, name: '' }]);
    expect(profiles.active).toBe(1);
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
