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

Progress is stored in `localStorage` under `acnh-critters` (see `src/lib/progress.svelte.js`).

## Offline and installing

Everything the app shows ships with it, so it needs no other server. The 200 critter icons are
in `public/icons/`, and the home-screen icons are `public/app-icon-*.png` and
`public/apple-touch-icon.png`.

The production build is an installable web app (`vite-plugin-pwa`, configured in `vite.config.js`):

- **Offline:** on the first visit, a service worker stores the app and all icons on the device
  (about 2.3 MB). After that it starts without a connection.
- **Updates:** a new version downloads in the background and is used from the next start on. The
  page is never reloaded while it's in use.
- **Installing:** the web manifest lets browsers add it to the home screen. Use "Add to Home
  Screen" in Safari's share menu on iPhone or iPad, or the install prompt in Chrome. It then opens
  without browser bars.
- **Not in dev:** `npm run dev` has no service worker, so nothing gets cached while developing.
  `npm run build && npx vite preview` runs the real thing.
- **App icons:** `node scripts/build-app-icons.mjs` renders them from a critter icon with the
  installed Chrome, after `npm run data`.

## Moving data between devices

Exports are **transfer codes** such as `ACNH1-MQEA…`: about 75 characters, up to about 100 with a
name (see `src/lib/transfer.js`). A code holds everything stored in the browser: caught and donated
critters, Critterpedia Sync checkmarks, hemisphere, the show-caught switch, the language picked in the
menu, and an optional name of up to 20 characters. The name is shown at the bottom of the menu after
exporting or importing.

**Export data** in the menu shows the code and offers:

- **Copy code** to the clipboard.
- **Share:** the device's share menu (Web Share API), labelled "AirDrop, Mail & more" on Apple
  devices and only shown where the browser has one. The Web Share API only works over HTTPS or on
  `localhost`, so trying it on a phone needs the app served over HTTPS.
- **Send by email:** a `mailto:` link with instructions and the code.
- **Download as text file:** the same text as a `.txt` file.

**Import data** (on the welcome screen, or in the menu to replace the current progress) takes the
code, any text containing it (a whole email or message), or a downloaded file. The JSON format above
is still accepted too, for older export files.

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

`tests/`, written with Playwright. They drive the installed Google Chrome (no browser download).
There are two projects:

- **dev:** almost all tests, against the dev server. A dev server already running on port 5173 is
  reused.
- **built:** `tests/offline.spec.js`, against a fresh production build that Playwright makes and
  serves under `/acnh-critters/` on port 4173, as on GitHub Pages. The service worker only exists in
  builds. Port 4173 has to be free.

Every test runs as if it were 15 October 2026, in the Europe/Berlin time zone with an `en-US`
browser unless the test sets its own. A test fails if the page logs a console error or loads
anything from another server (see `tests/support.js`).
`tests/expected-times.json` holds the community spreadsheet's original time texts, which the app's
own time formatting is checked against.

## Languages

English and German. The app uses the first of the two in the browser's language list (English if
neither is there) until a language is picked in the menu. That choice is stored under
`acnh-critters-locale`, included in exports, and applied when importing.

Critter names are the official in-game names from the data. Everything else, including the data's
location, shadow size and speed values, is translated in `src/lib/messages.js`. Times and month
names are formatted per language from the `hours` and `months` data.

## Data

`data/critters.json` holds all 200 creatures (80 fish, 80 bugs, 40 sea creatures). It is generated from
[Norviah/animal-crossing](https://github.com/Norviah/animal-crossing), a JSON export of the community
ACNH data spreadsheet. To regenerate it, which also downloads the icons into `public/icons/`:

```
npm run data
```

Each entry looks like this:

```json
{
  "id": "tarantula",
  "type": "bug",
  "number": 79,
  "name": { "en": "Tarantula", "de": "Vogelspinne" },
  "icon": "icons/tarantula.png",
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
| `icon` | Menu icon in `public/icons/` (128×128, ~10 KB), relative to the page |
| `image` | Large Critterpedia picture (~40–230 KB). Still on acnhcdn.com and not used by the app yet, so not available offline |
| `location` | Fish and bugs only (sea creatures are always caught by diving) |
| `shadow` | Fish and sea creatures only |
| `weather` | Bugs only. Fish that need rain say so in `location` (coelacanth) |
| `speed` | Sea creatures only |
| `catchesToUnlock` | Total catches needed before it can spawn |
| `north` / `south` | List of availability periods per hemisphere, see below |

Months are 1–12 and hours are 0–23. A creature can be caught in month `m` at hour `h` if any period
contains both. Most creatures have one period. Char and cherry salmon have two, because they are
around 4 PM – 9 AM in spring but all day in autumn.
