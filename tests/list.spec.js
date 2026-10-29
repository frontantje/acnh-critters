import { readFileSync } from 'node:fs';
import {
  available,
  critters,
  expect,
  fields,
  hemisphereSelect,
  importData,
  list,
  MONTH,
  monthSelect,
  normalize,
  row,
  rows,
  setShowCaught,
  showCaughtSwitch,
  skipWelcome,
  stored,
  test,
} from './support.js';

// Time texts from the community spreadsheet, as they were in the data before
// the app started formatting times itself, in the "All months" format.
/** @type {Record<string, { north: string, south: string }>} */
const expectedTimes = JSON.parse(readFileSync(new URL('./expected-times.json', import.meta.url), 'utf8'));

test.beforeEach(async ({ page }) => {
  await skipWelcome(page);
});

test('defaults to the All tab, the current month and hiding caught critters', async ({ page }) => {
  await expect(page.getByRole('tab')).toHaveText(['All', 'Fish', 'Insects', 'Sea creatures']);
  await expect(page.getByRole('tab', { name: 'All', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(monthSelect(page)).toHaveValue(String(MONTH));
  await expect(hemisphereSelect(page)).toHaveValue('north');
  await expect(showCaughtSwitch(page)).toHaveAttribute('aria-checked', 'false');
});

test('tabs show the critters available this month', async ({ page }) => {
  for (const [tab, type] of /** @type {const} */ ([['All', 'all'], ['Fish', 'fish'], ['Insects', 'bug'], ['Sea creatures', 'sea']])) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    await expect(rows(page)).toHaveCount(available(type).length);
  }
});

test('rows show name, location, time and notes', async ({ page }) => {
  expect(await fields(row(page, 'Pale chub'))).toEqual(['Pale chub', 'River', '9 AM – 4 PM', 'Shadow size: X-Small']);
  expect(await fields(row(page, 'Ant'))).toEqual(['Ant', 'On rotten turnips or candy', 'All day', '']);
  expect(await fields(row(page, 'Octopus'))).toEqual(['Octopus', 'Sea (diving)', 'All day', 'Shadow size: Medium · Speed: Slow']);
  await expect(row(page, 'Pale chub').getByRole('button')).toHaveText('Caught it');
});

test('All months shows all 200 critters', async ({ page }) => {
  await monthSelect(page).selectOption({ label: 'All months' });
  await expect(rows(page)).toHaveCount(200);
});

test('times match the source data for every critter in both hemispheres', async ({ page }) => {
  await monthSelect(page).selectOption({ label: 'All months' });
  for (const hemisphere of /** @type {const} */ (['north', 'south'])) {
    await hemisphereSelect(page).selectOption(hemisphere);
    const shown = (await rows(page).evaluateAll((items) => items.map((item) => item.querySelectorAll('span')[2].textContent ?? ''))).map(normalize);
    expect(shown).toEqual(critters.map((critter) => expectedTimes[critter.id][hemisphere]));
  }
});

test('seasonal hours follow the selected month', async ({ page }) => {
  await page.getByRole('tab', { name: 'Fish', exact: true }).click();
  await monthSelect(page).selectOption({ label: 'October' });
  expect((await fields(row(page, 'Char')))[2]).toBe('All day');
  await monthSelect(page).selectOption({ label: 'April' });
  expect((await fields(row(page, 'Char')))[2]).toBe('4 PM – 9 AM');
  await hemisphereSelect(page).selectOption('south');
  expect((await fields(row(page, 'Char')))[2]).toBe('All day');
});

test('the hemisphere changes the list and is remembered', async ({ page }) => {
  await hemisphereSelect(page).selectOption('south');
  await expect(rows(page)).toHaveCount(available('all', 'south').length);
  await page.reload();
  await expect(hemisphereSelect(page)).toHaveValue('south');
});

test.describe('catching', () => {
  test('a caught critter disappears, and the switch shows it again', async ({ page }) => {
    await page.getByRole('tab', { name: 'Fish', exact: true }).click();
    await row(page, 'Pale chub').getByRole('button', { name: 'Caught it' }).click();
    await expect(row(page, 'Pale chub')).toHaveCount(0);
    await expect(rows(page)).toHaveCount(available('fish').length - 1);
    expect((await stored(page)).caught).toEqual(['pale-chub']);

    await setShowCaught(page, true);
    await expect(rows(page)).toHaveCount(available('fish').length);
    await expect(row(page, 'Pale chub').getByRole('button')).toHaveText('Caught ✓');
  });

  test('caught critters and the switch are remembered', async ({ page }) => {
    await row(page, 'Pale chub').getByRole('button', { name: 'Caught it' }).click();
    await setShowCaught(page, true);
    await page.reload();
    await expect(showCaughtSwitch(page)).toHaveAttribute('aria-checked', 'true');
    await expect(row(page, 'Pale chub').getByRole('button')).toHaveText('Caught ✓');
  });

  test('clicking Caught ✓ un-catches', async ({ page }) => {
    await setShowCaught(page, true);
    const button = row(page, 'Pale chub').getByRole('button');
    await button.click();
    await expect(button).toHaveText('Caught ✓');
    await button.click();
    await expect(button).toHaveText('Caught it');
    expect((await stored(page)).caught).toEqual([]);

    await setShowCaught(page, false);
    await expect(row(page, 'Pale chub')).toHaveCount(1);
  });
});

test('says so when everything in a tab is caught', async ({ page, newDevice }) => {
  const device = await newDevice();
  await importData(device, { version: 1, caught: critters.filter((c) => c.type === 'fish').map((c) => c.id) });
  await device.getByRole('tab', { name: 'Fish', exact: true }).click();
  await expect(list(device).locator('li')).toHaveText(["You've caught everything here!"]);

  await device.getByRole('tab', { name: 'All', exact: true }).click();
  await monthSelect(device).selectOption({ label: 'All months' });
  await expect(rows(device)).toHaveCount(120);
});
