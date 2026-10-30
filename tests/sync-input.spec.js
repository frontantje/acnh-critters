import { critters, expect, startApp, stored, test } from './support.js';

// Animations ignore quick repeated input while playing, so they're off here.
test.use({ reducedMotion: 'reduce' });

const sea = critters.filter((c) => c.type === 'sea');

/** @param {import('@playwright/test').Page} page */
const dialog = (page) => page.getByRole('dialog');
/** @param {import('@playwright/test').Page} page */
const progressLine = (page) => dialog(page).locator('p.text-center');
/** @param {import('@playwright/test').Page} page */
const currentName = (page) => dialog(page).locator('[aria-live] p');
/** @param {import('@playwright/test').Page} page */
const caughtButton = (page) => dialog(page).getByRole('button', { name: 'Caught', exact: true });
/** @param {import('@playwright/test').Page} page */
const nextButton = (page) => dialog(page).getByRole('button', { name: 'Next', exact: true });

/** @param {import('@playwright/test').Page} page */
async function startSeaCreatures(page) {
  await startApp(page);
  await page.getByRole('button', { name: 'Start Critterpedia Sync' }).click();
  await dialog(page).locator('[data-category="sea"]').click();
  await expect(progressLine(page)).toHaveText('Sea creatures · 1 of 40');
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {number} step
 * @param {number} caughtCount
 */
async function expectAt(page, step, caughtCount) {
  await expect(progressLine(page)).toHaveText(`Sea creatures · ${step} of 40`);
  expect((await stored(page)).caught).toHaveLength(caughtCount);
}

/** @param {import('@playwright/test').Page} page */
const blur = (page) => page.evaluate(() => /** @type {HTMLElement | null} */ (document.activeElement)?.blur());

test.describe('keyboard', () => {
  test('→ means Next, also with focus outside the buttons', async ({ page }) => {
    await startApp(page);
    await page.getByRole('button', { name: 'Start Critterpedia Sync' }).click();
    // → does nothing on the category screen.
    await page.keyboard.press('ArrowRight');
    await expect(dialog(page).locator('ul button')).toHaveCount(3);

    await dialog(page).locator('[data-category="sea"]').click();
    await page.keyboard.press('ArrowRight');
    await expectAt(page, 2, 0);
    await expect(currentName(page)).toHaveText(sea[1].name.en);
    await blur(page);
    await page.keyboard.press('ArrowRight');
    await expectAt(page, 3, 0);
    await expect(nextButton(page)).toHaveAttribute('aria-keyshortcuts', 'ArrowRight');
  });

  test('holding → or Enter moves on only once', async ({ page }) => {
    await startSeaCreatures(page);
    for (const key of ['ArrowRight', 'Enter']) {
      await page.keyboard.down(key);
      await page.keyboard.down(key);
      await page.keyboard.down(key);
      await page.keyboard.up(key);
    }
    await expectAt(page, 3, 1);
  });

  test('modifier combinations and ← do nothing', async ({ page }) => {
    await startSeaCreatures(page);
    // A focused button still reacts to Shift+Enter, so nothing is focused here.
    await blur(page);
    for (const key of ['Alt+ArrowRight', 'Shift+ArrowRight', 'ArrowLeft', 'Shift+Enter', 'Control+Enter']) {
      await page.keyboard.press(key);
    }
    await expectAt(page, 1, 0);
  });

  test('Enter means Caught; focus starts on Caught and stays there', async ({ page }) => {
    await startSeaCreatures(page);
    await expect(caughtButton(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await expectAt(page, 2, 1);
    expect((await stored(page)).caught).toEqual([sea[0].id]);
    await expect(caughtButton(page)).toBeFocused();
    await expect(caughtButton(page)).toHaveAttribute('aria-keyshortcuts', 'Enter');

    await blur(page);
    await page.keyboard.press('Enter');
    await expectAt(page, 3, 2);
  });

  test('Enter and Space on a focused Next button press Next', async ({ page }) => {
    await startSeaCreatures(page);
    await nextButton(page).focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await page.keyboard.press('Space');
    await expectAt(page, 4, 0);
    await expect(nextButton(page)).toBeFocused();
  });

  test('after clicking Next with the mouse, Enter catches', async ({ page }) => {
    await startSeaCreatures(page);
    await nextButton(page).click();
    await expect(caughtButton(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await expectAt(page, 3, 1);
    expect((await stored(page)).caught).toEqual([sea[1].id]);
  });

  test('Enter on the last critter finishes; Enter on the category runs it again', async ({ page }) => {
    await startSeaCreatures(page);
    for (let step = 1; step < 40; step++) await page.keyboard.press('ArrowRight');
    await expect(progressLine(page)).toHaveText('Sea creatures · 40 of 40');
    await page.keyboard.press('Enter');

    const category = dialog(page).locator('[data-category="sea"]');
    await expect(category).toHaveText('Sea creatures 1 of 40 caught ✓ Synced');
    await expect(category).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(progressLine(page)).toHaveText('Sea creatures · 1 of 39');
    await expect(currentName(page)).toHaveText(sea[0].name.en);
  });

  test('Enter on ✕ exits without catching, and Enter outside the sync does nothing', async ({ page }) => {
    await startSeaCreatures(page);
    await dialog(page).getByRole('button', { name: 'Exit Critterpedia Sync' }).focus();
    await page.keyboard.press('Enter');
    await expect(dialog(page)).toHaveCount(0);

    await blur(page);
    await page.keyboard.press('Enter');
    expect((await stored(page)).caught).toEqual([]);
  });

  test('dragging with the mouse is not a swipe', async ({ page }) => {
    await startSeaCreatures(page);
    const area = await dialog(page).locator('[aria-live]').boundingBox();
    if (!area) throw new Error('no swipe area');
    await page.mouse.move(area.x + area.width / 2 + 100, area.y + area.height / 2);
    await page.mouse.down();
    await page.mouse.move(area.x + area.width / 2 - 100, area.y + area.height / 2, { steps: 10 });
    await page.mouse.up();
    await expectAt(page, 1, 0);
  });
});

test.describe('swipe', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  /**
   * Uses CDP touch events, so Chrome's touch-action handling applies as on a phone.
   * @param {import('@playwright/test').Page} page
   * @param {[number, number]} from
   * @param {[number, number]} to
   * @param {() => Promise<unknown>} [whileTouching]
   */
  async function swipe(page, from, to, whileTouching) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from[0], y: from[1] }] });
    for (let i = 1; i <= 10; i++) {
      const x = from[0] + ((to[0] - from[0]) * i) / 10;
      const y = from[1] + ((to[1] - from[1]) * i) / 10;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
    }
    const seen = await whileTouching?.();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
    return seen;
  }

  /** @param {import('@playwright/test').Page} page */
  async function center(page) {
    const area = await dialog(page).locator('[aria-live]').boundingBox();
    if (!area) throw new Error('no swipe area');
    return { x: area.x + area.width / 2, y: area.y + area.height / 2 };
  }

  /** @param {import('@playwright/test').Page} page */
  const offset = (page) => dialog(page).locator('[aria-live] > div').evaluate((el) => /** @type {HTMLElement} */ (el).style.transform);

  test('the swipe area keeps vertical scrolling and pinch-zoom', async ({ page }) => {
    await startSeaCreatures(page);
    await expect(dialog(page).locator('[aria-live]')).toHaveCSS('touch-action', 'pan-y pinch-zoom');
  });

  test('sideways moves are kept from the browser, up-and-down ones are not', async ({ page }) => {
    // So a browser (like Safari in a tab) can't take over a swipe and cancel it halfway.
    await startSeaCreatures(page);
    await page.evaluate(() => {
      /** @type {any} */ (window).moves = [];
      // On window it runs after the app's listener, so defaultPrevented is final.
      window.addEventListener('touchmove', (event) => /** @type {any} */ (window).moves.push(event.defaultPrevented));
    });
    const moves = () => page.evaluate(() => /** @type {boolean[]} */ (/** @type {any} */ (window).moves).splice(0));
    const { x, y } = await center(page);

    await swipe(page, [x + 20, y], [x - 20, y]); // sideways, too short to move on
    const sideways = await moves();
    // Chrome reports moves only after about 15 px, past the app's 8 px decision point.
    expect(sideways.length).toBeGreaterThan(0);
    expect(sideways.every(Boolean)).toBe(true);

    await swipe(page, [x, y - 60], [x - 10, y + 60]);
    expect((await moves()).every((prevented) => !prevented)).toBe(true);
    await expectAt(page, 1, 0);
  });

  test('swiping left means Next; the critter follows the finger', async ({ page }) => {
    await startSeaCreatures(page);
    const { x, y } = await center(page);
    const during = await swipe(page, [x + 80, y], [x - 80, y], () => offset(page));
    expect(during).toMatch(/^translateX\(-\d+/);
    await expectAt(page, 2, 0);
    await expect(currentName(page)).toHaveText(sea[1].name.en);
    expect(await offset(page)).toBe('translateX(0px)');
  });

  test('short, rightward and vertical swipes do nothing', async ({ page }) => {
    await startSeaCreatures(page);
    const { x, y } = await center(page);
    await swipe(page, [x + 20, y], [x - 20, y]);
    await swipe(page, [x - 80, y], [x + 80, y]);
    await swipe(page, [x, y - 100], [x - 70, y + 100]);
    await expectAt(page, 1, 0);
    await expect.poll(() => offset(page)).toBe('translateX(0px)');
  });

  test('a swipe across the Caught button neither advances nor catches; taps still work', async ({ page }) => {
    await startSeaCreatures(page);
    const box = await caughtButton(page).boundingBox();
    if (!box) throw new Error('no Caught button');
    const y = box.y + box.height / 2;
    await swipe(page, [box.x + box.width - 10, y], [box.x + 10, y]);
    await expectAt(page, 1, 0);

    await caughtButton(page).tap();
    await expectAt(page, 2, 1);
    await nextButton(page).tap();
    await expectAt(page, 3, 1);
  });

  test('swiping on the last critter finishes the category', async ({ page }) => {
    await startSeaCreatures(page);
    for (let step = 1; step < 40; step++) await page.keyboard.press('ArrowRight');
    const { x, y } = await center(page);
    await swipe(page, [x + 80, y], [x - 80, y]);
    await expect(dialog(page).locator('[data-category="sea"]')).toHaveText('Sea creatures 0 of 40 caught ✓ Synced');
  });
});
