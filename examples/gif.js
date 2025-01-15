import { openSync, closeSync, readFileSync } from 'fs';
import { run, bench, boxplot, summary, compact, barplot, group, lineplot, do_not_optimize } from '../src/main.mjs';

barplot(() => {
  summary(() => {
    bench('Date.now()', () => do_not_optimize(Date.now()));
    bench('performance.now()', () => do_not_optimize(performance.now()));
    bench('Bun.nanoseconds()', () => do_not_optimize(Bun.nanoseconds()));
  });
});

group('deleting n keys from object', () => {
  bench('n=$keys', function* (state) {
    const keys = state.get('keys');

    const obj = {};
    for (let i = 0; i < keys; i++) obj[i] = i;

    yield {
      [0]() {
        return { ...obj };
      },

      bench(arg0) {
        for (let i = 0; i < keys; i++) delete arg0[i];
      },
    };
  }).args('keys', [1, 6, 12]);
});

boxplot(() => {
  bench('Bun.mmap', function* () {
    const fd = Bun.mmap('examples/gif.js');

    yield () => fd.slice(0);
  });

  bench('fs.readFileSync', function* () {
    const fd = openSync('examples/gif.js');

    yield () => readFileSync(fd);

    closeSync(fd);
  });
});

lineplot(() => {
  compact(() => {
    bench('Array.from($size)', function* (state) {
      const size = state.get('size');
      yield () => Array.from({ length: size }, (_, o) => o);
    }).range('size', 1, 512);

    bench('new Array($size)', function* (state) {
      const size = state.get('size');

      yield () => {
        const arr = new Array(size);
        for (let o = 0, len = arr.length; o < len; o++) arr[o] = o;
      }
    }).range('size', 1, 512).highlight('green');
  });
});

group('optimized out examples', () => {
  bench('1 + 1', () => 1 + 1);
  bench('empty function', () => { });
});

await run();