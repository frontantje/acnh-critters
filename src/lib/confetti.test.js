import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { confettiFrom } from './confetti.js';

// jsdom has neither Web Animations nor matchMedia, so both are stubbed.
/** @type {{ resolve: () => void, reject: () => void }[]} */
let running = [];
let reducedMotion = false;

beforeEach(() => {
  running = [];
  reducedMotion = false;
  Element.prototype.animate = /** @type {any} */ (
    vi.fn(() => {
      const control = /** @type {{ resolve: () => void, reject: () => void }} */ ({});
      const finished = new Promise((resolve, reject) => Object.assign(control, { resolve, reject }));
      running.push(control);
      return { finished };
    })
  );
  window.matchMedia = /** @type {any} */ (vi.fn(() => ({ matches: reducedMotion })));
});

afterEach(() => {
  document.body.replaceChildren();
});

function button() {
  const element = document.createElement('button');
  element.getBoundingClientRect = () => /** @type {DOMRect} */ ({ left: 100, top: 200, width: 40, height: 20 });
  document.body.append(element);
  return element;
}

const layer = () => document.querySelector('[data-confetti]');

describe('confettiFrom', () => {
  test('bursts 18 pieces from the middle of the element, in a layer screen readers and clicks ignore', () => {
    confettiFrom(button());

    const pieces = /** @type {HTMLElement[]} */ ([...(layer()?.querySelectorAll('span') ?? [])]);
    expect(pieces).toHaveLength(18);
    expect(running).toHaveLength(18);
    expect(layer()?.getAttribute('aria-hidden')).toBe('true');
    expect(/** @type {HTMLElement} */ (layer()).style.pointerEvents).toBe('none');
    for (const piece of pieces) {
      expect(parseFloat(piece.style.left) + parseFloat(piece.style.width) / 2).toBeCloseTo(120);
    }
  });

  test('removes its layer once every piece is done', async () => {
    confettiFrom(button());
    running.slice(1).forEach((animation) => animation.resolve());
    await vi.waitFor(() => Promise.resolve());
    expect(layer()).not.toBeNull();

    running[0].resolve();
    await vi.waitFor(() => expect(layer()).toBeNull());
  });

  test('also cleans up when the animations get cancelled', async () => {
    confettiFrom(button());
    running.forEach((animation) => animation.reject());
    await vi.waitFor(() => expect(layer()).toBeNull());
  });

  test('does nothing when the device asks for reduced motion', () => {
    reducedMotion = true;
    confettiFrom(button());
    expect(layer()).toBeNull();
    expect(Element.prototype.animate).not.toHaveBeenCalled();
  });
});
