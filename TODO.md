# To do

Target audience: kids. Big friendly tap targets, short words, lots of pictures, and celebrating
progress.

## Next up

- [x] **UI polish:** Nunito, self-hosted for offline use; dotted sand, warm browns and chunky green
      buttons, checked for contrast. Rows are cards with a word chip for last chance, all year and
      caught (2 Nov 2026).
- [ ] **Dark theme:** follow the device setting, maybe with a switch in the menu. The colours are
      Tailwind's stone and green, retuned in `src/app.css`; the chips and cards need dark versions.
- [ ] **Sounds:** e.g. a short jingle for "Caught it", a pop for the sync's "Caught", a soft swoosh
      for "Next". Mute switch in the menu, quiet by default until a first tap (browsers block
      autoplay anyway).
- [ ] **Cute icons and visuals:** icons for locations (river, pond, sea, trees, flowers…), pictures
      for shadow sizes instead of "X-Large", nicer empty states.
- [ ] **Big party screen** when every critter is caught: full-screen confetti, the critters
      parading by, a sound. Must respect "reduced motion".

## Suggestions (from Claude)

- [x] **One profile per kid:** separate progress, name, hemisphere and language for each child on a
      shared tablet, switchable from the menu. The export name is the profile name (30 Oct 2026).
- [x] **A picture per profile:** each child picks a critter as their avatar, shown on the menu button
      and in the profile list, so kids who can't read yet find their own (30 Oct 2026).
- [ ] **Smaller parties along the way:** a category finished, the first 10 caught, half the
      Critterpedia done. Maybe stickers or stamps collected on a card.
- [ ] **Critter detail card:** tap a row to see the big Critterpedia picture, the price in Bells,
      when and where. The data already has `image` and `price`.
- [ ] **"Right now" view:** only what can be caught at this moment, as big picture tiles.
- [x] **Installable app (PWA):** home-screen icon, works offline, critter icons stored locally (30 Oct 2026).
- [ ] **Donation tracking UI.** The data model already has it (`trackDonations`, `donated`).
- [ ] **Undo** for an accidental "Caught it" in the list, e.g. a short "Pale chub caught · Undo"
      message. The Critterpedia Sync can go back and change a verdict already (2 Nov 2026).

## Smaller ideas mentioned along the way

- [x] Self-host the critter icons (30 Oct 2026). The large Critterpedia pictures (`image`) are still
      on acnhcdn.com; download them too once something uses them (e.g. the detail card).
- [x] Visible label next to the row tints, for kids who don't see the colors well. The chips do it,
      and there's no colour legend any more (2 Nov 2026).
- [ ] Switch the month filter when the app stays open past midnight into a new month.
- [ ] Hold back re-sorting for a few seconds after a tap (rows can jump on the full hour).
- [ ] Language switch on the welcome screen, not only in the menu.
- [ ] Preview before importing ("This code has 34 caught critters from Antje").
- [x] "Welcome, Mia!" on the welcome screen of a new profile with a name (30 Oct 2026).

## Open code-review findings

- [x] German catch button: "Gefangen!" and "Gefangen ✓" read almost the same. Now "Hab ich!" (2 Nov 2026).
- [x] German times could break after the dash ("4–" / "17 Uhr"); a word joiner prevents it now
      (2 Nov 2026).
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
- **Versions:** 1.0.0, with a changelog and the version at the bottom of the menu.
- **Profiles:** several per device, each with its own progress, settings and language. Switch, add,
  rename and delete them in the menu.
