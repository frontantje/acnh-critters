// UI text in English and German. Critter names come from the game data
// (data/critters.json); everything else that's shown is translated here.

const en = {
  welcomeTitle: 'Welcome to ACNH Critters',
  welcomeIntro: "Keep track of every fish, insect and sea creature you've caught.",
  welcomeImport: 'Import data from another device',
  welcomeSetup: 'Run the initial setup',
  welcomeSkip: 'No thanks, just show me the list',
  importInvalid: "This file isn't an ACNH Critters export.",
  importTooNew: 'This file was exported from a newer version of the app.',

  setupTitle: 'Initial setup',
  setupComingSoon: 'Coming soon.',
  setupContinue: 'Continue to the list',

  menu: 'Menu',
  exportData: 'Export data',
  language: 'Language',

  hemisphere: 'Hemisphere',
  northern: 'Northern',
  southern: 'Southern',
  month: 'Month',
  allMonths: 'All months',
  tabAll: 'All',
  tabFish: 'Fish',
  tabBugs: 'Insects',
  tabSea: 'Sea creatures',
  showCaughtShort: 'Caught',
  showCaught: 'Show caught',
  allCaught: "You've caught everything here!",
  nothingThisMonth: 'Nothing to catch here this month.',

  caughtIt: 'Caught it',
  caught: 'Caught ✓',
  diving: 'Sea (diving)',
  shadowSize: 'Shadow size: {value}',
  speed: 'Speed: {value}',
  allDay: 'All day',
  allYear: 'All year',
};

/** @type {Record<keyof typeof en, string>} */
const de = {
  welcomeTitle: 'Willkommen bei ACNH Critters',
  welcomeIntro: 'Behalte den Überblick über alle Fische, Insekten und Meerestiere, die du gefangen hast.',
  welcomeImport: 'Daten von einem anderen Gerät importieren',
  welcomeSetup: 'Ersteinrichtung starten',
  welcomeSkip: 'Nein danke, zeig mir einfach die Liste',
  importInvalid: 'Diese Datei ist kein ACNH-Critters-Export.',
  importTooNew: 'Diese Datei wurde mit einer neueren Version der App exportiert.',

  setupTitle: 'Ersteinrichtung',
  setupComingSoon: 'Kommt bald.',
  setupContinue: 'Weiter zur Liste',

  menu: 'Menü',
  exportData: 'Daten exportieren',
  language: 'Sprache',

  hemisphere: 'Hemisphäre',
  northern: 'Nordhalbkugel',
  southern: 'Südhalbkugel',
  month: 'Monat',
  allMonths: 'Alle Monate',
  tabAll: 'Alle',
  tabFish: 'Fische',
  tabBugs: 'Insekten',
  tabSea: 'Meerestiere',
  showCaughtShort: 'Gefangen',
  showCaught: 'Gefangene zeigen',
  allCaught: 'Hier hast du schon alles gefangen!',
  nothingThisMonth: 'Diesen Monat gibt es hier nichts zu fangen.',

  caughtIt: 'Gefangen!',
  caught: 'Gefangen ✓',
  diving: 'Meer (tauchen)',
  shadowSize: 'Schattengröße: {value}',
  speed: 'Tempo: {value}',
  allDay: 'Ganztägig',
  allYear: 'Ganzjährig',
};

export const messages = { en, de };

/**
 * German for the location, shadow size and speed values in the critter data,
 * keyed by the English value.
 * @type {Record<string, string>}
 */
export const germanTerms = {
  // Fish locations
  'Sea': 'Meer',
  'Sea (rainy days)': 'Meer (bei Regen)',
  'Pier': 'Steg',
  'River': 'Fluss',
  'River (clifftop)': 'Fluss (auf Klippen)',
  'River (mouth)': 'Flussmündung',
  'Pond': 'Teich',

  // Insect locations
  'Disguised on shoreline': 'Getarnt am Strand',
  'Disguised under trees': 'Getarnt unter Bäumen',
  'Flying': 'Fliegend',
  'Flying near blue/purple/black flowers': 'Fliegt bei blauen/violetten/schwarzen Blumen',
  'Flying near flowers': 'Fliegt bei Blumen',
  'Flying near light sources': 'Fliegt bei Lichtquellen',
  'Flying near trash (boots, tires, cans, used fountain fireworks) or rotten turnips':
    'Fliegt bei Müll (Stiefel, Reifen, Dosen, abgebrannte Fontänen) oder verfaulten Rüben',
  'Flying near water': 'Fliegt in Wassernähe',
  'From hitting rocks': 'Beim Schlagen auf Steine',
  'On beach rocks': 'Auf Strandfelsen',
  'On flowers': 'Auf Blumen',
  'On hardwood/cedar trees': 'An Laubbäumen/Zedern',
  'On palm trees': 'An Palmen',
  'On rivers/ponds': 'Auf Flüssen/Teichen',
  'On rocks/bushes': 'Auf Steinen/Büschen',
  'On rotten turnips or candy': 'Auf verfaulten Rüben oder Bonbons',
  'On the ground': 'Auf dem Boden',
  'On tree stumps': 'Auf Baumstümpfen',
  'On trees (any kind)': 'An Bäumen (alle Arten)',
  'On villagers': 'Auf Bewohnern',
  'On white flowers': 'Auf weißen Blumen',
  'Pushing snowballs': 'Beim Rollen von Schneebällen',
  'Shaking trees': 'Bäume schütteln',
  'Shaking trees (hardwood or cedar only)': 'Bäume schütteln (nur Laubbäume oder Zedern)',
  'Underground (dig where noise is loudest)': 'Unter der Erde (dort graben, wo es am lautesten zirpt)',

  // Shadow sizes
  'X-Small': 'Winzig',
  'Small': 'Klein',
  'Medium': 'Mittel',
  'Large': 'Groß',
  'X-Large': 'Sehr groß',
  'X-Large w/Fin': 'Sehr groß mit Flosse',
  'XX-Large': 'Riesig',
  'Long': 'Lang',

  // Sea creature speeds ('Medium' is shared with shadow sizes)
  'Stationary': 'Unbeweglich',
  'Very slow': 'Sehr langsam',
  'Slow': 'Langsam',
  'Fast': 'Schnell',
  'Very fast': 'Sehr schnell',
};
