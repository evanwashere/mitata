<h1 align=center>mitata</h1>
<div align=center>benchmark tooling that loves you ❤️</div>
<br />

<div align="center">
  <img width=68% src="https://raw.githubusercontent.com/evanwashere/mitata/master/.github/readme.gif"></img>
</div>

<br />

### Install

`bun add mitata`

`npm install mitata`

try mitata in browser with ai assistant at [https://bolt.new/~/mitata](https://bolt.new/~/mitata)

## Recommendations

- use dedicated hardware for running benchmarks
- read [writing good benchmarks](#writing-good-benchmarks) & [LLVM benchmarking tips](https://llvm.org/docs/Benchmarking.html)
- run with manual garbage collection enabled (e.g. `node --expose-gc ...`)
- install optional [hardware counters](#hardware-counters) extension to see cpu stats like IPC (instructions per cycle)
- make sure your runtime has high-resolution timers and other relevant options/permissions enabled

## Quick Start

<table>
<tr>
<th>javascript</th>
<th>c++ single header</th>
</tr>
<tr>
<td>

```js
import { run, bench, boxplot, summary } from 'mitata';

function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

bench('fibonacci(40)', () => fibonacci(40));

boxplot(() => {
  summary(() => {
    bench('Array.from($size)', function* (state) {
      const size = state.get('size');
      yield () => Array.from({ length: size });
    }).range('size', 1, 1024);
  });
});

await run();
```
  
</td>
<td>

```cpp
#include "src/mitata.hpp"

int fibonacci(int n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

int main() {
  mitata::runner runner;
  runner.bench("noop", []() { });

  runner.summary([&]() {
    runner.bench("empty fn", []() { });
    runner.bench("fibonacci", []() { fibonacci(20); });
  });

  auto stats = runner.run();
}
```

</td>
</tr>
</table>




## configure your experience

```js
import { run } from 'mitata';

await run({ format: 'json' }) // output json
await run({ filter: /new Array.*/ }) // only run benchmarks that match regex filter
await run({ throw: true }); // will immediately throw instead of handling error quietly
await run({ format: { mitata: { name: 'fixed' } } }); // benchmarks name column is fixed length

// c++
auto stats = runner.run({ .colors = true, .format = "json", .filter = std::regex(".*") });
```

## garbage collection

By default, on runtimes with exposed manual gc (like bun or node with `--expose-gc`), mitata runs garbage collection once after each benchmark warmup.

This behavior can be customized using `gc(mode)` method on benchmarks:

```js
bench('lots of allocations', () => {
  Array.from({ length: 1024 }, () => Array.from({ length: 1024 }, () => new Array(1024)));
})
  // mode: false | 'once' (default) | 'inner'

  // once mode runs gc after warmup
  // inner mode runs gc after warmup and before each (batch-)iteration
  .gc('inner');
```

### gc impact and memory usage

For runtimes that provide manual garbage collection or offer access to javscript vm heap usage metrics, additional row will be shown with garbage collection timings or/and estimated heap usage.

```js
------------------------------------------- -------------------------------
new Array(512)               509.42 ns/iter 536.53 ns  ▅▃█      ▂          
                    (449.52 ns … 632.54 ns) 609.34 ns  ███   ▃▅▆█▇         
                    (  0.00  b …  24.00 kb)   1.61 kb ▆████▅▄██████▅▅▅█▅▄▂▂

Array.from(512)                1.29 µs/iter   1.30 µs  ▂▆█                 
                        (1.27 µs … 1.48 µs)   1.40 µs ▂███▇▆▃▃▂▁▁▂▁▁▁▁▁▁▁▁▁
                  gc(457.25 µs … 760.54 µs) 512.32  b (  0.00  b… 84.00 kb)
```

## universal compatibility

Out of box mitata can detect engine/runtime it's running on and fall back to using [alternative](https://github.com/evanwashere/mitata/blob/master/src/lib.mjs#L51) non-standard I/O functions. If your engine or runtime is missing support, open an issue or pr requesting for support.

### how to use mitata with engine CLIs like d8, jsc, graaljs, spidermonkey

```bash
$ xs bench.mjs
$ quickjs bench.mjs
$ d8 --expose-gc bench.mjs
$ spidermonkey -m bench.mjs
$ graaljs --js.timer-resolution=1 bench.mjs
$ /System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc bench.mjs
```

```js
// bench.mjs

import { print } from './src/lib.mjs';
import { run, bench } from './src/main.mjs'; // git clone
import { run, bench } from './node_modules/mitata/src/main.mjs'; // npm install

print('hello world'); // works on every engine
```

## adding arguments and parameters to your benchmarks has never been so easy

With other benchmarking libraries, often it's quite hard to easily make benchmarks that go over a range or run the same function with different arguments without writing spaghetti code, but now with mitata converting your benchmark to use arguments is just a function call away.

```js
import { bench } from 'mitata';

bench(function* look_mom_no_spaghetti(state) {
  const len = state.get('len');
  const len2 = state.get('len2');
  yield () => new Array(len * len2);
})

.args('len', [1, 2, 3])
.range('len', 1, 1024) // 1, 8, 64, 512...
.dense_range('len', 1, 100) // 1, 2, 3 ... 99, 100
.args({ len: [1, 2, 3], len2: ['4', '5', '6'] }) // every possible combination
```

### computed parameters

For cases where you need unique copy of value for each iteration, mitata supports creating computed parameters that do not count towards benchmark results *(note: there is no guarantee of recompute time, order, or call count)*:

```js
bench('deleting $keys from object', function* (state) {
  const keys = state.get('keys');

  const obj = {};
  for (let i = 0; i < keys; i++) obj[i] = i;

  yield {
    [0]() {
      return { ...obj };
    },

    bench(p0) {
      for (let i = 0; i < keys; i++) delete p0[i];
    },
  };
}).args('keys', [1, 10, 100]);
```

### concurrency

`concurrency` option enables transparent concurrent execution of asynchronous benchmark, providing insights into:
- scalability of async functions
- potential bottlenecks in parallel code
- performance under different levels of concurrency

*(note: concurrent benchmarks may have higher variance due to scheduling, contention, event loop and async overhead)*

```js
bench('sleepAsync(1000) x $concurrency', function* () {
  // concurrency inherited from arguments
  yield async () => await sleepAsync(1000);
}).args('concurrency', [1, 5, 10]);

bench('sleepAsync(1000) x 5', function* () {
  yield {
    // concurrency is set manually
    concurrency: 5,

    async bench() {
      await sleepAsync(1000);
    },
  };
});
```

## hardware counters

`bun add @mitata/counters`

`npm install @mitata/counters`

supported on: `macos (apple silicon) | linux (amd64, aarch64)`

linux:
- `/proc/sys/kernel/perf_event_paranoid` has to be set to `2` or lower
- on some vm systems pmu is disabled by hypervisor (usually when cpu core is shared across vms)

macos:
- [Apple Silicon CPU optimization guide/handbook](https://developer.apple.com/documentation/apple-silicon/cpu-optimization-guide)
- Xcode must be installed for complete cpu counters support
- Instruments.app (CPU Counters) has to be closed during benchmarking
- Corrupted install of Xcode/Command Line Tools can result in kernel panic (requires Xcode/Command Line Tools reinstall)

By installing `@mitata/counters` package you can enable collection and displaying of hardware counters for benchmarks.

```rust
------------------------------------------- -------------------------------
new Array(1024)              332.67 ns/iter 337.90 ns   █                  
                    (295.63 ns … 507.93 ns) 455.66 ns ▂██▇▄▂▂▂▁▂▁▃▃▃▂▂▁▁▁▁▁
                  2.41 ipc ( 48.66% stalls)  37.89% L1 data cache
          1.11k cycles   2.69k instructions  33.09% retired LD/ST ( 888.96)

new URL(google.com)          246.40 ns/iter 245.10 ns       █▃             
                    (206.01 ns … 841.23 ns) 302.39 ns ▁▁▁▁▂███▇▃▂▂▂▂▂▂▂▁▁▁▁
                  4.12 ipc (  1.05% stalls)  98.88% L1 data cache
         856.49 cycles   3.53k instructions  28.65% retired LD/ST (  1.01k)
```


## helpful warnings

For those who love doing micro-benchmarks, mitata can automatically detect and inform you about optimization passes like dead code elimination without requiring any special engine flags.

```rust
-------------------------------------- -------------------------------
1 + 1                   318.63 ps/iter 325.37 ps        ▇  █           !
                (267.92 ps … 14.28 ns) 382.81 ps ▁▁▁▁▁▁▁█▁▁█▁▁▁▁▁▁▁▁▁▁
empty function          319.36 ps/iter 325.37 ps          █ ▅          !
                (248.62 ps … 46.61 ns) 382.81 ps ▁▁▁▁▁▁▃▁▁█▁█▇▁▁▁▁▁▁▁▁

! = benchmark was likely optimized out (dead code elimination)
```

## powerful visualizations right in your terminal

With mitata’s ascii rendering capabilities, now you can easily visualize samples in barplots, boxplots, lineplots, histograms, and get clear summaries without any additional tools or dependencies.

```js
import { summary, barplot, boxplot, lineplot } from 'mitata';

// wrap bench() calls in visualization scope
barplot(() => {
  bench(...)
});

                        ┌                                            ┐
                  1 + 1 ┤■ 318.11 ps 
             Date.now() ┤■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ 27.69 ns 
                        └                                            ┘

// scopes can be async
await boxplot(async () => {
  // ...
});

                        ┌                                            ┐
                                        ╷┌─┬─┐                       ╷
            Bubble Sort                 ├┤ │ ├───────────────────────┤
                                        ╵└─┴─┘                       ╵
                        ┬   ╷
             Quick Sort │───┤
                        ┴   ╵
                        ┬
            Native Sort │
                        ┴
                        └                                            ┘
                        90.88 µs            2.43 ms            4.77 ms

// can combine multiple visualizations
lineplot(() => {
  summary(() => {
    // ...
  });

  // bench() calls here wont be part of summary
});

summary
  new Array($len)
   5.42…8.33x faster than Array.from($len)

                        ┌                                            ┐
      Array.from($size)                                            ⢠⠊
       new Array($size)                                          ⢀⠔⠁ 
                                                                ⡠⠃   
                                                              ⢀⠎     
                                                             ⡔⠁      
                                                           ⡠⠊        
                                                         ⢀⠜          
                                                        ⡠⠃           
                                                       ⡔⠁            
                                                     ⢀⠎              
                                                    ⡠⠃               
                                                  ⢀⠜                 
                                                 ⢠⠊             ⣀⣀⠤⠤⠒
                                                ⡰⠁       ⣀⡠⠤⠔⠒⠊⠉     
                                           ⣀⣀⣀⠤⠜   ⣀⡠⠤⠒⠊⠉            
                         ⣤⣤⣤⣤⣤⣤⣤⣤⣤⣤⣤⣤⣔⣒⣒⣊⣉⠭⠤⠤⠤⠤⠤⠒⠊⠉               
                        └                                            ┘
```

## give your own code power of mitata

In case you don’t need all the fluff that comes with mitata or just need raw results, mitata exports its fundamental building blocks to allow you to easily build your own tooling and wrappers without losing any core benefits of using mitata.

```cpp
#include "src/mitata.hpp"

int main() {
  auto stats = mitata::lib::fn([]() { /***/ })
}
```

```js
import { B, measure } from 'mitata';

// lowest level for power users
const stats = await measure(function* (state) {
  const size = state.get('x');

  yield {
    [0]() {
      return size;
    },

    bench(size) {
      return new Array(size);
    },
  };
}, {
  args: { x: 1 },
  batch_samples: 5 * 1024,
  min_cpu_time: 1000 * 1e6,
});

// explore how magic happens
console.log(stats.debug) // -> jit optimized source code of benchmark

// higher level api that includes mitata's argument and range features
const b = new B('new Array($x)', function* (state) {
  const size = state.get('x');
  yield () => new Array(size);
}).args('x', [1, 5, 10]);

const trial = await b.run();
```

## accuracy down to picoseconds

By leveraging the power of javascript JIT compilation, mitata is able to generate zero-overhead measurement loops that provide picoseconds precision in timing measurements. These loops are so precise that they can even be reused to provide additional features like CPU clock frequency estimation and dead code elimination detection, all while staying inside javascript vm sandbox.

With [computed parameters](#computed-parameters) and [garbage collection tuning](#garbage-collection), you can tap into mitata's code generation capabilities to further refine the accuracy of your benchmarks. Using computed parameters ensures that parameters computation is moved outside the benchmark, thereby preventing the javascript JIT from performing loop invariant code motion optimization.

```rust
// node --expose-gc --allow-natives-syntax tools/compare.mjs
clk: ~2.71 GHz
cpu: Apple M2 Pro
runtime: node 23.3.0 (arm64-darwin)

benchmark                   avg (min … max) p75   p99    (min … top 1%)
------------------------------------------- -------------------------------
a / b                          4.59 ns/iter   4.44 ns █                    
                       (4.33 ns … 25.86 ns)   6.91 ns ██▂▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁
                  6.70 ipc (  2.17% stalls)    NaN% L1 data cache
          16.80 cycles  112.52 instructions   0.00% retired LD/ST (   0.00)

a / b (computed)               4.23 ns/iter   4.10 ns ▇█                   
                       (3.88 ns … 30.03 ns)   7.26 ns ██▅▂▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁
                  6.40 ipc (  2.10% stalls)    NaN% L1 data cache
          15.70 cycles  100.53 instructions   0.00% retired LD/ST (   0.00)
4.59 ns/iter - https://npmjs.com/mitata

// vs other libraries

a / b x 90,954,882 ops/sec ±2.13% (92 runs sampled)
10.99 ns/iter - https://npmjs.com/benchmark

┌─────────┬───────────┬──────────────────────┬─────────────────────┬────────────────────────────┬───────────────────────────┬──────────┐
│ (index) │ Task name │ Latency average (ns) │ Latency median (ns) │ Throughput average (ops/s) │ Throughput median (ops/s) │ Samples  │
├─────────┼───────────┼──────────────────────┼─────────────────────┼────────────────────────────┼───────────────────────────┼──────────┤
│ 0       │ 'a / b'   │ '27.71 ± 0.09%'      │ '41.00'             │ '28239766 ± 0.01%'         │ '24390243'                │ 36092096 │
└─────────┴───────────┴──────────────────────┴─────────────────────┴────────────────────────────┴───────────────────────────┴──────────┘
27.71 ns/iter - vitest bench / https://npmjs.com/tinybench

a / b x 86,937,932 ops/sec (11 runs sampled) v8-never-optimize=true min..max=(11.32ns...11.62ns)
11.51 ns/iter - https://npmjs.com/bench-node

╔══════════════╤═════════╤════════════════════╤═══════════╗
║ Slower tests │ Samples │             Result │ Tolerance ║
╟──────────────┼─────────┼────────────────────┼───────────╢
║ Fastest test │ Samples │             Result │ Tolerance ║
╟──────────────┼─────────┼────────────────────┼───────────╢
║ a / b        │   10000 │ 14449822.99 op/sec │  ± 4.04 % ║
╚══════════════╧═════════╧════════════════════╧═══════════╝
69.20 ns/iter - https://npmjs.com/cronometro
```

<details>
<summary>same test with v8 jit compiler disabled:</summary>

```rust
// node --expose-gc --allow-natives-syntax --jitless tools/compare.mjs
clk: ~0.06 GHz
cpu: Apple M2 Pro
runtime: node 23.3.0 (arm64-darwin)

benchmark                   avg (min … max) p75   p99    (min … top 1%)
------------------------------------------- -------------------------------
a / b                         74.52 ns/iter  75.53 ns █                    
                     (71.96 ns … 104.94 ns)  92.01 ns █▅▇▅▅▃▃▂▁▁▁▁▁▁▁▁▁▁▁▁▁
                  5.78 ipc (  0.51% stalls)    NaN% L1 data cache
         261.51 cycles   1.51k instructions   0.00% retired LD/ST (   0.00)

a / b (computed)              56.05 ns/iter  57.20 ns █                    
                      (53.62 ns … 84.69 ns)  73.21 ns █▅▆▅▅▃▃▂▂▁▁▁▁▁▁▁▁▁▁▁▁
                  5.65 ipc (  0.59% stalls)    NaN% L1 data cache
         197.74 cycles   1.12k instructions   0.00% retired LD/ST (   0.00)
74.52 ns/iter - https://npmjs.com/mitata

// vs other libraries

a / b x 11,232,032 ops/sec ±0.50% (99 runs sampled)
89.03 ns/iter - https://npmjs.com/benchmark

┌─────────┬───────────┬──────────────────────┬─────────────────────┬────────────────────────────┬───────────────────────────┬─────────┐
│ (index) │ Task name │ Latency average (ns) │ Latency median (ns) │ Throughput average (ops/s) │ Throughput median (ops/s) │ Samples │
├─────────┼───────────┼──────────────────────┼─────────────────────┼────────────────────────────┼───────────────────────────┼─────────┤
│ 0       │ 'a / b'   │ '215.53 ± 0.08%'     │ '208.00'            │ '4786095 ± 0.01%'          │ '4807692'                 │ 4639738 │
└─────────┴───────────┴──────────────────────┴─────────────────────┴────────────────────────────┴───────────────────────────┴─────────┘
215.53 ns/iter - vitest bench / https://npmjs.com/tinybench

a / b x 10,311,999 ops/sec (11 runs sampled) v8-never-optimize=true min..max=(95.66ns...97.51ns)
96.86 ns/iter - https://npmjs.com/bench-node

╔══════════════╤═════════╤═══════════════════╤═══════════╗
║ Slower tests │ Samples │            Result │ Tolerance ║
╟──────────────┼─────────┼───────────────────┼───────────╢
║ Fastest test │ Samples │            Result │ Tolerance ║
╟──────────────┼─────────┼───────────────────┼───────────╢
║ a / b        │    2000 │ 4664908.00 op/sec │  ± 0.94 % ║
╚══════════════╧═════════╧═══════════════════╧═══════════╝
214.37 ns/iter - https://npmjs.com/cronometro
```
</details>

## writing good benchmarks

Creating accurate and meaningful benchmarks requires careful attention to how modern JavaScript engines optimize code. This covers essential concepts and best practices to ensure your benchmarks measure actual performance characteristics rather than optimization artifacts.

### examples
- [readme gif](/examples/gif.js)
- [cpu cache line size](/examples/cacheline.js)
- [holey vs packed arrays](/examples/holey_array.js)

### dead code elimination

JIT can detect and eliminate code that has no observable effects. To ensure your benchmark code executes as intended, you must create observable side effects.

```js
import { do_not_optimize } from 'mitata';

bench(function* () {
  // ❌ Bad: jit can see that function has zero side-effects
  yield () => new Array(0);
  // will get optimized to:
  /*
    yield () => {};
  */

  // ✅ Good: do_not_optimize(value) emits code that causes side-effects
  yield () => do_not_optimize(new Array(0));
});
```

### garbage collection pressure

For benchmarks involving significant memory allocations, controlling garbage collection frequency can improve results consistency.

```js
// ❌ Bad: unpredictable gc pauses
bench(() => {
  const bigArray = new Array(1000000);
});

// ✅ Good: gc before each (batch-)iteration
bench(() => {
  const bigArray = new Array(1000000);
}).gc('inner'); // run gc before each iteration
```

### loop invariant code motion optimization

JavaScript engines can optimize away repeated computations by hoisting them out of loops or caching results. Use computed parameters to prevent loop invariant code motion optimization.

```js
bench(function* (ctx) {
  const str = 'abc';

  // ❌ Bad: JIT sees that both str and 'c' search value are constants/comptime-known
  yield () => str.includes('c');
  // will get optimized to:
  /*
    yield () => true;
  */

  // ❌ Bad: JIT sees that computation doesn't depend on anything inside loop
  const substr = ctx.get('substr');
  yield () => str.includes(substr);
  // will get optimized to:
  /*
    const $0 = str.includes(substr);
    yield () => $0;
  */

  // ✅ Good: using computed parameters prevents jit from performing any loop optimizations
  yield {
    [0]() {
      return str;
    },

    [1]() {
      return substr;
    },

    bench(str, substr) {
      return do_not_optimize(str.includes(substr));
    },
  };
}).args('substr', ['c']);
```

## License

MIT © [evanwashere](https://github.com/evanwashere)