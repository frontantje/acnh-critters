// Codes pack the progress into bits so they stay short enough to copy, share or email.

import { CATEGORIES, critters } from './critters.js';
import { LOCALES } from './i18n.svelte.js';

export const MAX_NAME_LENGTH = 20;

const PREFIX = 'ACNH1-';
const CODE_PATTERN = /ACNH1-[A-Za-z0-9_-]+/;
const BITSET_BYTES = Math.ceil(critters.length / 8);
const FIXED_BYTES = 1 + 2 * BITSET_BYTES;

/**
 * @typedef {{
 *   version: number,
 *   settings: { hemisphere: string, trackDonations: boolean, showCaught: boolean, locale?: string, name?: string },
 *   caught: string[],
 *   donated: string[],
 *   synced: string[],
 * }} ExportData
 */

const CONTROL_CHARACTERS = /\p{Cc}/gu;

/** @param {unknown} value */
export function normalizeName(value) {
  if (typeof value !== 'string') return '';
  const characters = Array.from(value.replace(CONTROL_CHARACTERS, '').trim());
  return characters.slice(0, MAX_NAME_LENGTH).join('').trim();
}

/** @param {ExportData} data */
export function encodeTransferCode(data) {
  const { settings } = data;
  const locale = LOCALES.findIndex((option) => option.id === settings.locale) + 1;
  const name = new TextEncoder().encode(normalizeName(settings.name));
  const bytes = new Uint8Array(FIXED_BYTES + name.length);
  bytes[0] =
    (settings.hemisphere === 'south' ? 1 : 0) |
    (settings.trackDonations ? 1 << 1 : 0) |
    (settings.showCaught ? 1 << 2 : 0) |
    (locale << 3) |
    CATEGORIES.reduce((bits, category, i) => (data.synced.includes(category.id) ? bits | (1 << (5 + i)) : bits), 0);
  writeBits(bytes, 1, new Set(data.caught));
  writeBits(bytes, 1 + BITSET_BYTES, new Set(data.donated));
  bytes.set(name, FIXED_BYTES);
  return PREFIX + toBase64Url(bytes);
}

/**
 * Finds a code in text, so pasting a whole email or message works too.
 * @param {string} text
 */
export function findTransferCode(text) {
  return CODE_PATTERN.exec(text)?.[0] ?? null;
}

/**
 * @param {string} code
 * @returns {ExportData}
 */
export function decodeTransferCode(code) {
  const bytes = fromBase64Url(code.slice(PREFIX.length));
  const name = bytes && bytes.length >= FIXED_BYTES ? decodeName(bytes.subarray(FIXED_BYTES)) : null;
  if (!bytes || name === null) throw new Error(`Invalid transfer code: ${code}`);

  const flags = bytes[0];
  // Codes from older versions have no language (0), so the importing device keeps its own.
  const locale = LOCALES[((flags >> 3) & 0b11) - 1]?.id;
  return {
    version: 1,
    settings: {
      hemisphere: flags & 1 ? 'south' : 'north',
      trackDonations: Boolean(flags & (1 << 1)),
      showCaught: Boolean(flags & (1 << 2)),
      ...(locale && { locale }),
      ...(name && { name }),
    },
    caught: readBits(bytes, 1),
    donated: readBits(bytes, 1 + BITSET_BYTES),
    synced: CATEGORIES.filter((_, i) => flags & (1 << (5 + i))).map((category) => category.id),
  };
}

/**
 * Null if the bytes can't be a name, which catches damaged codes.
 * @param {Uint8Array} bytes
 */
function decodeName(bytes) {
  try {
    const name = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return normalizeName(name) === name ? name : null;
  } catch {
    return null;
  }
}

/**
 * Bits follow the order of data/critters.json, so reordering it breaks codes sent earlier.
 * @param {Uint8Array} bytes
 * @param {number} offset
 * @param {Set<string>} ids
 */
function writeBits(bytes, offset, ids) {
  critters.forEach((critter, i) => {
    if (ids.has(critter.id)) bytes[offset + (i >> 3)] |= 1 << (i & 7);
  });
}

/**
 * @param {Uint8Array} bytes
 * @param {number} offset
 */
function readBits(bytes, offset) {
  return critters.filter((_, i) => bytes[offset + (i >> 3)] & (1 << (i & 7))).map((critter) => critter.id);
}

/** @param {Uint8Array} bytes */
function toBase64Url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** @param {string} text */
function fromBase64Url(text) {
  try {
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}
