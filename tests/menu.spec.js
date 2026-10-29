import { readFile } from 'node:fs/promises';
import { expect, hemisphereSelect, row, skipWelcome, test } from './support.js';

test.beforeEach(async ({ page }) => {
  await skipWelcome(page);
});

test('opens and closes with Escape or a click elsewhere', async ({ page }) => {
  const menuButton = page.getByRole('button', { name: 'Menu' });
  const exportItem = page.getByRole('button', { name: 'Export data' });

  await menuButton.click();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
  await expect(exportItem).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(exportItem).toHaveCount(0);

  await menuButton.click();
  await page.getByRole('heading', { name: 'ACNH Critters' }).click();
  await expect(exportItem).toHaveCount(0);
});

test('exports progress and settings as a JSON file', async ({ page }) => {
  await row(page, 'Pale chub').getByRole('button', { name: 'Caught it' }).click();
  await hemisphereSelect(page).selectOption('south');

  await page.getByRole('button', { name: 'Menu' }).click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export data' }).click()]);

  expect(download.suggestedFilename()).toBe('acnh-critters-2026-10-15.json');
  expect(JSON.parse(await readFile(await download.path(), 'utf8'))).toEqual({
    version: 1,
    settings: { hemisphere: 'south', trackDonations: false, showCaught: false },
    caught: ['pale-chub'],
    donated: [],
    synced: [],
  });
  // The menu closes and focus goes back to its button.
  await expect(page.getByRole('button', { name: 'Export data' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Menu' })).toBeFocused();
});
