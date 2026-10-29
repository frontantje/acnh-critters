// UI effects: confetti in the list, pulse / shake / slide in the Critterpedia Sync.
import { critters, expect, row, setShowCaught, skipWelcome, stored, test } from './support.js';

const sea = critters.filter((c) => c.type === 'sea');

/** @param {import('@playwright/test').Page} page */
const confetti = (page) => page.locator('[data-confetti]');
/** @param {import('@playwright/test').Page} page */
const dialog = (page) => page.getByRole('dialog');
/** @param {import('@playwright/test').Page} page */
const progressLine = (page) => dialog(page).locator('p.text-center');

/**
 * Records the transform keyframes of every animation started inside the sync
 * dialog, e.g. "scale(1) → scale(1.12) → scale(1)". Must run before the page loads.
 * @param {import('@playwright/test').Page} page
 */
async function recordAnimations(page) {
  await page.addInitScript(() => {
    const original = Element.prototype.animate;
    /** @type {any} */ (window).animations = [];
    Element.prototype.animate = function (keyframes, options) {
      if (this.closest('dialog')) {
        const frames = Array.isArray(keyframes) ? keyframes : [];
        /** @type {any} */ (window).animations.push(frames.map((frame) => frame.transform ?? '').join(' → '));
      }
      return original.call(this, keyframes, options);
    };
  });
}

/** @param {import('@playwright/test').Page} page */
const animations = (page) => page.evaluate(() => /** @type {string[]} */ (/** @type {any} */ (window).animations));

/** @param {import('@playwright/test').Page} page */
async function startSeaCreatures(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start Critterpedia Sync' }).click();
  await dialog(page).locator('[data-category="sea"]').click();
  await expect(progressLine(page)).toHaveText('Sea creatures · 1 of 40');
}

test.describe('confetti in the list', () => {
  test('catching bursts confetti that cleans up after itself', async ({ page }) => {
    await skipWelcome(page);
    await row(page, 'Pale chub').getByRole('button', { name: 'Caught it' }).click();
    await expect(confetti(page)).toHaveCount(1);
    await expect(confetti(page)).toHaveAttribute('aria-hidden', 'true');
    await expect(confetti(page).locator('span')).toHaveCount(18);
    await expect(confetti(page)).toHaveCount(0, { timeout: 3000 });
  });

  test('it doesn’t block the page, and un-catching makes none', async ({ page }) => {
    await skipWelcome(page);
    await setShowCaught(page, true);
    const button = row(page, 'Pale chub').getByRole('button');
    await button.click();
    await expect(confetti(page)).toHaveCount(1);
    // Clickable straight through the confetti; un-catching adds no second burst
    // (each burst has its own layer).
    await button.click();
    await expect(button).toHaveText('Caught it');
    await expect(confetti(page)).toHaveCount(1);
    await expect(confetti(page)).toHaveCount(0, { timeout: 3000 });
  });

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('there is none', async ({ page }) => {
      await skipWelcome(page);
      await row(page, 'Pale chub').getByRole('button', { name: 'Caught it' }).click();
      expect((await stored(page)).caught).toEqual(['pale-chub']);
      await expect(confetti(page)).toHaveCount(0);
    });
  });
});

