import { test as base, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

export { expect };

/** @type {any[]} */
export const critters = JSON.parse(readFileSync(new URL('../data/critters.json', import.meta.url), 'utf8'));

// A fixed date, so the default month filter is always October.
export const TODAY = new Date('2026-10-15T12:00:00');
export const MONTH = 10;

/**
 * @param {import('@playwright/test').BrowserContext} context
 * @param {string[]} errors
 */
async function prepare(context, errors) {
  await context.clock.setFixedTime(TODAY);
  // The app must work offline, so any request to another server is an error.
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => {
      errors.push(`loaded from another server: ${route.request().url()}`);
      return route.abort();
    },
  );
  context.on('page', (page) => {
    page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
    page.on('pageerror', (error) => errors.push(String(error)));
  });
}

export const test = base.extend({
  errors: async ({}, use) => {
    /** @type {string[]} */
    const errors = [];
    await use(errors);
    expect(errors, 'console errors').toEqual([]);
  },

  context: async ({ context, errors }, use) => {
    await prepare(context, errors);
    await use(context);
  },

  newDevice: async ({ browser, baseURL, errors }, use) => {
    /** @type {import('@playwright/test').BrowserContext[]} */
    const contexts = [];
    await use(async (/** @type {import('@playwright/test').BrowserContextOptions} */ options = {}) => {
      const context = await browser.newContext({ baseURL, locale: 'en-US', timezoneId: 'Europe/Berlin', ...options });
      contexts.push(context);
      await prepare(context, errors);
      const page = await context.newPage();
      await page.goto('/');
      return page;
    });
    await Promise.all(contexts.map((context) => context.close()));
  },
});

export const SKIP_WELCOME = 'No thanks, just show me the list';
export const FIRST_NAME = 'Kim';

/** @param {import('@playwright/test').Page} page */
export async function enterName(page, name = FIRST_NAME) {
  const field = page.getByRole('textbox');
  await field.fill(name);
  await field.press('Enter');
}

/** @param {import('@playwright/test').Page} page */
export async function startApp(page, name = FIRST_NAME) {
  await page.goto('/');
  await enterName(page, name);
}

/** @param {import('@playwright/test').Page} page */
export async function skipWelcome(page, label = SKIP_WELCOME) {
  await startApp(page);
  await page.getByRole('button', { name: label }).click();
}

/** @param {import('@playwright/test').Page} page */
export const dialog = (page) => page.getByRole('dialog');

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} item
 */
export async function openMenuItem(page, item, menu = 'Menu') {
  await page.getByRole('button', { name: menu }).click();
  await page.getByRole('button', { name: item }).click();
}

/** @param {import('@playwright/test').Page} page */
export const profileGroup = (page, name = 'Profile') => page.getByRole('group', { name });

/**
 * Reuses a dialog left open by an error, and avoids labels so it works in any language.
 * @param {import('@playwright/test').Page} page
 * @param {unknown} data
 */
export async function importData(page, data, opener = 'Import data from another device') {
  if (!(await dialog(page).isVisible())) await page.getByRole('button', { name: opener }).click();
  await dialog(page).locator('textarea').fill(typeof data === 'string' ? data : JSON.stringify(data));
  await dialog(page).locator('form').getByRole('button').click();
}

/** @param {import('@playwright/test').Page} page */
export function stored(page, profile = 1) {
  const key = profile === 1 ? 'acnh-critters' : `acnh-critters-${profile}`;
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), key);
}

// The critter list is the first list on the page; the sync dialog's comes later.
/** @param {import('@playwright/test').Page} page */
export const list = (page) => page.locator('ul').first();
/** @param {import('@playwright/test').Page} page */
export const rows = (page) => list(page).locator('li:has(button)');
/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
export const row = (page, name) => list(page).locator('li').filter({ has: page.getByText(name, { exact: true }) });

/** @param {import('@playwright/test').Locator} row */
export async function fields(row) {
  return (await row.locator('span').allTextContents()).map(normalize);
}

/** @param {string} text */
export const normalize = (text) => text.replace(/\s+/g, ' ').trim();

/** @param {import('@playwright/test').Page} page */
export const hemisphereSelect = (page) => page.locator('select').first();
/** @param {import('@playwright/test').Page} page */
export const monthSelect = (page) => page.locator('select').nth(1);
/** @param {import('@playwright/test').Page} page */
export const showCaughtSwitch = (page) => page.getByRole('switch');

/**
 * @param {import('@playwright/test').Page} page
 * @param {boolean} on
 */
export async function setShowCaught(page, on) {
  if ((await showCaughtSwitch(page).getAttribute('aria-checked')) !== String(on)) await showCaughtSwitch(page).click();
  await expect(showCaughtSwitch(page)).toHaveAttribute('aria-checked', String(on));
}

/** @param {'all' | 'fish' | 'bug' | 'sea'} type */
export function available(type, hemisphere = 'north', month = MONTH) {
  return critters.filter(
    (c) => (type === 'all' || c.type === type) && c[hemisphere].some((/** @type {any} */ p) => p.months.includes(month)),
  );
}
