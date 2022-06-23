import { run, bench, group, baseline } from '..';

bench('noop', () => {});
baseline('aaa', () => {});
bench('noop2', () => Promise.resolve(1));

group(() => {
  bench('a', () => {});
  bench('b', () => {});
  bench('e', () => { throw 1; })
});

group('group', () => {
  baseline('baseline', () => {});
  bench('Date.now()', () => Date.now());
  bench('performance.now()', () => performance.now());
});

group({ summary: false }, () => {
  bench('aa', () => {});
  bench('bb', () => {});
});

group({ name: 'group2', summary: false }, () => {
  bench('new Array(0)', () => new Array(0));
  bench('new Array(1024)', () => new Array(1024));
});

bench('error', () => { throw new Error('error'); });

const report = await run({
  avg: true, // enable/disable avg column (default: true)
  json: false, // enable/disable json output (default: false)
  colors: true, // enable/disable colors (default: true)
  min_max: true, // enable/disable min/max column (default: true)
  collect: false, // enable/disable collecting returned values into an array during the benchmark (default: false)
  percentiles: false, // enable/disable percentiles column (default: true)
});