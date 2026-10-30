import { describe, expect, test } from 'vitest';
import { CATEGORIES, critters } from './critters.js';
import { germanTerms, messages } from './messages.js';

/** @typedef {import('./critters.js').Critter} Critter */

/** @param {number[]} list */
const isSortedUnique = (list) => list.every((value, i) => i === 0 || value > list[i - 1]);

describe('critter data', () => {
  test('has 80 fish, 80 insects and 40 sea creatures', () => {
    const counts = Object.fromEntries(CATEGORIES.map(({ id }) => [id, critters.filter((c) => c.type === id).length]));
    expect(counts).toEqual({ fish: 80, bug: 80, sea: 40 });
    expect(critters).toHaveLength(200);
  });

  test('ids are unique lowercase slugs', () => {
    const ids = critters.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id))).toEqual([]);
  });

  test('are in Critterpedia order, numbered 1 to n per type', () => {
    for (const { id } of CATEGORIES) {
      expect(critters.filter((c) => c.type === id).map((c) => c.number)).toEqual(
        Array.from({ length: critters.filter((c) => c.type === id).length }, (_, i) => i + 1),
      );
    }
  });

  test('every icon is a file in public/icons, and there are no others', () => {
    // So the app needs no image server and works offline.
    const files = Object.keys(import.meta.glob('../../public/icons/*'))
      .map((path) => path.replace('../../public/', ''))
      .sort();
    expect(critters.map((c) => c.icon).sort()).toEqual(files);
    expect(critters.filter((c) => c.icon !== `icons/${c.id}.png`).map((c) => c.id)).toEqual([]);
  });

  test('every critter has an English and a German name', () => {
    expect(critters.filter((c) => !c.name.en?.trim() || !c.name.de?.trim()).map((c) => c.id)).toEqual([]);
  });

  test('have the fields that fit their type', () => {
    /** @param {Critter} c */
    const shape = (c) => ({ location: !!c.location, shadow: !!c.shadow, speed: !!c.speed, weather: !!c.weather });
    const expected = {
      fish: { location: true, shadow: true, speed: false, weather: false },
      bug: { location: true, shadow: false, speed: false, weather: true },
      sea: { location: false, shadow: true, speed: true, weather: false },
    };
    expect(critters.filter((c) => JSON.stringify(shape(c)) !== JSON.stringify(expected[/** @type {'fish'} */ (c.type)])).map((c) => c.id)).toEqual([]);
  });

  test('months and hours are valid, sorted, and seasons don’t overlap', () => {
    const problems = [];
    for (const critter of critters) {
      for (const hemisphere of /** @type {const} */ (['north', 'south'])) {
        const periods = critter[hemisphere];
        const months = periods.flatMap((p) => p.months);
        const ok =
          periods.length > 0 &&
          periods.every((p) => p.months.length > 0 && p.hours.length > 0 && isSortedUnique(p.months) && isSortedUnique(p.hours)) &&
          months.every((m) => m >= 1 && m <= 12) &&
          periods.every((p) => p.hours.every((h) => h >= 0 && h <= 23)) &&
          new Set(months).size === months.length;
        if (!ok) problems.push(`${critter.id} (${hemisphere})`);
      }
    }
    expect(problems).toEqual([]);
  });

  test('the southern hemisphere is the northern one shifted by six months', () => {
    /** @param {Critter['north']} periods @param {number} month */
    const hoursIn = (periods, month) => periods.find((p) => p.months.includes(month))?.hours.join() ?? null;
    const problems = critters.filter((critter) =>
      Array.from({ length: 12 }, (_, i) => i + 1).some(
        (month) => hoursIn(critter.south, month) !== hoursIn(critter.north, ((month + 5) % 12) + 1),
      ),
    );
    expect(problems.map((c) => c.id)).toEqual([]);
  });
});

describe('translations', () => {
  const values = new Set(critters.flatMap((c) => [c.location, c.shadow, c.speed]).filter((v) => v !== null));

  test('every location, shadow size and speed in the data has German', () => {
    expect([...values].filter((value) => !(value in germanTerms))).toEqual([]);
  });

  test('there are no German terms the data no longer uses', () => {
    expect(Object.keys(germanTerms).filter((term) => !values.has(term))).toEqual([]);
  });

  test('English and German have the same messages, none empty, with the same placeholders', () => {
    /** @param {string} text */
    const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
    const { en, de } = messages;
    expect(Object.keys(de).sort()).toEqual(Object.keys(en).sort());
    for (const key of /** @type {(keyof typeof en)[]} */ (Object.keys(en))) {
      expect(en[key].trim(), key).not.toBe('');
      expect(de[key].trim(), key).not.toBe('');
      expect(placeholders(de[key]), key).toEqual(placeholders(en[key]));
    }
  });
});