test.describe('Critterpedia Sync', () => {
  test('Caught: the critter pulses, slides out to the left, and the next one slides in', async ({ page }) => {
    await recordAnimations(page);
    await startSeaCreatures(page);
    await dialog(page).getByRole('button', { name: 'Caught', exact: true }).click();
    // Saved right away, before the animation ends.
    expect((await stored(page)).caught).toEqual([sea[0].id]);

    await expect(progressLine(page)).toHaveText('Sea creatures · 2 of 40');
    await expect.poll(() => animations(page)).toEqual([
      'scale(1) → scale(1.12) → scale(1)',
      'translateX(0px) → translateX(-160px)',
      'translateX(48px) → translateX(0)',
    ]);
  });

  test('Next: a little shake instead, then the same slide', async ({ page }) => {
    await recordAnimations(page);
    await startSeaCreatures(page);
    await dialog(page).getByRole('button', { name: 'Next', exact: true }).click();
    await expect(progressLine(page)).toHaveText('Sea creatures · 2 of 40');
    await expect.poll(() => animations(page)).toEqual([
      'translateX(0px) → translateX(-10px) → translateX(9px) → translateX(-6px) → translateX(4px) → translateX(0px)',
      'translateX(0px) → translateX(-160px)',
      'translateX(48px) → translateX(0)',
    ]);
    expect((await stored(page)).caught).toEqual([]);
  });

  test('Enter and → get the same effects', async ({ page }) => {
    await recordAnimations(page);
    await startSeaCreatures(page);
    await page.keyboard.press('Enter');
    await expect(progressLine(page)).toHaveText('Sea creatures · 2 of 40');
    await page.keyboard.press('ArrowRight');
    await expect(progressLine(page)).toHaveText('Sea creatures · 3 of 40');
    await expect.poll(async () => (await animations(page)).map((a) => a.split(' → ')[1])).toEqual([
      'scale(1.12)',
      'translateX(-160px)',
      'translateX(0)',
      'translateX(-10px)',
      'translateX(-160px)',
      'translateX(0)',
    ]);
  });

  test('a quick double tap only marks the critter that was shown', async ({ page }) => {
    await startSeaCreatures(page);
    await dialog(page).getByRole('button', { name: 'Caught', exact: true }).dblclick();
    await expect(progressLine(page)).toHaveText('Sea creatures · 2 of 40');
    await page.waitForTimeout(800);
    await expect(progressLine(page)).toHaveText('Sea creatures · 2 of 40');
    expect((await stored(page)).caught).toEqual([sea[0].id]);
  });

  test('the next critter can be marked while it slides in', async ({ page }) => {
    await startSeaCreatures(page);
    await dialog(page).getByRole('button', { name: 'Caught', exact: true }).click();
    await expect(progressLine(page)).toHaveText('Sea creatures · 2 of 40');
    // No waiting for the slide-in to finish.
    await dialog(page).getByRole('button', { name: 'Caught', exact: true }).click();
    await expect(progressLine(page)).toHaveText('Sea creatures · 3 of 40');
    expect((await stored(page)).caught).toEqual([sea[0].id, sea[1].id]);
  });

  test('the page never scrolls sideways while the critter slides out', async ({ page }) => {
    await startSeaCreatures(page);
    await dialog(page).getByRole('button', { name: 'Next', exact: true }).click();
    const overflow = [];
    for (let i = 0; i < 8; i++) {
      overflow.push(await dialog(page).evaluate((d) => d.scrollWidth - d.clientWidth));
      await page.waitForTimeout(60);
    }
    expect(Math.max(...overflow)).toBeLessThanOrEqual(0);
  });

  test.describe('swiping on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

    test('skips the shake and slides on from where the finger let go', async ({ page }) => {
      await recordAnimations(page);
      await startSeaCreatures(page);
      const area = await dialog(page).locator('[aria-live]').boundingBox();
      if (!area) throw new Error('no swipe area');
      const y = area.y + area.height / 2;
      const x = area.x + area.width / 2;
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x + 80, y }] });
      for (let i = 1; i <= 10; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 80 - 16 * i, y }] });
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

      await expect(progressLine(page)).toHaveText('Sea creatures · 2 of 40');
      await expect.poll(() => animations(page)).toEqual(['translateX(-160px) → translateX(-320px)', 'translateX(48px) → translateX(0)']);
    });
  });

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('moves on instantly, without animations', async ({ page }) => {
      await recordAnimations(page);
      await startSeaCreatures(page);
      await dialog(page).getByRole('button', { name: 'Caught', exact: true }).click();
      await expect(progressLine(page)).toHaveText('Sea creatures · 2 of 40');
      expect(await animations(page)).toEqual([]);
    });
  });
});
