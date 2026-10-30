import { critters } from './critters.js';

/** @typedef {import('./critters.js').Critter} Critter */

// Enough to choose from without scrolling on a phone.
const CHOICES = 16;

/**
 * A fresh random pick of critters each time, with the one already picked first so it stays in view.
 * @param {string | null} picked
 * @param {(id: string) => boolean} allowed
 * @returns {Critter[]}
 */
export function avatarChoices(picked, allowed) {
  const first = critters.filter((critter) => critter.id === picked);
  const others = critters.filter((critter) => critter.id !== picked && allowed(critter.id));
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  return [...first, ...others].slice(0, CHOICES);
}

/** @param {string} id */
export const avatarIcon = (id) => critters.find((critter) => critter.id === id)?.icon;
