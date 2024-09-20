<h1 align=center>mitata</h1>
<div align=center>benchmark tooling that makes your heart warm</div>
<br />

<div align="center">
  <img width=68% src="https://cdn.evan.lol/mitata1.gif"></img>
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

## broad engine support

Out of box mitata can detect runtime it's running on and fall back to using [alternative](https://github.com/evanwashere/mitata/blob/2ecd49e5836b7b124c7ea2d4836fdfd8db3c5641/src/lib.mjs#L30) non-standard I/O functions. If your engine or runtime is missing support, open an issue or pr requesting for support.

## argumentizing your benchmarks has never been so easy
With other benchmarking libraries, it has always been hard to easily make benchmarks that go over a range or run the same function with different arguments. Now with mitata you can easily add arguments to any benchmark without needing to write spaghetti wrappers.

```js
import { bench } from 'mitata';

bench(function* look_mom(state) {
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

```js
-------------------------------------- -------------------------------
1 + 1                   316.09 ps/iter ▁▁▁▁▁▁▁▁▁▁█▁▁▁▁▄▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁ !
                (267.92 ps … 16.72 ns) 325.37 ps  382.81 ps  440.72 ps
empty function          318.63 ps/iter ▁▁▁▁▁▁▁▁▁▁█▁▁▁▁▄▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁ !
                (267.92 ps … 13.69 ns) 325.37 ps  382.81 ps    2.11 ns
                
! = benchmark was likely optimized out (dead code elimination)
```

## powerful visualizations right in your terminal

mitata can render your benchmarks to ASCII barplots, boxplots, histograms, and clear summaries without any additional dependencies.

```rust
-------------------------------------- -------------------------------
1 + 1                   319.04 ps/iter ▁▁▁▁▁▁▁▁▁▁▇▁▁▁▁█▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁ !
                (267.92 ps … 15.78 ns) 325.37 ps  382.81 ps  459.56 ps
Date.now()               27.59 ns/iter ▁▁▂█▄▂▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁ ▁
                 (27.17 ns … 34.10 ns)  27.55 ns   29.68 ns   32.34 ns <

                        ┌                                              ┐
                  1 + 1 ┤■ 319.04 ps 
             Date.now() ┤■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ 27.59 ns 
                        └                                              ┘

-------------------------------------- -------------------------------
Bubble Sort               2.13 ms/iter ▂▄▅█▄▃▂▂▁▂▃▄▂▂▂▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁ ▁
                   (1.79 ms … 7.54 ms)   2.29 ms    5.47 ms    7.54 ms <
Quick Sort              169.72 µs/iter ▁█▅▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁ ▁
               (137.75 µs … 873.83 µs) 165.38 µs  585.38 µs  802.96 µs <
Native Sort              97.46 µs/iter ▁▁▁▁▁▃▇█▅▂▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁ ▁
                (92.29 µs … 548.13 µs)  97.67 µs  109.38 µs  121.67 µs <

                        ┌                                              ┐
                                       ╷┌─┬┐                           ╷
            Bubble Sort                ├┤ │├───────────────────────────┤
                                       ╵└─┴┘                           ╵
                        ┬   ╷
             Quick Sort │───┤
                        ┴   ╵
                        ┬
            Native Sort │
                        ┴
                        └                                              ┘
                        92.29 µs             2.78 ms             5.47 ms

-------------------------------------- -------------------------------
new Array(1)              3.56 ns/iter   3.18 ns    6.70 ns  163.70 ns ▁▇▂▁▁▁▁▁▁
new Array(8)              5.18 ns/iter   4.37 ns    8.92 ns  182.83 ns ▁▅█▁▁▁▁▁▁
new Array(64)            17.99 ns/iter  13.81 ns  160.50 ns  230.60 ns █▂▁▁▁▁▁▁▁
new Array(512)          207.45 ns/iter 265.53 ns  623.54 ns    1.38 µs █▄▃▃▁▁▁▁▁
new Array(1024)         344.15 ns/iter 438.99 ns  528.57 ns  952.57 ns █▃▁▁▁▄▅▂▁
Array.from(1)            29.78 ns/iter  29.22 ns   38.05 ns  202.32 ns ▁█▂▁▁▁▁▁▁
Array.from(8)            34.10 ns/iter  33.57 ns   43.35 ns  230.79 ns ▂█▂▁▁▁▁▁▁
Array.from(64)          145.14 ns/iter 141.49 ns  312.88 ns  354.53 ns ▇▃▁▁▁▁▁▁▁
Array.from(512)           1.11 µs/iter   1.18 µs    1.36 µs    1.38 µs ▁▄▇▂▃▃▂▁▁
Array.from(1024)          1.94 µs/iter   2.02 µs    2.34 µs    2.35 µs ▄▄▄▅█▃▂▁▁

summary
  new Array($len)
   5.63…8.36x faster than Array.from($len)

```

## give your own code power of mitata

mitata exposes its powerful building blocks to allow anyone to build and explore on top of its tooling and compatibility with various engines and runtimes.

```js
import { B, measure } from 'mitata';

const stats = await measure(() => fibonacci(10), {
  min_warmup_samples: 1000,
});

await measure(state => {
  const size = state.get('x');
  for (const _ of state) new Array(size);
}, { args: { x: 1 } });

console.log(stats._debug) // -> source code of benchmark

const b = new B('new Array($x)', state => {
  const size = state.get('x');
  for (const _ of state) new Array(size);
}).args('x', [1, 5, 10]);

const result = await b.run();
```

## License

MIT © [Evan](https://github.com/evanwashere)