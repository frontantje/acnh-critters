// Uses the time zone because, unlike location, it needs no permission.

const SOUTHERN_PREFIXES = ['Australia/', 'Antarctica/', 'America/Argentina/'];

const SOUTHERN_ZONES = new Set([
  'America/Araguaina', 'America/Asuncion', 'America/Bahia', 'America/Belem', 'America/Buenos_Aires',
  'America/Campo_Grande', 'America/Catamarca', 'America/Cordoba', 'America/Cuiaba', 'America/Eirunepe',
  'America/Fortaleza', 'America/Guayaquil', 'America/Jujuy', 'America/La_Paz', 'America/Lima',
  'America/Maceio', 'America/Manaus', 'America/Mendoza', 'America/Montevideo', 'America/Noronha',
  'America/Porto_Velho', 'America/Punta_Arenas', 'America/Recife', 'America/Rio_Branco',
  'America/Rosario', 'America/Santarem', 'America/Santiago', 'America/Sao_Paulo',
  'Atlantic/South_Georgia', 'Atlantic/St_Helena', 'Atlantic/Stanley',
  'Africa/Blantyre', 'Africa/Brazzaville', 'Africa/Bujumbura', 'Africa/Dar_es_Salaam', 'Africa/Gaborone',
  'Africa/Harare', 'Africa/Johannesburg', 'Africa/Kigali', 'Africa/Kinshasa', 'Africa/Lilongwe',
  'Africa/Luanda', 'Africa/Lubumbashi', 'Africa/Lusaka', 'Africa/Maputo', 'Africa/Maseru',
  'Africa/Mbabane', 'Africa/Nairobi', 'Africa/Windhoek',
  'Indian/Antananarivo', 'Indian/Chagos', 'Indian/Christmas', 'Indian/Cocos', 'Indian/Comoro',
  'Indian/Kerguelen', 'Indian/Mahe', 'Indian/Mauritius', 'Indian/Mayotte', 'Indian/Reunion',
  'Asia/Dili', 'Asia/Jakarta', 'Asia/Jayapura', 'Asia/Makassar', 'Asia/Pontianak',
  'Pacific/Apia', 'Pacific/Auckland', 'Pacific/Bougainville', 'Pacific/Chatham', 'Pacific/Easter',
  'Pacific/Efate', 'Pacific/Enderbury', 'Pacific/Fakaofo', 'Pacific/Fiji', 'Pacific/Funafuti',
  'Pacific/Galapagos', 'Pacific/Gambier', 'Pacific/Guadalcanal', 'Pacific/Kanton', 'Pacific/Marquesas',
  'Pacific/Nauru', 'Pacific/Niue', 'Pacific/Norfolk', 'Pacific/Noumea', 'Pacific/Pago_Pago',
  'Pacific/Pitcairn', 'Pacific/Port_Moresby', 'Pacific/Rarotonga', 'Pacific/Samoa', 'Pacific/Tahiti',
  'Pacific/Tongatapu', 'Pacific/Wallis',
]);

/**
 * @param {string} [timeZone]
 * @returns {import('./critters.js').Hemisphere}
 */
export function guessHemisphere(timeZone = browserTimeZone()) {
  const southern = SOUTHERN_ZONES.has(timeZone) || SOUTHERN_PREFIXES.some((prefix) => timeZone.startsWith(prefix));
  return southern ? 'south' : 'north';
}

function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  } catch {
    // Very old browsers can throw here; north is the fallback.
    return '';
  }
}
