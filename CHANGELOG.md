# Changelog

All notable changes to ACNH Critters. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/): patch for fixes, minor for new features, major for big
changes.

## [Unreleased]

## [1.3.0] - 2026-11-11

### Added

- **Parties:** catching a critter from the list that finishes a milestone opens a popup with the
  category's critter, a title and confetti; the bigger the milestone, the more confetti. "Yay!"
  ("Juhu!") closes it. Milestones: all fish, insects or sea creatures of the current month, all
  critters of the month, half of a category or of everything, and all of a category or all 200.
  The Critterpedia Sync and imports don't celebrate, since they record critters caught long before.
  Taking a catch back and catching it again throws the party again. A catch that finishes several
  milestones gets a popup for each, building up, e.g. first all the insects of the month, then all
  its critters.
- **Trophy case** in the menu: every milestone leaves a trophy there, with a short description and
  the day it was earned. A month's critters earn a bronze medal with the month's number, half of a
  category a silver one and all of it a gold one, each with the category's critter embossed; all 200
  earn a shiny rainbow medal. New trophies have a red dot, also on the menu, until the trophy case
  has been opened. Milestones reached without a party (through the sync or an import, at the
  start of a month already all caught, or before this version) earn theirs quietly. A category with
  its gold medal, or all critters with the rainbow one, earn no more month medals. Trophies stay on
  the device; transfer codes don't carry them.
- **Counts:** the header shows how many of the 200 critters are caught, and each category tab its
  own count, e.g. "34/80".
- **All 200 caught:** while they are, the app has a golden frame, and the rainbow medal shows next to
  the title.

### Changed

- On wide screens the title and the caught count in the header are bigger.
- Profiles are saved in format version 2, which adds the trophies. An older version of the app
  still open somewhere refuses them instead of saving over them without the trophies.

### Fixed

- In the Critterpedia Sync, "Back to …" right after finishing a category led to the critter before
  the last one instead of the last one.
- Holding Enter a little too long on a menu item no longer closes the dialog it opens right away.

## [1.2.1] - 2026-11-02

### Changed

- **The Critterpedia Sync always goes through every critter of a category**, in Critterpedia order,
  so its count matches the game's numbers. Running a category again shows each critter's ✓ (caught)
  or ✗ (not caught at the last sync), so kids can go through it again and fix what changed.
- In the sync, swiping left or → moves on and keeps a critter's ✓ or ✗; only the buttons change it.
  A critter not decided yet still counts as not caught when skipped.

## [1.2.0] - 2026-11-02

### Added

- **Going back in the Critterpedia Sync:** each critter gets a green ✓ or a red ✗ on its picture as
  it's decided. "Back" (or ←, or a swipe to the right) shows the critters before with their ✓ or ✗,
  also right after a category is finished, and "Caught" or "Not caught" there changes the verdict.
  The sync then carries on where it left off.

### Changed

- **A new look:** the rounded Nunito font (part of the app, so it works offline), the Critterpedia's
  dotted sand, warm brown text and chunky green buttons, all checked for contrast.
- **Clearer rows:** each critter is a card, and a chip under its name says "⏳ Last chance", "↻ All
  year" or "✓ Caught" in words, so the colour legend is gone. The tabs are big pills; on phones the
  sea tab says just "Sea" so they all fit, and place and time share a line.
- German times no longer break after the dash ("4–" / "17 Uhr").
- **The list's catch button:** "Hab ich!" in German. A caught critter's button shows just a ✓, which
  turns red with a ✗ on hover or while pressed, since pressing it un-catches. Right after catching,
  it stays green until the pointer has left it.
- **The sync's buttons:** "Next" is now "Not caught" (German "Hab ich nicht"), and German "Caught" is
  "Hab ich".

## [1.1.0] - 2026-10-30

### Added

- **Profiles:** several on one device, for example one per child or one for testing, each with its
  own progress, settings and language. Switch, add, rename and delete them in the menu. A new
  profile gets a name and starts on the welcome screen, which can also lead back to the profile
  before. With more than one profile, the menu button shows whose progress is on screen. No two
  profiles share a name.
- **Profile pictures:** each profile picks a critter, shown on the menu button, in the profile list
  and on its welcome screen, so kids who can't read yet find their own. The picker shows 16 critters
  drawn at random each time it opens, with the current one first. No two profiles share one.
- A fresh start asks for a name and a picture first, and the welcome screen then greets by name
  ("Welcome, Mia!"). Importing a code there instead takes the code's name and picture.
- Other tabs or windows of the app pick up changes right away, so they can't undo each other's
  work.

### Changed

- The language picked in the menu now belongs to the profile, and so does an imported one. Progress
  from 1.0.0 becomes profile 1, with its language.
- Importing from the menu replaces only the profile shown. The profile keeps its name; a code's
  name only names a profile without one.
- The name given when exporting is the profile's name, listed in the menu.
- Transfer codes now start with `ACNH2-` and carry the profile's picture. `ACNH1-` codes still
  import, but version 1.0.0 can't read the new ones, so update every device before sending codes.

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
