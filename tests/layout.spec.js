import { expect, rows, setShowCaught, skipWelcome, test } from './support.js';

const SKIP = { 'en-US': 'No thanks, just show me the list', 'de-DE': 'Nein danke, zeig mir einfach die Liste' };

for (const width of [360, 390]) {
  for (const locale of /** @type {const} */ (['en-US', 'de-DE'])) {
    test.describe(`${width}px phone, ${locale}`, () => {
      test.use({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true, locale });

      test('nothing overflows and the catch button has its own column', async ({ page }) => {
        await skipWelcome(page, SKIP[locale]);
        // One caught row, so both button labels are measured.
        await setShowCaught(page, true);
        await rows(page).first().getByRole('button').click();

        const layout = await page.evaluate(() => {
          const tablist = /** @type {HTMLElement} */ (document.querySelector('[role=tablist]'));
          const items = [...document.querySelectorAll('ul')[0].querySelectorAll('li')].map((li) => {
            const details = /** @type {HTMLElement} */ (li.querySelector('div')).getBoundingClientRect();
            const button = /** @type {HTMLElement} */ (li.querySelector('button'));
            const box = button.getBoundingClientRect();
            return {
              besideDetails: box.left >= details.right - 1,
              textFits: button.scrollWidth <= button.clientWidth,
              width: Math.round(box.width),
              height: box.height,
            };
          });
          return {
            pageOverflow: document.documentElement.scrollWidth - innerWidth,
            tabsOverflow: tablist.scrollWidth - tablist.clientWidth,
            items,
          };
        });

        expect(layout.pageOverflow).toBeLessThanOrEqual(0);
        expect(layout.tabsOverflow).toBeLessThanOrEqual(0);
        expect(layout.items.filter((item) => !item.besideDetails || !item.textFits)).toEqual([]);
        // Same width on every row, so the buttons line up; tall enough to tap.
        expect(new Set(layout.items.map((item) => item.width)).size).toBe(1);
        expect(Math.min(...layout.items.map((item) => item.height))).toBeGreaterThanOrEqual(44);
      });
    });
  }
}

test.describe('phone header', () => {
  test.use({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });

  test('only the filters and tabs stay pinned, and they stay compact', async ({ page }) => {
    await skipWelcome(page);
    const bar = page.locator('div.sticky');
    expect((await bar.boundingBox())?.height).toBeLessThan(110);

    await page.evaluate(() => scrollTo(0, 1500));
    await expect.poll(async () => (await bar.boundingBox())?.y).toBe(0);
    await expect(page.getByRole('heading', { name: 'ACNH Critters' })).not.toBeInViewport();
  });

  test('the show-caught switch sits at the end of the tab row and is easy to tap', async ({ page }) => {
    await skipWelcome(page);
    const lastTab = await page.getByRole('tab').last().boundingBox();
    const toggle = await page.getByRole('switch').boundingBox();
    if (!lastTab || !toggle) throw new Error('tab row not rendered');
    expect(toggle.x).toBeGreaterThanOrEqual(lastTab.x + lastTab.width - 1);
    expect(toggle.y).toBeGreaterThanOrEqual(lastTab.y - 1);
    expect(toggle.y + toggle.height).toBeLessThanOrEqual(lastTab.y + lastTab.height + 1);
    expect(toggle.x + toggle.width).toBeLessThanOrEqual(390);
    expect(toggle.height).toBeGreaterThanOrEqual(44);
  });
});

test('on wide screens the tabs and filters share one row', async ({ page }) => {
  await skipWelcome(page);
  const bar = await page.locator('div.sticky').boundingBox();
  const tab = await page.getByRole('tab').first().boundingBox();
  const select = await page.locator('select').first().boundingBox();
  if (!bar || !tab || !select) throw new Error('filter bar not rendered');
  expect(bar.height).toBeLessThan(70);
  expect(Math.abs(tab.y + tab.height / 2 - (select.y + select.height / 2))).toBeLessThan(12);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
});
