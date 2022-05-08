import { run, bench, group, baseline } from '.';

bench('noop', () => {});
baseline('noop2', () => {});

group({ name: 'a', summary: false }, () => {
  bench('noop', () => {});
  bench('noop', () => {});
  bench('noop', () => {});
  bench('noop', () => {});
});

await run({
  avg: true,
  json: true,
  colors: true,
  min_max: true,
  collect: false,
  percentiles: true,
});