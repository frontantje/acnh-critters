// Guesses the player's hemisphere from the browser's time zone, which needs no
// location permission. Unknown zones fall back to north.

const SOUTHERN_PREFIXES = ['Australia/', 'Antarctica/', 'America/Argentina/'];

const SOUTHERN_ZONES = new Set([
  // South America
  'America/Araguaina', 'America/Asuncion', 'America/Bahia', 'America/Belem', 'America/Buenos_Aires',
  'America/Campo_Grande', 'America/Catamarca', 'America/Cordoba', 'America/Cuiaba', 'America/Eirunepe',
  'America/Fortaleza', 'America/Guayaquil', 'America/Jujuy', 'America/La_Paz', 'America/Lima',
  'America/Maceio', 'America/Manaus', 'America/Mendoza', 'America/Montevideo', 'America/Noronha',
  'America/Porto_Velho', 'America/Punta_Arenas', 'America/Recife', 'America/Rio_Branco',
  'America/Rosario', 'America/Santarem', 'America/Santiago', 'America/Sao_Paulo',
  // Atlantic
  'Atlantic/South_Georgia', 'Atlantic/St_Helena', 'Atlantic/Stanley',
  // Africa
  'Africa/Blantyre', 'Africa/Brazzaville', 'Africa/Bujumbura', 'Africa/Dar_es_Salaam', 'Africa/Gaborone',
  'Africa/Harare', 'Africa/Johannesburg', 'Africa/Kigali', 'Africa/Kinshasa', 'Africa/Lilongwe',
  'Africa/Luanda', 'Africa/Lubumbashi', 'Africa/Lusaka', 'Africa/Maputo', 'Africa/Maseru',
  'Africa/Mbabane', 'Africa/Nairobi', 'Africa/Windhoek',
  // Indian Ocean
  'Indian/Antananarivo', 'Indian/Chagos', 'Indian/Christmas', 'Indian/Cocos', 'Indian/Comoro',
  'Indian/Kerguelen', 'Indian/Mahe', 'Indian/Mauritius', 'Indian/Mayotte', 'Indian/Reunion',
  // Asia
  'Asia/Dili', 'Asia/Jakarta', 'Asia/Jayapura', 'Asia/Makassar', 'Asia/Pontianak',
  // Pacific
  'Pacific/Apia', 'Pacific/Auckland', 'Pacific/Bougainville', 'Pacific/Chatham', 'Pacific/Easter',
  'Pacific/Efate', 'Pacific/Enderbury', 'Pacific/Fakaofo', 'Pacific/Fiji', 'Pacific/Funafuti',
  'Pacific/Galapagos', 'Pacific/Gambier', 'Pacific/Guadalcanal', 'Pacific/Kanton', 'Pacific/Marquesas',
  'Pacific/Nauru', 'Pacific/Niue', 'Pacific/Norfolk', 'Pacific/Noumea', 'Pacific/Pago_Pago',
  'Pacific/Pitcairn', 'Pacific/Port_Moresby', 'Pacific/Rarotonga', 'Pacific/Samoa', 'Pacific/Tahiti',
  'Pacific/Tongatapu', 'Pacific/Wallis',
]);

/** @returns {import('./critters.js').Hemisphere} */
export function guessHemisphere() {
  let zone = '';
  try {
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  } catch {
    // Very old browsers; fall through to the default.
  }
  const southern = SOUTHERN_ZONES.has(zone) || SOUTHERN_PREFIXES.some((prefix) => zone.startsWith(prefix));
  return southern ? 'south' : 'north';
}
