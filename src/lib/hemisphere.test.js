import { describe, expect, test, vi } from 'vitest';
import { guessHemisphere } from './hemisphere.js';

describe('guessHemisphere', () => {
  test.each([
    'Australia/Sydney',
    'Australia/Perth',
    'Antarctica/McMurdo',
    'America/Argentina/Buenos_Aires',
    'America/Buenos_Aires', // older name some browsers report
    'America/Sao_Paulo',
    'America/Santiago',
    'America/Lima',
    'Africa/Johannesburg',
    'Africa/Nairobi',
    'Asia/Jakarta',
    'Pacific/Auckland',
    'Pacific/Fiji',
    'Indian/Mauritius',
    'Atlantic/Stanley',
  ])('%s is southern', (zone) => {
    expect(guessHemisphere(zone)).toBe('south');
  });

  test.each([
    'Europe/Berlin',
    'America/New_York',
    'America/Los_Angeles',
    'Asia/Tokyo',
    'Asia/Singapore',
    'Africa/Lagos',
    'Africa/Kampala',
    'America/Bogota',
    'Pacific/Honolulu',
    'UTC',
    'Etc/GMT-10',
    '',
  ])('%s is northern', (zone) => {
    expect(guessHemisphere(zone)).toBe('north');
  });

  test('defaults to the browser’s time zone', () => {
    const real = Intl.DateTimeFormat().resolvedOptions();
    const spy = vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({ ...real, timeZone: 'Australia/Sydney' });
    expect(guessHemisphere()).toBe('south');
    spy.mockRestore();
  });
});
