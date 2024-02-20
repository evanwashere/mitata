import { run, bench, group, baseline } from '..';

group(() => {
  bench('noop()', () => {});
  baseline('async noop()', async () => {});
})

group('getting time', () => {
  bench('Date.now()', () => Date.now());
  bench('Bun.nanoseconds()', () => Bun.nanoseconds());
  bench('performance.now()', () => performance.now() | 0);
});

group({ name: 'creating array', summary: false }, () => {
  bench('new Array(0)', () => new Array(0));
  bench('new Array(2 ** 2)', () => new Array(2 ** 2));
  bench('new Array(2 ** 4)', () => new Array(2 ** 4));
  bench('new Array(2 ** 8)', () => new Array(2 ** 8));
  bench('new Array(2 ** 16)', () => new Array(2 ** 16));
  bench('new Array(2 ** 20)', () => new Array(2 ** 20));
});

await run({ units: true });