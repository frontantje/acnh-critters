// Shared fixtures and helpers for the browser tests.
//
// Every test runs on a fixed date, with critter icons served locally, and fails
// if the page logs a console error.

import { test as base, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

export { expect };

/** @type {any[]} */
export const critters = JSON.parse(readFileSync(new URL('../data/critters.json', import.meta.url), 'utf8'));

// 15 October 2026, so the default month filter is always October.
export const TODAY = new Date('2026-10-15T12:00:00');
export const MONTH = 10;

// A 1×1 PNG standing in for the icons from acnhcdn.com, so tests don't depend on
// an external server.
const PLACEHOLDER_ICON = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

/**
 * @param {import('@playwright/test').BrowserContext} context
 * @param {string[]} errors
 */
async function prepare(context, errors) {
  await context.clock.setFixedTime(TODAY);
  await context.route('https://acnhcdn.com/**', (route) =>
    route.fulfill({ contentType: 'image/png', body: PLACEHOLDER_ICON }),
  );
  context.on('page', (page) => {
    page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
    page.on('pageerror', (error) => errors.push(String(error)));
  });
}

export const test = base.extend({
  /** Console errors from all pages in the test. */
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

  /** Opens the app in a separate browser context, like a second device. */
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

/** @param {import('@playwright/test').Page} page */
export async function skipWelcome(page, name = 'No thanks, just show me the list') {
  await page.goto('/');
  await page.getByRole('button', { name }).click();
}

/**
 * Picks a file through the welcome screen's import button.
 * @param {import('@playwright/test').Page} page
 * @param {unknown} data JSON value, or a string for raw file contents
 */
export async function importFile(page, data, name = 'Import data from another device') {
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name }).click()]);
  const contents = typeof data === 'string' ? data : JSON.stringify(data);
  await chooser.setFiles({ name: 'export.json', mimeType: 'application/json', buffer: Buffer.from(contents) });
}

/** The saved progress, or null. @param {import('@playwright/test').Page} page */
export function stored(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('acnh-critters') ?? 'null'));
}

// The main critter list is the first list on the page; the sync dialog's comes later.
/** @param {import('@playwright/test').Page} page */
export const list = (page) => page.locator('ul').first();
/** @param {import('@playwright/test').Page} page */
export const rows = (page) => list(page).locator('li:has(button)');
/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
export const row = (page, name) => list(page).locator('li').filter({ has: page.getByText(name, { exact: true }) });

/** Name, location, time and notes of a row, with whitespace normalized. @param {import('@playwright/test').Locator} row */
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

/**
 * Critters of a type available in a hemisphere and month, in list order.
 * @param {'all' | 'fish' | 'bug' | 'sea'} type
 */
export function available(type, hemisphere = 'north', month = MONTH) {
  return critters.filter(
    (c) => (type === 'all' || c.type === type) && c[hemisphere].some((/** @type {any} */ p) => p.months.includes(month)),
  );
}
