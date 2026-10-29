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
  "name": "Tarantula",
  "icon": "https://acnhcdn.com/latest/MenuIcon/Ins62.png",
  "image": "https://acnhcdn.com/latest/BookInsectIcon/InsectTaranchuraCropped.png",
  "price": 8000,
  "location": "On the ground",
  "shadow": null,
  "weather": "Any weather",
  "speed": null,
  "catchesToUnlock": 0,
  "north": [{ "months": [1, 2, 3, 4, 11, 12], "hours": [0, 1, 2, 3, 19, 20, 21, 22, 23], "time": "7 PM – 4 AM" }],
  "south": [{ "months": [5, 6, 7, 8, 9, 10], "hours": [0, 1, 2, 3, 19, 20, 21, 22, 23], "time": "7 PM – 4 AM" }]
}
```

| Field | Notes |
| --- | --- |
| `id` | Stable slug of the name. Use it to store which critters were caught. |
| `type` | `fish`, `bug` or `sea` |
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
