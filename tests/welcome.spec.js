import { expect, hemisphereSelect, importData, showCaughtSwitch, skipWelcome, stored, test } from './support.js';

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
    await importData(page, {
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
    await importData(page, { version: 1, settings: { hemisphere: 'north' }, caught: [] });
    await expect(hemisphereSelect(page)).toHaveValue('north');
  });

  test('rejects text that is not an export', async ({ page }) => {
    await page.goto('/');
    await importData(page, '{"hello": "world"}');
    await expect(page.getByRole('alert')).toHaveText("That's not an ACNH Critters transfer code.");
    await expect(page.getByRole('heading', { name: 'Welcome to ACNH Critters' })).toBeVisible();
    expect(await stored(page)).toBeNull();
  });

  test('rejects invalid JSON and codes from a newer version', async ({ page }) => {
    await page.goto('/');
    await importData(page, 'not json');
    await expect(page.getByRole('alert')).toHaveText("That's not an ACNH Critters transfer code.");
    await importData(page, { version: 99, caught: [] });
    await expect(page.getByRole('alert')).toHaveText('This code is from a newer version of the app.');
  });
});
