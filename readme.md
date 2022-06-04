<h1 align=center>mitata</h1>
<div align=center>cross-runtime benchmarking lib</div>

<br />

### Install
`bun add mitata`

`npm install mitata`

## Examples
```js
import { run, bench, group, baseline } from 'mitata';

// deno
// import { ... } from 'https://esm.sh/mitata';

// d8/jsc
// import { ... } from '<path to mitata>/src/cli.mjs';

bench('noop', () => {});
bench('noop2', () => {});

group('group', () => {
  baseline('baseline', () => {});
  bench('Date.now()', () => Date.now());
  bench('performance.now()', () => performance.now());
});

group({ name: 'group2', summary: false }, () => {
  bench('new Array(0)', () => new Array(0));
  bench('new Array(1024)', () => new Array(1024));
});

await run({
  avg: true, // enable/disable avg column (default: true)
  json: false, // enable/disable json output (default: false)
  colors: true, // enable/disable colors (default: true)
  min_max: true, // enable/disable min/max column (default: true)
  collect: false, // enable/disable collecting returned values into an array during the benchmark (default: false)
  percentiles: false, // enable/disable percentiles column (default: true)
});
```
output:

<details>
  <summary>terminal screenshot (click to view)</summary>

  ![preview.png](https://cdn.discordapp.com/attachments/982583748811980830/982583770618142770/unknown.png)
</details>

```js
cpu: Apple M1
runtime: bun 0.0.83 (arm64-darwin)

benchmark              time (avg)             (min … max)
---------------------------------------------------------
noop               323.34 ps/iter    (304.1 ps … 8.64 ns)
noop2              387.15 ps/iter   (304.1 ps … 16.79 ns)

• group
---------------------------------------------------------
baseline           782.71 ps/iter    (304.1 ps … 6.34 ns)
Date.now()          31.04 ns/iter    (30.9 ns … 34.59 ns)
performance.now()   92.71 ns/iter  (91.72 ns … 101.45 ns)

summary for group
  baseline
   39.66x faster than Date.now()
   118.45x faster than performance.now()

• group2
---------------------------------------------------------
new Array(0)         7.47 ns/iter   (6.46 ns … 269.07 ns)
new Array(1024)    286.39 ns/iter  (241.37 ns … 560.7 ns)
```


## JIT bias
If you run benchmarks like this, you might notice that they get slower (only few nanoseconds) after the first few runs.

```js
bench('noop', () => {});
bench('noop', () => {});
bench('noop', () => {});
bench('noop', () => {});
bench('noop', () => {});
bench('noop', () => {});
bench('noop', () => {});
bench('noop', () => {});
bench('noop', () => {});
bench('noop', () => {});
bench('noop', () => {});
bench('noop', () => {});
bench('noop', () => {});
```

I call this behavior "JIT bias". In simple words, v8 and JSC JIT expect us to pass the same function, so they optimize for it, but we break that promise and get deoptimized.

## License

MIT © [Evan](https://github.com/evanwashere)