import {
  dialog,
  expect,
  hemisphereSelect,
  importData,
  openMenuItem,
  profileGroup,
  row,
  SKIP_WELCOME,
  skipWelcome,
  stored,
  test,
} from './support.js';

/** @param {import('@playwright/test').Page} page */
const menuButton = (page, name = 'Menu') => page.getByRole('button', { name });
/** @param {import('@playwright/test').Page} page */
const shownProfile = (page) => page.getByTestId('shown-profile');

/**
 * @param {import('@playwright/test').Page} page
 * @param {string[]} expected
 */
async function expectProfiles(page, expected, group = 'Profile') {
  const buttons = profileGroup(page, group).locator('button[aria-pressed]');
  await expect(buttons).toHaveCount(expected.length);
  for (const [index, label] of expected.entries()) {
    const shown = label.startsWith('✓ ');
    await expect(buttons.nth(index)).toHaveAccessibleName(shown ? label.slice(2) : label);
    await expect(buttons.nth(index)).toHaveAttribute('aria-pressed', String(shown));
  }
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function addProfile(page, name, { skip = true } = {}) {
  await openMenuItem(page, 'New profile');
  await dialog(page).getByLabel('Name').fill(name);
  await dialog(page).getByRole('button', { name: 'Add profile' }).click();
  if (skip) await page.getByRole('button', { name: SKIP_WELCOME }).click();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function switchTo(page, name) {
  await menuButton(page).click();
  await profileGroup(page).getByRole('button', { name, exact: true }).click();
}

/** @param {import('@playwright/test').Page} page */
async function openEdit(page) {
  await openMenuItem(page, 'Edit profile');
  await expect(dialog(page)).toBeVisible();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
const catchCritter = (page, name) => row(page, name).getByRole('button', { name: 'Caught it' }).click();

test('there is one profile at first; a new one starts empty, on the welcome screen', async ({ page }) => {
  await skipWelcome(page);
  await catchCritter(page, 'Pale chub');
  await menuButton(page).click();
  await expectProfiles(page, ['✓ Kim']);
  // With one profile, the menu button doesn't name it.
  await expect(shownProfile(page)).toHaveCount(0);

  await page.getByRole('button', { name: 'New profile' }).click();
  await expect(dialog(page).getByRole('heading', { name: 'New profile' })).toBeVisible();
  const field = dialog(page).getByLabel('Name');
  await expect(field).toBeFocused();
  const add = dialog(page).getByRole('button', { name: 'Add profile' });
  await expect(add).toBeDisabled();
  await field.fill('   ');
  await expect(add).toBeDisabled();
  await field.fill('Test');
  await add.click();

  // It has its name already, so its welcome screen skips the name step.
  await expect(page.getByRole('heading', { name: 'Welcome, Test!' })).toBeVisible();
  await page.getByRole('button', { name: SKIP_WELCOME }).click();
  await expect(row(page, 'Pale chub')).toHaveCount(1);
  await expect(shownProfile(page)).toHaveText('Test');
  await expect(menuButton(page)).toHaveAccessibleName('Menu, Test');
  expect(await stored(page, 2)).toMatchObject({ settings: { name: 'Test' }, caught: [] });
  expect((await stored(page)).caught).toEqual(['pale-chub']);

  await menuButton(page).click();
  await expectProfiles(page, ['Kim', '✓ Test']);
});

test('closing the new-profile dialog adds nothing', async ({ page }) => {
  await skipWelcome(page);
  await openMenuItem(page, 'New profile');
  await dialog(page).getByLabel('Name').fill('Test');
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toHaveCount(0);
  await expect(menuButton(page)).toBeFocused();
  await menuButton(page).click();
  await expectProfiles(page, ['✓ Kim']);
});

test('a new profile closed on its welcome screen is not kept', async ({ page }) => {
  await skipWelcome(page);
  await catchCritter(page, 'Pale chub');
  await addProfile(page, 'Test', { skip: false });
  await expect(page.getByRole('heading', { name: 'Welcome, Test!' })).toBeVisible();
  expect(await stored(page, 2)).toBeNull();

  await page.reload();
  await expect(row(page, 'Pale chub')).toHaveCount(0); // back in profile 1, where it's caught
  await menuButton(page).click();
  await expectProfiles(page, ['✓ Kim']);
});

test('a new profile’s welcome screen leads back to the one before', async ({ page }) => {
  await skipWelcome(page);
  await catchCritter(page, 'Pale chub');
  await addProfile(page, 'Test', { skip: false });
  await page.getByRole('button', { name: 'Back to Kim' }).click();

  await expect(row(page, 'Pale chub')).toHaveCount(0); // profile 1, where it's caught
  await menuButton(page).click();
  await expectProfiles(page, ['✓ Kim']);
  expect(await stored(page, 2)).toBeNull();
});

test('no two profiles share a name', async ({ page }) => {
  await skipWelcome(page);
  await addProfile(page, 'Mia');

  await openMenuItem(page, 'New profile');
  await dialog(page).getByLabel('Name').fill('mia');
  await expect(dialog(page).getByText('There’s already a profile called “mia”.')).toBeVisible();
  await expect(dialog(page).getByRole('button', { name: 'Add profile' })).toBeDisabled();
  await page.keyboard.press('Escape');

  await openEdit(page);
  await dialog(page).getByLabel('Name (optional)').fill('KIM');
  await expect(dialog(page).getByText('There’s already a profile called “KIM”.')).toBeVisible();
  await expect(dialog(page).getByRole('button', { name: 'Save' })).toBeDisabled();
  await page.keyboard.press('Escape');

  // Exporting renames the profile too, so it checks the name as well.
  await openMenuItem(page, 'Export data');
  await dialog(page).getByLabel('Name (optional)').fill('Kim');
  await expect(dialog(page).getByText('There’s already a profile called “Kim”.')).toBeVisible();
  await expect(dialog(page).getByRole('button', { name: 'Copy code' })).toBeDisabled();
  await expect(dialog(page).getByRole('link', { name: 'Send by email' })).toHaveCount(0);
  await dialog(page).getByLabel('Name (optional)').fill('Mia');
  await expect(dialog(page).getByRole('button', { name: 'Copy code' })).toBeEnabled();
});

test('switching shows each profile’s progress; the one used last opens next time', async ({ page }) => {
  await skipWelcome(page);
  await catchCritter(page, 'Pale chub');
  await addProfile(page, 'Test');
  await catchCritter(page, 'Koi');

  await switchTo(page, 'Kim');
  await expect(shownProfile(page)).toHaveText('Kim');
  await expect(row(page, 'Pale chub')).toHaveCount(0);
  await expect(row(page, 'Koi')).toHaveCount(1);

  await page.reload();
  await expect(shownProfile(page)).toHaveText('Kim');
  await switchTo(page, 'Test');
  await page.reload();
  await expect(shownProfile(page)).toHaveText('Test');
  await expect(row(page, 'Koi')).toHaveCount(0);
  await expect(row(page, 'Pale chub')).toHaveCount(1);
});

test('a new profile starts with the hemisphere and language; then each keeps its own language', async ({ page }) => {
  await skipWelcome(page);
  await hemisphereSelect(page).selectOption('south');
  await openMenuItem(page, 'Deutsch');

  await openMenuItem(page, 'Neues Profil', 'Menü');
  await dialog(page).getByLabel('Name').fill('Mia');
  await dialog(page).getByRole('button', { name: 'Profil anlegen' }).click();
  await page.getByRole('button', { name: 'Nein danke, zeig mir einfach die Liste' }).click();
  await expect(hemisphereSelect(page)).toHaveValue('south');
  await expect(page.getByRole('tab').first()).toHaveText('Alle');

  await openMenuItem(page, 'English', 'Menü');
  await expect(page.getByRole('tab').first()).toHaveText('All');
  await switchTo(page, 'Kim');
  await expect(page.getByRole('tab').first()).toHaveText('Alle');
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await menuButton(page, 'Menü').click();
  await profileGroup(page, 'Profil').getByRole('button', { name: 'Mia' }).click();
  await expect(page.getByRole('tab').first()).toHaveText('All');
});

test('Edit profile renames it, and the export offers the new name', async ({ page }) => {
  await skipWelcome(page);
  await addProfile(page, 'Tset');
  await openEdit(page);
  const field = dialog(page).getByLabel('Name (optional)');
  await expect(field).toHaveValue('Tset');
  await field.fill('Test');
  await field.press('Enter');

  await expect(dialog(page)).toHaveCount(0);
  await expect(shownProfile(page)).toHaveText('Test');
  expect((await stored(page, 2)).settings.name).toBe('Test');
  await openMenuItem(page, 'Export data');
  await expect(dialog(page).getByLabel('Name (optional)')).toHaveValue('Test');
});

test('deleting a profile asks first, then shows the first one left', async ({ page }) => {
  await skipWelcome(page);
  await catchCritter(page, 'Pale chub');
  await addProfile(page, 'Test');
  await openEdit(page);

  await dialog(page).getByRole('button', { name: 'Delete profile' }).click();
  await expect(dialog(page).getByText('Delete “Test” and all its progress?')).toBeVisible();
  await expect(dialog(page).getByText('This is the only profile')).toHaveCount(0);
  const keep = dialog(page).getByRole('button', { name: 'Keep it' });
  await expect(keep).toBeFocused();
  await keep.click();
  await expect(dialog(page).getByRole('button', { name: 'Delete profile' })).toBeFocused();
  expect(await stored(page, 2)).not.toBeNull();

  await dialog(page).getByRole('button', { name: 'Delete profile' }).click();
  await dialog(page).getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(row(page, 'Pale chub')).toHaveCount(0); // profile 1, where it's caught
  await expect(shownProfile(page)).toHaveCount(0); // only one left
  expect(await stored(page, 2)).toBeNull();
});

test('deleting the only profile starts over', async ({ page }) => {
  await skipWelcome(page);
  await catchCritter(page, 'Pale chub');
  await openEdit(page);
  await dialog(page).getByRole('button', { name: 'Delete profile' }).click();
  await expect(dialog(page).getByText('This is the only profile')).toBeVisible();
  await dialog(page).getByRole('button', { name: 'Delete', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Welcome to ACNH Critters' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'What’s your name?' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Back to/ })).toHaveCount(0);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});

test('importing from the menu replaces only the profile shown', async ({ page }) => {
  await skipWelcome(page);
  await catchCritter(page, 'Pale chub');
  await addProfile(page, 'Test');
  await openMenuItem(page, 'Import data');
  await importData(page, { version: 1, caught: ['koi'] });

  await expect(dialog(page)).toHaveCount(0);
  // The code has no name, so the profile keeps its own.
  expect(await stored(page, 2)).toMatchObject({ settings: { name: 'Test' }, caught: ['koi'] });
  expect((await stored(page)).caught).toEqual(['pale-chub']);
});

test('a new profile can start with progress from another device, keeping its name', async ({ page }) => {
  await skipWelcome(page);
  await addProfile(page, 'Mia', { skip: false });
  await importData(page, { version: 1, settings: { hemisphere: 'south', name: 'Antje' }, caught: ['koi'] });

  await expect(hemisphereSelect(page)).toHaveValue('south');
  await expect(shownProfile(page)).toHaveText('Mia');
  expect(await stored(page, 2)).toMatchObject({ settings: { name: 'Mia' }, caught: ['koi'] });
});

test('another tab of the app sees profiles added and deleted in this one', async ({ page, context }) => {
  await skipWelcome(page);
  const other = await context.newPage();
  await other.goto('/');
  await addProfile(page, 'Test');
  await menuButton(other).click();
  await expectProfiles(other, ['✓ Kim', 'Test']);
  await profileGroup(other).getByRole('button', { name: 'Test' }).click();
  await expect(shownProfile(other)).toHaveText('Test');

  // Saving in the other tab must not bring back the profile deleted here.
  await openEdit(page);
  await dialog(page).getByRole('button', { name: 'Delete profile' }).click();
  await dialog(page).getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(shownProfile(other)).toHaveCount(0);
  await catchCritter(other, 'Pale chub');
  expect(await stored(other, 2)).toBeNull();
  expect((await stored(other)).caught).toEqual(['pale-chub']);
});

test('progress saved before there were profiles becomes profile 1, with its language', async ({ page }) => {
  await page.goto('/');
  // As version 1.0.0 saved it.
  await page.evaluate(() => {
    localStorage.setItem(
      'acnh-critters',
      JSON.stringify({
        version: 1,
        settings: { hemisphere: 'north', trackDonations: false, showCaught: false, name: 'Antje' },
        caught: ['pale-chub'],
        donated: [],
        synced: [],
      }),
    );
    localStorage.setItem('acnh-critters-locale', 'de');
  });
  await page.reload();

  await expect(page.getByRole('tab').first()).toHaveText('Alle');
  await expect(row(page, 'Döbel')).toHaveCount(0); // the caught pale chub
  await menuButton(page, 'Menü').click();
  await expectProfiles(page, ['✓ Antje'], 'Profil');
  expect((await stored(page)).settings.locale).toBe('de');
  expect(await page.evaluate(() => localStorage.getItem('acnh-critters-locale'))).toBeNull();
});

test.describe('on a small phone', () => {
  // The smallest width in layout.spec.js.
  test.use({ viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true });

  test('a long profile name is cut short to fit the header', async ({ page }) => {
    await skipWelcome(page);
    await addProfile(page, 'W'.repeat(20));
    const button = await menuButton(page).boundingBox();
    expect(button && button.x + button.width).toBeLessThanOrEqual(360);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    // Overflowing text means it's cut with an ellipsis, not wrapped.
    expect(await shownProfile(page).evaluate((name) => name.scrollWidth > name.clientWidth)).toBe(true);
  });
});
