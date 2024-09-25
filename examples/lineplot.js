import { run, bench, lineplot } from 'mitata';

lineplot(() => {
  bench('new Array(8)', () => +new Array(8));
});

lineplot(() => {
  bench('new Array(8)', () => +new Array(8));
  bench('new Array(32)', () => +new Array(32));
  // bench('new Array(128)', () => +new Array(128));
  // bench('new Array(512)', () => +new Array(512));
  // bench('new Array(2048)', () => +new Array(2048));
});

lineplot(() => {
    bench('Array.from($size)', function* (state) {
    const size = state.get('size');
    yield () => Array.from({ length: size }, (_, i) => i);
  }).range('size', 1, 1024);
});

lineplot(() => {
  bench('new Array(32)', () => +new Array(32));

  bench('Array.from($size)', function* (state) {
    const size = state.get('size');
    yield () => Array.from({ length: size }, (_, i) => i);
  }).range('size', 1, 1024);

  bench('new Array($size)', function* (state) {
    const size = state.get('size');
    yield () => new Array(size);
  }).range('size', 1, 1024);
});

await run();