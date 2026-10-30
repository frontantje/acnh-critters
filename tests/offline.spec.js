// Runs on the build served under /acnh-critters/, since only builds have the service worker.
import { critters, enterName, expect, SKIP_WELCOME, test } from './support.js';

/** @param {import('@playwright/test').Page} page */
async function waitForServiceWorker(page) {
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
}

test('after the first visit, the app and every critter icon work offline', async ({ page, context }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Welcome to ACNH Critters' })).toBeVisible();
  await waitForServiceWorker(page);

  await context.setOffline(true);
  await page.reload();
  await enterName(page);
  await page.getByRole('button', { name: SKIP_WELCOME }).click();
  await page.locator('select').nth(1).selectOption({ label: 'All months' });

  const icons = page.locator('ul').first().locator('img');
  await expect(icons).toHaveCount(critters.length);
  // Icons load lazily, so each one is scrolled into view first.
  const broken = [];
  for (const icon of await icons.all()) {
    await icon.scrollIntoViewIfNeeded();
    const ok = await icon.evaluate(async (img) => {
      const image = /** @type {HTMLImageElement} */ (img);
      await image.decode().catch(() => {});
      return image.naturalWidth > 0;
    });
    if (!ok) broken.push(await icon.getAttribute('src'));
  }
  expect(broken).toEqual([]);
});

test('progress made offline is kept', async ({ page, context }) => {
  await page.goto('./');
  await waitForServiceWorker(page);
  await context.setOffline(true);
  await page.reload();
  await enterName(page);
  await page.getByRole('button', { name: SKIP_WELCOME }).click();
  await page.locator('ul').first().locator('li').first().getByRole('button').click();

  await page.reload();
  await page.getByRole('switch').click();
  await expect(page.getByRole('button', { name: 'Caught ✓' })).toHaveCount(1);
});

test('the manifest makes it installable', async ({ page, request }) => {
  await page.goto('./');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBe('./manifest.webmanifest');

  const manifest = await (await request.get('manifest.webmanifest')).json();
  expect(manifest).toMatchObject({ name: 'ACNH Critters', short_name: 'Critters', display: 'standalone', start_url: './', scope: './' });
  for (const icon of manifest.icons) {
    const response = await request.get(icon.src);
    expect(response.ok(), icon.src).toBe(true);
    expect(response.headers()['content-type']).toBe('image/png');
  }
  const appleIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  expect((await request.get(appleIcon ?? '')).ok()).toBe(true);
});
