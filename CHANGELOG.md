# Changelog

All notable changes to ACNH Critters. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/): patch for fixes, minor for new features, major for big
changes.

## [Unreleased]

### Added

- **Profiles:** several on one device, for example one per child or one for testing, each with its
  own progress, settings and language. Switch, add, rename and delete them in the menu. A new
  profile gets a name and starts on the welcome screen, which can also lead back to the profile
  before. With more than one profile, the menu
  button shows whose progress is on screen. No two profiles share a name.
- A fresh start asks for a name first, and the welcome screen then greets by name ("Welcome,
  Mia!"). Importing a code there instead takes the code's name.
- Other tabs or windows of the app pick up changes right away, so they can't undo each other's
  work.

### Changed

- The language picked in the menu now belongs to the profile, and so does an imported one. Progress
  from 1.0.0 becomes profile 1, with its language.
- Importing from the menu replaces only the profile shown. The profile keeps its name; a code's
  name only names a profile without one.
- The name given when exporting is the profile's name, listed in the menu.

## [1.0.0] - 2026-10-30

The first version.

### Added

- **All 200 critters:** 80 fish, 80 insects and 40 sea creatures, for both hemispheres, with location,
  time, shadow size and speed. Official English and German names.
- **List:**
  - Tabs for all, fish, insects and sea creatures. Hemisphere and month filters that start with
    the current month and a hemisphere guessed from the time zone.
  - Caught critters are hidden unless "Show caught" is on.
  - "Caught it" with a small confetti burst.
- **Sorting with a month selected:**
  1. Critters gone after this month first. They stay together whatever the time of day.
  2. Then the others catchable right now or all day, by season.
  3. Critters outside their hours at the bottom.

  "All months" shows Critterpedia order.
- **Row colors** with a legend: red for gone after this month, blue for all year, green for caught.
- **Critterpedia Sync:** go through a category alongside the in-game Critterpedia and mark each
  critter as caught or not, with a checkmark per finished category.
  - Buttons, swipe, Enter and →.
  - A pulse for caught, a shake for next, then a slide to the next critter.
- **English and German:** follows the browser, can be picked in the menu.
- **Moving progress between devices** with a short transfer code: copy it, share it (AirDrop, Mail &
  more on Apple devices), email it or download it.
  - Importing works on the welcome screen or from the menu, where it replaces the progress.
  - The code carries the language and an optional name, which is shown in the menu.
- **Works offline and installs as an app:** all icons are included, and a service worker keeps
  everything on the device.
- **Phone-first layout.** Effects are skipped when the device asks for reduced motion, and screen
  readers get the row colors in words.
