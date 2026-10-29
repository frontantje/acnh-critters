import { expect, hemisphereSelect, importFile, showCaughtSwitch, skipWelcome, stored, test } from './support.js';

test('first visit shows the welcome screen with three choices', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome to ACNH Critters' })).toBeVisible();
  for (const name of ['Import data from another device', 'Start Critterpedia Sync', 'No thanks, just show me the list']) {
    await expect(page.getByRole('button', { name })).toBeVisible();
  }
  expect(await stored(page)).toBeNull();
});

test('skipping saves, so the welcome screen is not shown again', async ({ page }) => {
  await skipWelcome(page);
  await expect(page.getByRole('tab', { name: 'All', exact: true })).toBeVisible();
  expect(await stored(page)).not.toBeNull();

  await page.reload();
  await expect(page.getByRole('tab', { name: 'All', exact: true })).toBeVisible();
  await expect(page.getByText('Welcome to ACNH Critters')).toHaveCount(0);
});

for (const [timezoneId, hemisphere] of [
  ['Europe/Berlin', 'north'],
  ['America/New_York', 'north'],
  ['Australia/Sydney', 'south'],
  ['America/Sao_Paulo', 'south'],
]) {
  test.describe(`time zone ${timezoneId}`, () => {
    test.use({ timezoneId });

    test(`guesses the ${hemisphere}ern hemisphere`, async ({ page }) => {
      await skipWelcome(page);
      await expect(hemisphereSelect(page)).toHaveValue(hemisphere);
    });
  });
}

test.describe('import', () => {
  test('restores progress and settings from an export', async ({ page }) => {
    await page.goto('/');
    await importFile(page, {
      version: 1,
      settings: { hemisphere: 'south', showCaught: true },
      caught: ['pale-chub', 'not-a-critter'],
      synced: ['sea', 'bogus'],
    });

    await expect(page.getByRole('tab', { name: 'All', exact: true })).toBeVisible();
    await expect(hemisphereSelect(page)).toHaveValue('south');
    await expect(showCaughtSwitch(page)).toHaveAttribute('aria-checked', 'true');
    // Unknown ids and categories are dropped.
    expect(await stored(page)).toMatchObject({ caught: ['pale-chub'], synced: ['sea'] });
  });

  test('uses the file’s hemisphere rather than the time zone guess', async ({ newDevice }) => {
    const page = await newDevice({ timezoneId: 'Australia/Sydney' });
    await importFile(page, { version: 1, settings: { hemisphere: 'north' }, caught: [] });
    await expect(hemisphereSelect(page)).toHaveValue('north');
  });

  test('rejects a file that is not an export', async ({ page }) => {
    await page.goto('/');
    await importFile(page, '{"hello": "world"}');
    await expect(page.getByRole('alert')).toHaveText("This file isn't an ACNH Critters export.");
    await expect(page.getByRole('heading', { name: 'Welcome to ACNH Critters' })).toBeVisible();
    expect(await stored(page)).toBeNull();
  });

  test('rejects invalid JSON and files from a newer version', async ({ page }) => {
    await page.goto('/');
    await importFile(page, 'not json');
    await expect(page.getByRole('alert')).toHaveText("This file isn't an ACNH Critters export.");
    await importFile(page, { version: 99, caught: [] });
    await expect(page.getByRole('alert')).toHaveText('This file was exported from a newer version of the app.');
  });
});
