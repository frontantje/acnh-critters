# To do

Target audience: kids. Big friendly tap targets, short words, lots of pictures, and celebrating
progress.

## Next up

- [ ] **UI polish:** fonts and color scheme. A rounded, friendly font, self-hosted so it works
      offline. A palette that fits the game, checked for contrast. The row tints
      (red / blue / green) need to work in it too.
- [ ] **Dark theme:** follow the device setting, maybe with a switch in the menu. Every tint and the
      legend need dark versions.
- [ ] **Sounds:** e.g. a short jingle for "Caught it", a pop for the sync's "Caught", a soft swoosh
      for "Next". Mute switch in the menu, quiet by default until a first tap (browsers block
      autoplay anyway).
- [ ] **Cute icons and visuals:** icons for locations (river, pond, sea, trees, flowers…), pictures
      for shadow sizes instead of "X-Large", nicer empty states.
- [ ] **Big party screen** when every critter is caught: full-screen confetti, the critters
      parading by, a sound. Must respect "reduced motion".

## Suggestions (from Claude)

- [ ] **One profile per kid:** separate progress, name and hemisphere for each child on a shared
      tablet, switchable from the menu. The export name could become the profile name.
- [ ] **Smaller parties along the way:** a category finished, the first 10 caught, half the
      Critterpedia done. Maybe stickers or stamps collected on a card.
- [ ] **Critter detail card:** tap a row to see the big Critterpedia picture, the price in Bells,
      when and where. The data already has `image` and `price`.
- [ ] **Read names aloud** (speech synthesis) for kids who can't read yet.
- [ ] **"Right now" view:** only what can be caught at this moment, as big picture tiles.
- [ ] **Simple mode** for younger kids: just picture, name and button, no times or notes.
- [x] **Installable app (PWA):** home-screen icon, works offline, critter icons stored locally (30 Oct 2026).
- [ ] **Donation tracking UI.** The data model already has it (`trackDonations`, `donated`).
- [ ] **Undo** for an accidental "Caught it", e.g. a short "Pale chub caught · Undo" message.

## Smaller ideas mentioned along the way

- [x] Self-host the critter icons (30 Oct 2026). The large Critterpedia pictures (`image`) are still
      on acnhcdn.com; download them too once something uses them (e.g. the detail card).
- [ ] Visible label next to the row tints, for kids who don't see the colors well.
- [ ] Pin the color legend (it currently scrolls away with the list).
- [ ] Switch the month filter when the app stays open past midnight into a new month.
- [ ] Hold back re-sorting for a few seconds after a tap (rows can jump on the full hour).
- [ ] Language switch on the welcome screen, not only in the menu.
- [ ] Preview before importing ("This code has 34 caught critters from Antje").

## Open code-review findings

- [ ] German catch button: "Gefangen!" and "Gefangen ✓" read almost the same.
- [ ] The non-breaking space after the en dash in times may still allow a line break there; a word
      joiner (U+2060) would prevent it.
- [ ] The catch button is a fixed `w-28` on phones; `min-w-28` would leave room for longer labels.
- [ ] Language options use `aria-pressed`; radio semantics would fit a one-of-many choice better.
- [x] `build-data.mjs` doesn't fail on a missing German name (it does now, 30 Oct 2026).
- [ ] Small cleanups: per-language formatter tables instead of `locale === 'de'` checks, cached month
      formatters, and `i18n.svelte.js` not touching `document` when imported.

## Done (29 Oct 2026)

- **Data:** all 200 critters from the community data, both hemispheres, German names. Char and cherry
  salmon have their seasonal hours fixed.
- **App:** Svelte 5, Vite 8, Tailwind 4, Node 24, deployed to GitHub Pages by a hand-started workflow
  that runs the unit tests first.
- **Main list:** tabs, hemisphere and month filters, phone-first layout, hide or show caught critters,
  confetti on "Caught it".
- **Sorting** (with a month selected):
  1. Critters gone after this month come first and stay together, whatever the time of day.
  2. Then the other critters catchable right now or all day, by season.
  3. Critters outside their hours at the bottom.
- **Tints and legend:** red for gone after this month, blue for all year, green for caught.
- **Critterpedia Sync:** category by category, with pulse / shake / slide effects, swipe, → and
  Enter, checkmarks per category.
- **English and German:** follows the browser, can be switched in the menu.
- **Moving data between devices:** transfer codes (copy, share menu / AirDrop, email, download), an
  optional name shown in the menu, import on the welcome screen or from the menu (replaces the
  progress on this device).
- **Tests:**
  - Unit tests (Vitest), also run in the deploy workflow.
  - Browser tests (Playwright), only run on request.

## Done (30 Oct 2026)

- **Works offline and installs as an app:**
  - Critter icons are part of the app (`public/icons/`, downloaded by `npm run data`).
  - A service worker stores everything on the first visit.
  - A web manifest and home-screen icons (the octopus) let it be installed.
- **Tests:** a browser test fails if anything is loaded from another server. There's an offline
  test against the production build.
