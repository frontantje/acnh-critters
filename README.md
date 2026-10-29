# ACNH Critters

A tracker for catchable creatures in Animal Crossing: New Horizons, built with Svelte 5, Vite and
Tailwind CSS 4.

## Development

```
npm install
npm run dev      # dev server at http://localhost:5173
npm run check    # type-check (JSDoc types, strict)
npm run build    # production build into dist/
```

Requires Node 24 (see `.nvmrc`). The npm 10.8 bundled with Node 20 crashes while resolving Vite 8's
optional peer dependencies.

Progress is stored in `localStorage` under `acnh-critters`, in the same JSON format as the export
file (see `src/lib/progress.svelte.js`).

## Tests

```
npm test             # unit tests, then browser tests
npm run test:unit    # unit tests only (Vitest, a few seconds)
npm run test:e2e     # browser tests only (Playwright, ~40 s)
```

### Unit tests

`src/**/*.test.js`, run with Vitest in a simulated browser (jsdom). They cover the logic in
`src/lib` (time and month formatting, reading save files, hemisphere and language guessing) and
sanity-check `data/critters.json` and the translations: counts, ids, names, months and hours,
south = north shifted by six months, and a German term for every location, shadow size and speed.
Run them after regenerating the data. `npx vitest` keeps them running while you edit.

### Browser tests

```
npx playwright test tests/sync.spec.js # one file
npx playwright test --headed           # watch them run
npx playwright test --ui               # interactive runner
```

`tests/`, written with Playwright. They drive the installed Google Chrome (no browser download)
and start the dev server unless one is already running on port 5173.

Every test runs as if it were 15 October 2026, in the Europe/Berlin time zone with an `en-US`
browser unless the test sets its own. Critter icons are replaced with a placeholder, so no network
is needed, and any console error fails the test (see `tests/support.js`).
`tests/expected-times.json` holds the community spreadsheet's original time texts, which the app's
own time formatting is checked against.

## Languages

English and German. The app follows the browser's language (anything other than German falls back
to English) until a language is picked in the menu; that choice is stored under
`acnh-critters-locale` and is not part of exports.

Critter names are the official in-game names from the data. Everything else, including the data's
location, shadow size and speed values, is translated in `src/lib/messages.js`. Times and month
names are formatted per language from the `hours` and `months` data.

## Data

`data/critters.json` holds all 200 creatures (80 fish, 80 bugs, 40 sea creatures). It is generated from
[Norviah/animal-crossing](https://github.com/Norviah/animal-crossing), a JSON export of the community
ACNH data spreadsheet. To regenerate it (Node 18+):

```
node scripts/build-data.mjs
```

Each entry looks like this:

```json
{
  "id": "tarantula",
  "type": "bug",
  "number": 79,
  "name": { "en": "Tarantula", "de": "Vogelspinne" },
  "icon": "https://acnhcdn.com/latest/MenuIcon/Ins62.png",
  "image": "https://acnhcdn.com/latest/BookInsectIcon/InsectTaranchuraCropped.png",
  "price": 8000,
  "location": "On the ground",
  "shadow": null,
  "weather": "Any weather",
  "speed": null,
  "catchesToUnlock": 0,
  "north": [{ "months": [1, 2, 3, 4, 11, 12], "hours": [0, 1, 2, 3, 19, 20, 21, 22, 23] }],
  "south": [{ "months": [5, 6, 7, 8, 9, 10], "hours": [0, 1, 2, 3, 19, 20, 21, 22, 23] }]
}
```

| Field | Notes |
| --- | --- |
| `id` | Stable slug of the English name. Use it to store which critters were caught. |
| `type` | `fish`, `bug` or `sea` |
| `name` | Official English and German names |
| `number` | Critterpedia order within its type |
| `icon` / `image` | Small menu icon (~10 KB) / large Critterpedia picture (~160 KB) |
| `location` | Fish and bugs only (sea creatures are always caught by diving) |
| `shadow` | Fish and sea creatures only |
| `weather` | Bugs only. Fish that need rain say so in `location` (coelacanth) |
| `speed` | Sea creatures only |
| `catchesToUnlock` | Total catches needed before it can spawn |
| `north` / `south` | List of availability periods per hemisphere, see below |

Months are 1–12 and hours are 0–23. A creature can be caught in month `m` at hour `h` if any period
contains both. Most creatures have one period. Char and cherry salmon have two, because they are
around 4 PM – 9 AM in spring but all day in autumn.
