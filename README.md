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

Progress is stored in `localStorage`, one key per profile (see `src/lib/progress.svelte.js`):
`acnh-critters` for profile 1, which is where it was before there were profiles, and
`acnh-critters-2`, `acnh-critters-3` and so on for the others. `acnh-critters-active` holds the
number of the profile used last. Each profile looks like this:

```json
{
  "version": 1,
  "settings": { "hemisphere": "north", "trackDonations": false, "showCaught": false, "name": "Mia", "locale": "de" },
  "caught": ["bitterling"],
  "donated": ["bitterling"],
  "synced": ["fish"]
}
```

`name` also goes into exports. `locale` is the language picked in the menu or brought by an import;
it's missing while the profile follows the browser's language. Version 1.0.0 kept the language in
`acnh-critters-locale` instead; it moves into profile 1 on the first start.

## Versions

The version in `package.json` follows [Semantic Versioning](https://semver.org/): patch for fixes,
minor for new features, major for big changes. It's shown at the bottom of the menu, which is handy
for seeing whether the installed app has picked up an update.

Changes are collected under "Unreleased" in [CHANGELOG.md](CHANGELOG.md). To release:

1. `npm version minor --no-git-tag-version` (or `patch` / `major`). This updates `package.json` and
   `package-lock.json`.
2. In `CHANGELOG.md`, rename "Unreleased" to `[x.y.z] - YYYY-MM-DD` and add a new empty
   "Unreleased" section above it. A unit test checks that the newest entry matches `package.json`.
3. Commit, tag (`git tag vX.Y.Z`, `git push --tags`), and run the deploy workflow: on GitHub,
   Actions → Deploy to GitHub Pages → Run workflow. It runs the unit tests first and only starts by
   hand.

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

## Profiles

One device can hold several profiles, for example one per child or a spare one for testing. Each
has its own caught critters, Critterpedia Sync checkmarks, settings and language. On a fresh start,
the welcome screen first asks for the first profile's name, unless a transfer code is imported,
which brings its own. The **Profile** section of the menu lists the profiles and switches between
them. It also has:

- **New profile:** asks for a name, then starts on the welcome screen, like a first visit. The new
  profile takes over the hemisphere and language of the one shown before. It's only saved once
  the welcome screen is left, so closing the app there, or "Back to …" on it, leaves no empty
  profile behind.
- **Edit profile:** renames or deletes the profile shown, after asking first. Deleting the last
  one starts the app over.

With more than one profile, the menu button shows whose progress is on screen. A profile without a
name (e.g. one from version 1.0.0) is called by its number, e.g. "Profile 1", and no name can be
"Profile 1" or "Profil 1" while that profile exists. No two profiles can share a name, ignoring
case. The app opens the profile switched to last.

The app keeps all profiles in memory and saves every change, so it also works where storage is
blocked, just without remembering anything. Other tabs or windows of the app on the same device
pick up changes right away (through `storage` events), so they don't undo each other's work.

## Moving data between devices

Exports are **transfer codes** such as `ACNH1-MQEA…`: about 75 characters, up to about 100 with a
name (see `src/lib/transfer.js`). A code holds one profile: caught and donated critters, Critterpedia
Sync checkmarks, hemisphere, the show-caught switch, the language shown (picked in the menu or taken
from the browser), and the profile's name of up to 20 characters. The export dialog can change the
name, which then renames the profile too.

After `ACNH1-`, a code is base64url for these bytes (see `src/lib/transfer.js`):

1. **Settings:** bit 0 southern hemisphere, bit 1 track donations, bit 2 show caught, bits 3–4 the
   language (its place in `LOCALES` plus 1; 0 means none, as in codes made before languages were
   included, so the importing profile keeps its own), bits 5–7 the Critterpedia Sync checkmarks in
   `CATEGORIES` order.
2. **Caught:** one bit per critter, in `data/critters.json` order (25 bytes).
3. **Donated:** the same.
4. **Name:** the rest, as UTF-8, if there is one.

Codes may already have been sent, so this layout can't change; a new layout needs a new prefix
(`ACNH2-`). For the same reason, the number and order of critters in `data/critters.json` must stay
the same: the bit lists are sized and ordered by it.

**Export data** in the menu shows the code and offers:

- **Copy code** to the clipboard.
- **Share:** the device's share menu (Web Share API), labelled "AirDrop, Mail & more" on Apple
  devices and only shown where the browser has one. The Web Share API only works over HTTPS or on
  `localhost`, so trying it on a phone needs the app served over HTTPS.
- **Send by email:** a `mailto:` link with instructions and the code.
- **Download as text file:** the same text as a `.txt` file.

**Import data** (on the welcome screen, or in the menu to replace the progress of the profile shown)
takes the code, any text containing it (a whole email or message), or a downloaded file. The
profile keeps its own name; the code's name is only used for a profile without one, if no other
profile has it. A code without a language keeps the profile's. The JSON format above is still
accepted too, for older export files.

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
neither is there) until a language is picked in the menu. That choice is saved with the profile, so
each profile can have its own. (Version 1.0.0 kept it under `acnh-critters-locale`; it moves into
profile 1 on the first start.) Exports carry the language shown, and importing applies it as if it
had been picked in the menu.

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
