<h1 align=center>mitata</h1>
<div align=center>benchmark tooling that loves you ❤️</div>
<br />

<div align="center">
  <img width=68% src="https://cdn.evan.lol/mitata1_readme.gif"></img>
</div>

<br />

### Install

`bun add mitata`

`npm install mitata`

## Quick Start

```js
import { run, bench, boxplot } from 'mitata';

function fibonacciRecursive(n) {
  if (n <= 1) return n;
  return fibonacciRecursive(n - 1) + fibonacciRecursive(n - 2);
}

bench('fibonacci(40)', () => fibonacciRecursive(40));

boxplot(() => {
  bench('new Array($size)', function* (state) {
    const size = state.get('size');
    yield () => Array.from({ length: size });
  }).range('size', 1, 1024);
});

await run();
```

## configure your experience

```js
import { run } from 'mitata';

await run({ format: 'mitata', colors: false }); // default format
await run({ filter: /new Array.*/ }) // only run benchmarks that match regex filter
await run({ throw: true }); // will immediately throw instead of handling error quietly
```

## automatic garbage collection

On runtimes that expose gc (e.g. bun, `node --expose-gc ...`), mitata will automatically run garbage collection before each benchmark.

## universal compatibility

Out of box mitata can detect engine/runtime it's running on and fall back to using [alternative](https://github.com/evanwashere/mitata/blob/2ecd49e5836b7b124c7ea2d4836fdfd8db3c5641/src/lib.mjs#L30) non-standard I/O functions. If your engine or runtime is missing support, open an issue or pr requesting for support.

## argumentizing your benchmarks has never been so easy

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

## License

MIT © [Evan](https://github.com/evanwashere)