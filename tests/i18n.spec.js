import {
  critters,
  expect,
  fields,
  hemisphereSelect,
  importData,
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

const SKIP_DE = 'Nein danke, zeig mir einfach die Liste';
const englishTerms = new Set(critters.flatMap((c) => [c.location, c.shadow, c.speed]).filter(Boolean));

test.describe('German browser', () => {
  test.use({ locale: 'de-DE' });

  test('shows the welcome screen in German', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Willkommen bei ACNH Critters' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    await page.getByRole('textbox', { name: 'Wie heißt du?' }).fill('Kim');
    await page.getByRole('button', { name: 'Weiter' }).click();
    await expect(page.getByRole('heading', { name: 'Willkommen, Kim!' })).toBeVisible();
  });

  test('shows the list in German', async ({ page }) => {
    await skipWelcome(page, SKIP_DE);
    await expect(page.getByRole('tab')).toHaveText(['Alle', 'Fische', 'Insekten', 'Meerestiere']);
    await expect(hemisphereSelect(page).locator('option')).toHaveText(['Nordhalbkugel', 'Südhalbkugel']);
    await expect(monthSelect(page).locator('option')).toHaveText([
      'Alle Monate', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
    ]);
    await expect(showCaughtSwitch(page)).toHaveAccessibleName('Gefangene zeigen');
    await expect(rows(page).first().getByRole('button')).toHaveText('Gefangen!');
  });

  test('translates every name, location, size and time', async ({ page }) => {
    await skipWelcome(page, SKIP_DE);
    await monthSelect(page).selectOption({ label: 'Alle Monate' });
    const shown = await rows(page).evaluateAll((items) =>
      items.map((item) => [...item.querySelectorAll('span')].map((span) => span.textContent ?? '')),
    );
    const all = shown.map((spans) => spans.map(normalize));

    expect(all.map(([name]) => name)).toEqual(critters.map((c) => c.name.de));
    const leftovers = all.filter(([, location, , notes]) =>
      englishTerms.has(location) || [...englishTerms].some((term) => notes.includes(`: ${term}`)),
    );
    expect(leftovers).toEqual([]);
    const time = /^(Ganztägig|\d+–\d+ Uhr)(, (Ganztägig|\d+–\d+ Uhr))*$/;
    const seasonal = /^([A-ZÄÖÜ][a-zä]+ – [A-ZÄÖÜ][a-zä]+: (Ganztägig|\d+–\d+ Uhr))( · .*)?$/;
    expect(all.filter(([, , t]) => !time.test(t) && !seasonal.test(t))).toEqual([]);
  });

  test('formats sample rows like the game', async ({ page }) => {
    await skipWelcome(page, SKIP_DE);
    await monthSelect(page).selectOption({ label: 'Alle Monate' });
    expect(await fields(row(page, 'Napoleonfisch'))).toEqual(['Napoleonfisch', 'Meer', '4–21 Uhr', 'Schattengröße: Riesig']);
    expect((await fields(row(page, 'Piranha')))[2]).toBe('9–16 Uhr, 21–4 Uhr');
    expect(await fields(row(page, 'Pazifik-Taschenkrebs'))).toEqual([
      'Pazifik-Taschenkrebs', 'Meer (tauchen)', 'Ganztägig', 'Schattengröße: Mittel · Tempo: Mittel',
    ]);
    await hemisphereSelect(page).selectOption('south');
    expect((await fields(row(page, 'Saibling')))[2]).toBe('Mär – Mai: Ganztägig · Sep – Dez: 16–9 Uhr');
  });

  test('shows the caught state in German', async ({ page }) => {
    await skipWelcome(page, SKIP_DE);
    await setShowCaught(page, true);
    const button = rows(page).first().getByRole('button');
    await button.click();
    await expect(button).toHaveText('Gefangen ✓');
  });

  test('shows import errors in German', async ({ page }) => {
    await page.goto('/');
    await importData(page, '{"x": 1}', 'Daten von einem anderen Gerät importieren');
    await expect(page.getByRole('alert')).toHaveText('Das ist kein ACNH-Critters-Übertragungscode.');
  });

  test('the language picked in the menu wins over the browser and is remembered', async ({ page }) => {
    await skipWelcome(page, SKIP_DE);
    await page.getByRole('button', { name: 'Menü' }).click();
    await page.getByRole('button', { name: 'English' }).click();
    await expect(page.getByRole('button', { name: 'English' })).toHaveCount(0);
    await expect(page.getByRole('tab').first()).toHaveText('All');
    await expect(row(page, 'Pale chub')).toHaveCount(1);
    await expect(row(page, 'Döbel')).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole('tab').first()).toHaveText('All');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    // Each profile keeps its own language choice.
    expect((await stored(page)).settings.locale).toBe('en');

    await page.getByRole('button', { name: 'Menu' }).click();
    await expect(page.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Deutsch' }).click();
    await expect(page.getByRole('tab').first()).toHaveText('Alle');
  });
});

for (const [locale, heading] of [
  ['en-GB', 'Welcome to ACNH Critters'],
  ['de-CH', 'Willkommen bei ACNH Critters'],
  ['fr-FR', 'Welcome to ACNH Critters'],
]) {
  test.describe(`${locale} browser`, () => {
    test.use({ locale });

    test(`starts in ${heading.startsWith('Welcome') ? 'English' : 'German'}`, async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    });
  });
}
