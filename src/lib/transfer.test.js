import { describe, expect, test } from 'vitest';
import { critters } from './critters.js';
import { decodeTransferCode, encodeTransferCode, findTransferCode } from './transfer.js';

/** @typedef {import('./transfer.js').ExportData} ExportData */

const ids = critters.map((c) => c.id);

/** @param {Partial<ExportData['settings']>} [settings] @param {Partial<ExportData>} [lists] @returns {ExportData} */
const data = (settings = {}, lists = {}) => ({
  version: 1,
  settings: { hemisphere: 'north', trackDonations: false, showCaught: false, ...settings },
  caught: [],
  donated: [],
  synced: [],
  ...lists,
});

describe('transfer codes', () => {
  test.each([
    ['nothing caught', data()],
    ['all settings on', data({ hemisphere: 'south', trackDonations: true, showCaught: true, locale: 'de' })],
    ['English picked', data({ locale: 'en' })],
    ['everything caught and donated', data({}, { caught: ids, donated: ids, synced: ['fish', 'bug', 'sea'] })],
    [
      'a mix, incl. first and last critter',
      data({ hemisphere: 'south' }, { caught: [ids[0], 'koi', 'tarantula', ids[199]], donated: ['koi'], synced: ['bug'] }),
    ],
  ])('round-trip: %s', (_, original) => {
    expect(decodeTransferCode(encodeTransferCode(original))).toEqual(original);
  });

  test('lists come back in data order, without duplicates', () => {
    const code = encodeTransferCode(data({}, { caught: ['tarantula', 'koi', 'koi'], synced: ['sea', 'fish'] }));
    expect(decodeTransferCode(code)).toMatchObject({ caught: ['koi', 'tarantula'], synced: ['fish', 'sea'] });
  });

  test('are short and safe to put in links and emails', () => {
    const code = encodeTransferCode(data({ locale: 'de' }, { caught: ids, donated: ids }));
    expect(code).toMatch(/^ACNH1-[A-Za-z0-9_-]+$/);
    expect(code.length).toBeLessThanOrEqual(80);
  });

  test('stay the same for the same data', () => {
    // Guards the bit layout, since codes sent earlier must keep importing.
    expect(encodeTransferCode(data({ hemisphere: 'south', locale: 'de' }, { caught: [ids[0]], synced: ['fish'] }))).toBe(
      'ACNH1-MQEA' + 'A'.repeat(64),
    );
  });

  test.each([
    'ACNH1-',
    'ACNH1-AAAA',
    'ACNH1-***',
    // A trailing zero byte, which can't be part of a name.
    encodeTransferCode(data()) + 'AA',
    // Trailing bytes that aren't UTF-8.
    encodeTransferCode(data()) + '__8',
  ])('rejects %s', (code) => {
    expect(() => decodeTransferCode(code)).toThrow('Invalid transfer code');
  });

  describe('names', () => {
    test.each(['Antje', 'Antje’s Insel', 'Ünïcødé ✨', '🏝️ Isla', 'a'.repeat(20)])('round-trip: %s', (name) => {
      const original = data({ name }, { caught: ['koi'] });
      expect(decodeTransferCode(encodeTransferCode(original))).toEqual(original);
    });

    test('an empty name leaves the code unchanged', () => {
      expect(encodeTransferCode(data({ name: '' }))).toBe(encodeTransferCode(data()));
      expect(decodeTransferCode(encodeTransferCode(data({ name: '  ' }))).settings).not.toHaveProperty('name');
    });

    test('are trimmed and cut to 20 characters when encoding', () => {
      const code = encodeTransferCode(data({ name: '  A name that is far too long  ' }));
      expect(decodeTransferCode(code).settings.name).toBe('A name that is far t');
    });

    test('keep the code short', () => {
      const code = encodeTransferCode(data({ locale: 'de', name: 'Twenty characters!!!' }, { caught: ids, donated: ids }));
      expect(code).toMatch(/^ACNH1-[A-Za-z0-9_-]+$/);
      // 51 fixed bytes + 20 name bytes = 95 base64 characters, plus "ACNH1-".
      expect(code).toHaveLength(101);
    });
  });

  test('can be found in a whole pasted email', () => {
    const code = encodeTransferCode(data({}, { caught: ['koi'] }));
    expect(findTransferCode(`Hi!\r\n\r\nTo import my progress … paste this code:\r\n\r\n${code}\r\n\r\nSent from my iPhone`)).toBe(code);
    expect(findTransferCode(`"${code}".`)).toBe(code);
    expect(findTransferCode('no code here')).toBeNull();
  });
});
