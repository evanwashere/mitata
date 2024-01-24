<h1 align=center>mitata</h1>
<div align=center>cross-runtime benchmarking lib</div>
<br />

<div align="center">
  <img width=72% src="https://cdn.evan.lol/mitata.gif"></img>
</div>

<br />

### Install
`bun add mitata`

`npm install mitata`

## Example
```js
import { run, bench, group, baseline } from 'mitata';

// deno
// import { ... } from 'npm:mitata';

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
  silent: false, // enable/disable stdout output
  avg: true, // enable/disable avg column (default: true)
  json: false, // enable/disable json output (default: false)
  colors: true, // enable/disable colors (default: true)
  min_max: true, // enable/disable min/max column (default: true)
  percentiles: false, // enable/disable percentiles column (default: true)
});
```


## License

MIT © [Evan](https://github.com/evanwashere)