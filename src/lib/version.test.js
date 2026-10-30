import { expect, test } from 'vitest';
import changelog from '../../CHANGELOG.md?raw';
import { version } from '../../package.json';

const releases = [...changelog.matchAll(/^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})$/gm)];

test('the version is semantic, e.g. 1.2.3', () => {
  expect(version).toMatch(/^\d+\.\d+\.\d+$/);
});

test('the newest changelog entry is this version, with a date', () => {
  expect(releases.length).toBeGreaterThan(0);
  expect(releases[0][1]).toBe(version);
  expect(Number.isNaN(Date.parse(releases[0][2]))).toBe(false);
});

test('an Unreleased section sits on top, ready for the next changes', () => {
  const unreleased = changelog.indexOf('## [Unreleased]');
  expect(unreleased).toBeGreaterThan(-1);
  expect(unreleased).toBeLessThan(releases[0].index ?? Infinity);
});

test('versions only go up, newest first', () => {
  /** @param {string} v */
  const parts = (v) => v.split('.').map(Number);
  const sorted = releases.map((r) => r[1]).sort((a, b) => {
    const [x, y] = [parts(a), parts(b)];
    return y[0] - x[0] || y[1] - x[1] || y[2] - x[2];
  });
  expect(releases.map((r) => r[1])).toEqual(sorted);
});
