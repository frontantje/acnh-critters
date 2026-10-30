import { expect, hemisphereSelect, importData, showCaughtSwitch, skipWelcome, stored, test } from './support.js';

test('first visit asks for a name, then offers three choices', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome to ACNH Critters' })).toBeVisible();
  const field = page.getByRole('textbox', { name: 'What’s your name?' });
  await expect(field).toBeFocused();
  const next = page.getByRole('button', { name: 'Next' });
  await expect(next).toBeDisabled();
  // A code brings its own name, and there's no profile yet to go back to.
  await expect(page.getByRole('button')).toHaveText(['Next', 'Import data from another device']);

  await field.fill('  Kim ');
  await next.click();
  await expect(page.getByRole('heading', { name: 'Welcome, Kim!' })).toBeVisible();
  await expect(page.getByRole('button')).toHaveText([
    'Import data from another device',
    'Start Critterpedia Sync',
    'No thanks, just show me the list',
  ]);
  // Nothing is saved until one of the choices is picked.
  expect(await stored(page)).toBeNull();
});

test('skipping saves, so the welcome screen is not shown again', async ({ page }) => {
  await skipWelcome(page);
  await expect(page.getByRole('tab', { name: 'All', exact: true })).toBeVisible();
  expect((await stored(page)).settings.name).toBe('Kim');

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
