import { run, bench, lineplot } from 'mitata';

lineplot(() => {
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