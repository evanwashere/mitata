import { run, bench, group, baseline } from '.';

bench('noop', () => {});

group('a', () => {
  bench('noop', () => {});
  bench('noop', () => {});
  bench('noop', () => {});
  bench('noop', () => {});
});

await run({
  avg: true,
  colors: true,
  min_max: true,
  collect: false,
  percentiles: true,
});