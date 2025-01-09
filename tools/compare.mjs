// node --expose-gc --allow-natives-syntax compare.mjs

// shared
let o = 0;
import { $, do_not_optimize } from 'mitata';
import { isMainThread } from 'node:worker_threads';
const z0 = Array.from({ length: 2 ** 16 }, () => Math.random());
const z1 = Array.from({ length: 2 ** 16 }, () => Math.random());

const b = () => {
  const offset = o++ % z0.length;
  return do_not_optimize(z0[offset] / z1[offset]);
};

// mitata
import { run, bench } from 'mitata';

if (isMainThread) {
  bench('a / b (warmup)', () => b()).compact();
  bench('a / b', () => b());

  bench('a / b (computed)', function* () {
    yield {
      [0]() {
        return Math.random();
      },

      [1]() {
        return Math.random();
      },

      bench(a, b) {
        return do_not_optimize(a / b);
      },
    };
  });

  console.log(`${$.time((await run()).benchmarks[1].runs[0].stats.avg)}/iter - https://npmjs.com/mitata`);
}

// benchmark.js - https://npmjs.com/benchmark
import Benchmark from 'benchmark';
const { Suite } = Benchmark;

if (isMainThread) {
  const suite = new Suite();
  suite.add('a / b (warmup)', () => b());
  suite.add('a / b', () => b());
  suite.on('cycle', (event) => {
    console.log(String(event.target));
    if (event.target.name === 'a / b') console.log(`${$.time(1e9 * event.target.stats.mean)}/iter - https://npmjs.com/benchmark`);
  });

  await suite.run();
}

// vitest bench (tinybench) - https://npmjs.com/tinybench

import { Bench } from 'tinybench';

if (isMainThread) {
  const tb = new Bench();
  tb.add('a / b (warmup)', () => b());
  tb.add('a / b', () => b());

  await tb.run();
  console.table(tb.table());
  console.log(`${$.time(1e6 * tb._tasks.get('a / b').result.mean)}/iter - vitest bench / https://npmjs.com/tinybench`);
}

// bench-node - https://npmjs.com/bench-node
import { Suite as BNSuite } from 'bench-node';

if (isMainThread) {
  const nbsuite = new BNSuite();
  nbsuite.add('a / b (warmup)', () => b());
  nbsuite.add('a / b', () => b());
  console.log(`${$.time((await nbsuite.run())[1].histogram.mean)}/iter - https://npmjs.com/bench-node`);
}

// cronometro - https://npmjs.com/cronometro
import cronometro from 'cronometro';

const results = await cronometro({
  'a / b (warmup)'() {
    return b();
  },

  'a / b'() {
    return b();
  },
});

if (isMainThread) {
  console.log(`${$.time(results['a / b'].mean)}/iter - https://npmjs.com/cronometro`);
}