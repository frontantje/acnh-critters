// Downloads ACNH creature data and writes a slimmed-down data/critters.json,
// plus each critter's icon to public/icons/<id>.png, so the app needs no
// image server (and works offline).
//
// Source: https://github.com/Norviah/animal-crossing, a JSON export of the
// community "Data Spreadsheet for Animal Crossing New Horizons". The icons come
// from the image server that data links to (acnhcdn.com).
//
// Run with: node scripts/build-data.mjs

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const BASE_URL = 'https://raw.githubusercontent.com/Norviah/animal-crossing/master/json/data/';
const OUT_FILE = fileURLToPath(new URL('../data/critters.json', import.meta.url));
const ICON_DIR = fileURLToPath(new URL('../public/icons/', import.meta.url));
const PARALLEL_DOWNLOADS = 8;

const SOURCES = [
  { type: 'fish', file: 'Fish.json', expected: 80 },
  { type: 'bug', file: 'Insects.json', expected: 80 },
  { type: 'sea', file: 'Sea Creatures.json', expected: 40 },
];

// The source JSON keeps only one time per hemisphere, but these two fish are
// around 4 PM – 9 AM in spring and all day in autumn. Taken from the per-month
// columns of the original spreadsheet.
const SPRING_EVENINGS_AUTUMN_ALL_DAY = {
  north: [
    { months: [3, 4, 5, 6], time: '4 PM – 9 AM' },
    { months: [9, 10, 11], time: 'All day' },
  ],
  south: [
    { months: [3, 4, 5], time: 'All day' },
    { months: [9, 10, 11, 12], time: '4 PM – 9 AM' },
  ],
};
const TIME_OVERRIDES = {
  'char': SPRING_EVENINGS_AUTUMN_ALL_DAY,
  'cherry salmon': SPRING_EVENINGS_AUTUMN_ALL_DAY,
};

const ALL_HOURS = Array.from({ length: 24 }, (_, h) => h);
const ascending = (list) => [...list].sort((a, b) => a - b);

// "9 PM" -> 21, "12 AM" -> 0
function parseHour(text) {
  const match = /^(\d{1,2}) (AM|PM)$/.exec(text.trim());
  if (!match) throw new Error(`Unrecognised hour: "${text}"`);
  return (Number(match[1]) % 12) + (match[2] === 'PM' ? 12 : 0);
}

// "4 PM – 9 AM" -> [0..8, 16..23]; the end hour is exclusive.
function hoursFromTime(time) {
  if (time === 'All day') return ALL_HOURS;
  const [start, end] = time.split('–').map(parseHour);
  const hours = [];
  for (let h = start; h !== end; h = (h + 1) % 24) hours.push(h);
  return ascending(hours);
}

function periods(raw, hemisphere) {
  const source = raw.hemispheres[hemisphere];
  const override = TIME_OVERRIDES[raw.name]?.[hemisphere];

  if (!override) {
    // Creatures with two daily windows (e.g. piranha) have nested arrays here.
    const hours = ascending(source.timeArray.flat());
    // Guards the parser that the overrides depend on.
    const parsed = ascending(new Set(source.time.flatMap(hoursFromTime)));
    if (parsed.join() !== hours.join()) {
      throw new Error(`${raw.name} (${hemisphere}): "${source.time}" parsed as ${parsed}, source says ${hours}`);
    }
    return [{ months: ascending(source.monthsArray), hours }];
  }

  const overrideMonths = ascending(override.flatMap((p) => p.months));
  if (overrideMonths.join() !== ascending(source.monthsArray).join()) {
    throw new Error(`${raw.name} (${hemisphere}): override months ${overrideMonths} differ from source ${source.monthsArray}`);
  }
  return override.map((p) => ({ months: p.months, hours: hoursFromTime(p.time) }));
}

// "Rajah Brooke's birdwing" -> "rajah-brookes-birdwing"
function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function toCritter(type, raw) {
  const id = slugify(raw.name);
  if (!raw.translations?.eUde?.trim()) throw new Error(`${raw.name}: no German name`);
  return {
    id,
    type,
    number: raw.num,
    name: {
      en: raw.name.charAt(0).toUpperCase() + raw.name.slice(1),
      de: raw.translations.eUde,
    },
    // Relative to the page, like every asset (see vite.config.js).
    icon: `icons/${id}.png`,
    // The big Critterpedia picture isn't used by the app yet, so it isn't downloaded.
    image: raw.critterpediaImage,
    price: raw.sell,
    location: raw.whereHow ?? null,
    shadow: raw.shadow ?? null,
    weather: raw.weather ?? null,
    speed: raw.movementSpeed ?? null,
    catchesToUnlock: raw.totalCatchesToUnlock,
    north: periods(raw, 'north'),
    south: periods(raw, 'south'),
  };
}

async function download(file) {
  const response = await fetch(BASE_URL + encodeURIComponent(file));
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  return response.json();
}

/** Downloads every icon into ICON_DIR, a few at a time. */
async function downloadIcons(icons) {
  await rm(ICON_DIR, { recursive: true, force: true });
  await mkdir(ICON_DIR, { recursive: true });
  const queue = [...icons];
  async function worker() {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const response = await fetch(next.url);
      const type = response.headers.get('content-type') ?? '';
      if (!response.ok || !type.startsWith('image/png')) {
        throw new Error(`${next.id}: icon ${next.url} answered ${response.status} ${type}`);
      }
      await writeFile(`${ICON_DIR}${next.id}.png`, Buffer.from(await response.arrayBuffer()));
    }
  }
  await Promise.all(Array.from({ length: PARALLEL_DOWNLOADS }, worker));
}

const critters = [];
const icons = [];
for (const { type, file, expected } of SOURCES) {
  const raw = await download(file);
  if (raw.length !== expected) console.warn(`Warning: ${file} has ${raw.length} entries, expected ${expected}`);
  for (const entry of raw) {
    const critter = toCritter(type, entry);
    critters.push(critter);
    icons.push({ id: critter.id, url: entry.iconImage });
  }
}
critters.sort((a, b) => SOURCES.findIndex((s) => s.type === a.type) - SOURCES.findIndex((s) => s.type === b.type) || a.number - b.number);

const seen = new Set();
for (const { id } of critters) {
  if (seen.has(id)) throw new Error(`Duplicate id: ${id}`);
  seen.add(id);
}

// Keep number arrays on one line so the file stays readable.
const json = JSON.stringify(critters, null, 2).replace(
  /\[\n\s+(\d+(?:,\n\s+\d+)*)\n\s+\]/g,
  (_, numbers) => `[${numbers.split(/,\s+/).join(', ')}]`,
);

await mkdir(fileURLToPath(new URL('../data/', import.meta.url)), { recursive: true });
await writeFile(OUT_FILE, json + '\n');
console.log(`Wrote ${critters.length} critters to ${OUT_FILE}`);

await downloadIcons(icons);
console.log(`Downloaded ${icons.length} icons to ${ICON_DIR}`);
