import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Downloaded by `npm run data`, so run that first.
const PICTURE = new URL('../public/icons/octopus.png', import.meta.url);
const BACKGROUND = 'linear-gradient(160deg, #86efac, #16a34a)';
const ICONS = [
  { file: 'app-icon-512.png', size: 512 },
  { file: 'app-icon-192.png', size: 192 },
  { file: 'apple-touch-icon.png', size: 180 },
];

const picture = `data:image/png;base64,${(await readFile(PICTURE)).toString('base64')}`;

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
for (const { file, size } of ICONS) {
  await page.setViewportSize({ width: size, height: size });
  // The critter stays well inside the middle, so Android can crop the icon to any shape.
  await page.setContent(`
    <style>
      body { margin: 0; }
      div { width: ${size}px; height: ${size}px; display: grid; place-items: center; background: ${BACKGROUND}; }
      img { width: 62%; filter: drop-shadow(0 ${size / 64}px ${size / 32}px rgb(0 0 0 / 0.25)); }
    </style>
    <div><img src="${picture}" alt=""></div>
  `);
  await page.locator('img').evaluate((img) => /** @type {HTMLImageElement} */ (img).decode());
  const path = fileURLToPath(new URL(`../public/${file}`, import.meta.url));
  await page.screenshot({ path });
  console.log(`Wrote ${path}`);
}
await browser.close();
