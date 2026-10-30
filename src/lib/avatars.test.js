import { afterEach, describe, expect, test, vi } from 'vitest';
import { avatarChoices, avatarIcon } from './avatars.js';
import { critters } from './critters.js';

afterEach(() => {
  vi.restoreAllMocks();
});

/** @param {import('./critters.js').Critter[]} choices */
const ids = (choices) => choices.map((critter) => critter.id);
const anyCritter = () => true;

describe('avatarChoices', () => {
  test('offers 16 different critters', () => {
    const choices = ids(avatarChoices(null, anyCritter));
    expect(choices).toHaveLength(16);
    expect(new Set(choices).size).toBe(16);
    expect(choices.every((id) => critters.some((critter) => critter.id === id))).toBe(true);
  });

  test('puts the one picked first', () => {
    expect(avatarChoices('koi', anyCritter)[0].id).toBe('koi');
    expect(ids(avatarChoices('koi', anyCritter)).filter((id) => id === 'koi')).toHaveLength(1);
    // Even when it isn't allowed for others, since it's this profile's own.
    expect(avatarChoices('koi', (id) => id !== 'koi')[0].id).toBe('koi');
  });

  test('leaves out the ones not allowed', () => {
    for (let i = 0; i < 20; i++) {
      expect(ids(avatarChoices(null, (id) => id !== 'octopus'))).not.toContain('octopus');
    }
    expect(ids(avatarChoices(null, (id) => ['koi', 'frog'].includes(id))).sort()).toEqual(['frog', 'koi']);
  });

  test('draws anew each time', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const first = ids(avatarChoices('koi', anyCritter));
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const second = ids(avatarChoices('koi', anyCritter));
    expect(second[0]).toBe('koi');
    expect(second.slice(1)).not.toEqual(first.slice(1));
  });
});

test('avatarIcon is the critter’s icon', () => {
  expect(avatarIcon('octopus')).toBe('icons/octopus.png');
});
