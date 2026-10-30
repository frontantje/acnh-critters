import { readFileSync } from 'node:fs';
import { expect, skipWelcome, test } from './support.js';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test.beforeEach(async ({ page }) => {
  await skipWelcome(page);
});

test('shows the app version at the bottom', async ({ page }) => {
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.getByTestId('menu-version')).toHaveText(`Version ${version}`);
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

test('Export data opens the export dialog; closing it returns focus to the menu button', async ({ page }) => {
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Export data' }).click();
  await expect(page.getByRole('button', { name: 'Export data' })).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Export data' })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Menu' })).toBeFocused();
});
