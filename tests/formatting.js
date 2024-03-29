import { run, bench, group } from '../src/cli.mjs';

group({ summary: false }, () => {
  bench('noop', () => {});
  bench('new Array(2 ** 0)', () => new Array(2 ** 0));
  bench('new Array(2 ** 1)', () => new Array(2 ** 1));
  bench('new Array(2 ** 2)', () => new Array(2 ** 2));
  bench('new Array(2 ** 3)', () => new Array(2 ** 3));
  bench('new Array(2 ** 4)', () => new Array(2 ** 4));
  bench('new Array(2 ** 5)', () => new Array(2 ** 5));
  bench('new Array(2 ** 6)', () => new Array(2 ** 6));
  bench('new Array(2 ** 7)', () => new Array(2 ** 7));
  bench('new Array(2 ** 8)', () => new Array(2 ** 8));
  bench('new Array(2 ** 9)', () => new Array(2 ** 9));
  bench('new Array(2 ** 10)', () => new Array(2 ** 10));
  bench('new Array(2 ** 11)', () => new Array(2 ** 11));
  bench('new Array(2 ** 12)', () => new Array(2 ** 12));
  bench('new Array(2 ** 13)', () => new Array(2 ** 13));
  bench('new Array(2 ** 14)', () => new Array(2 ** 14));
  bench('new Array(2 ** 15)', () => new Array(2 ** 15));
  bench('new Array(2 ** 16)', () => new Array(2 ** 16));
  bench('new Array(2 ** 17)', () => new Array(2 ** 17));
  bench('new Array(2 ** 18)', () => new Array(2 ** 18));
  bench('new Array(2 ** 19)', () => new Array(2 ** 19));
  bench('new Array(2 ** 20)', () => new Array(2 ** 20));
  bench('new Array(2 ** 21)', () => new Array(2 ** 21));
  bench('new Array(2 ** 22)', () => new Array(2 ** 22));
  bench('new Array(2 ** 23)', () => new Array(2 ** 23));
  bench('new Array(2 ** 24)', () => new Array(2 ** 24));
  bench('new Array(2 ** 25)', () => new Array(2 ** 25));
  bench('new Array(2 ** 26)', () => new Array(2 ** 26));
  bench('new Array(2 ** 27)', () => new Array(2 ** 27));
  bench('new Array(2 ** 28)', () => new Array(2 ** 28));
  bench('new Array(2 ** 29)', () => new Array(2 ** 29));
  bench('new Array(2 ** 30)', () => new Array(2 ** 30));
  bench('new Array(2 ** 31)', () => new Array(2 ** 31));
});

const report = await run({
  units: true,
  silent: false,
  avg: true, // enable/disable avg column (default: true)
  json: false, // enable/disable json output (default: false)
  colors: true, // enable/disable colors (default: true)
  min_max: true, // enable/disable min/max column (default: true)
  percentiles: false, // enable/disable percentiles column (default: true)
});