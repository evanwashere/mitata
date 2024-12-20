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
- run with garbage collection enabled (e.g. `node --expose-gc ...`)
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
import { run, bench, boxplot } from 'mitata';

function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

bench('fibonacci(40)', () => fibonacci(40));

boxplot(() => {
  bench('Array.from($size)', function* (state) {
    const size = state.get('size');
    yield () => Array.from({ length: size });
  }).range('size', 1, 1024);
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

await run({ format: 'mitata', colors: false }); // default format
await run({ filter: /new Array.*/ }) // only run benchmarks that match regex filter
await run({ throw: true }); // will immediately throw instead of handling error quietly

// c++
auto stats = runner.run({ .colors = true, .format = "json", .filter = std::regex(".*") });
```

## automatic garbage collection

On runtimes that expose gc (e.g. bun, `node --expose-gc ...`), mitata will automatically run garbage collection before each benchmark.

This behavior can be further customized via the `gc` function on each benchmark (you should only do this when absolutely necessary - big gc spikes):

```js
bench('lots of allocations', () => {
  Array.from({ length: 1024 }, () => Array.from({ length: 1024 }, () => new Array(1024)));
})
// false | 'once' (default) | 'inner'
// once runs gc after warmup
// inner runs gc after warmup and before each (batch-)iteration
.gc('inner');
```

## universal compatibility

Out of box mitata can detect engine/runtime it's running on and fall back to using [alternative](https://github.com/evanwashere/mitata/blob/master/src/lib.mjs#L43) non-standard I/O functions. If your engine or runtime is missing support, open an issue or pr requesting for support.

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

## hardware counters

`bun add @mitata/counters`

`npm install @mitata/counters`

supported on: `macos (apple silicon) | linux (amd64, aarch64)`

macos:
- Xcode must be installed for complete cpu counters support
- Instruments.app (CPU Counters) has to be closed during benchmarking

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

with mitata’s ascii rendering capabilities, now you can easily visualize samples in barplots, boxplots, lineplots, histograms, and get clear summaries without any additional tools or dependencies.

```rust
-------------------------------------- -------------------------------
1 + 1                   318.11 ps/iter 325.37 ps         ▇   █         !
                (267.92 ps … 11.14 ns) 363.97 ps ▁▁▁▁▁▁▁▁█▁▁▁█▁▁▁▁▁▁▁▁
Date.now()               27.69 ns/iter  27.48 ns  █                   
                 (27.17 ns … 44.10 ns)  32.74 ns ▃█▂▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁

                        ┌                                            ┐
                  1 + 1 ┤■ 318.11 ps 
             Date.now() ┤■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ 27.69 ns 
                        └                                            ┘

-------------------------------------- -------------------------------
Bubble Sort               2.11 ms/iter   2.26 ms  █                   
                   (1.78 ms … 6.93 ms)   4.77 ms ▃█▃▆▅▂▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁
Quick Sort              159.60 µs/iter 154.50 µs  █                   
               (133.13 µs … 792.21 µs) 573.00 µs ▅█▂▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁
Native Sort              97.20 µs/iter  97.46 µs        ██            
                (90.88 µs … 688.92 µs) 105.00 µs ▁▁▂▁▁▂▇██▇▃▃▃▃▃▂▂▂▁▁▁

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

-------------------------------------- -------------------------------
new Array(1)              3.57 ns/iter   3.20 ns    6.64 ns ▁█▄▂▁▁▁▁▁▁
new Array(8)              5.21 ns/iter   4.31 ns    8.85 ns ▁█▄▁▁▁▁▁▁▁
new Array(64)            17.94 ns/iter  13.40 ns  171.89 ns █▂▁▁▁▁▁▁▁▁
new Array(512)          188.05 ns/iter 246.88 ns  441.81 ns █▃▃▃▃▂▂▁▁▁
new Array(1024)         364.93 ns/iter 466.91 ns  600.34 ns █▄▁▁▁▅▅▃▂▁
Array.from(1)            29.73 ns/iter  29.24 ns   36.88 ns ▁█▄▃▂▁▁▁▁▁
Array.from(8)            33.96 ns/iter  32.99 ns   42.45 ns ▂█▄▂▂▁▁▁▁▁
Array.from(64)          146.52 ns/iter 143.82 ns  310.93 ns █▅▁▁▁▁▁▁▁▁
Array.from(512)           1.11 µs/iter   1.18 µs    1.34 µs ▃▅█▂▆▅▄▂▂▁
Array.from(1024)          1.98 µs/iter   2.09 µs    2.40 µs ▃█▃▃▇▇▄▂▁▁

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
  yield () => new Array(size);
}, {
  args: { x: 1 },
  batch_samples: 5 * 1024,
  min_cpu_time: 1000 * 1e6,
});

// explore how magic happens
console.log(stats.debug) // -> jit optimized source code of benchmark

// higher level api that includes mitata's argument and range features
const b = new B('new Array($x)', state => {
  const size = state.get('x');
  for (const _ of state) new Array(size);
}).args('x', [1, 5, 10]);

const trial = await b.run();
```

## accuracy down to picoseconds

By leveraging the power of javascript JIT compilation, mitata is able to generate zero-overhead measurement loops that provide picoseconds precision in timing measurements. These loops are so precise that they can even be reused to provide additional features like CPU clock frequency estimation and dead code elimination detection, all while staying inside javascript vm sandbox.

With [computed parameters](#computed-parameters) and [garbage collection tuning](#automatic-garbage-collection), you can tap into mitata's code generation capabilities to further refine the accuracy of your benchmarks. Using computed parameters ensures that parameters computation is moved outside the benchmark, thereby preventing the javascript JIT from performing loop invariant code motion optimization.

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


## License

MIT © [Evan](https://github.com/evanwashere)