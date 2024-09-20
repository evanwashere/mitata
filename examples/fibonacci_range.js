import { run, bench, summary } from 'mitata';

function fibonacci(n) {
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}

summary(() => {
  bench('fibonacci($n)', function* (state) {
    const n = state.get('n');
    yield () => fibonacci(n);
  }).range('n', 10, 40, 2);

  bench('Array.from($size)', function* (state) {
    const size = state.get('size');
    yield () => Array.from({ length: size }, (_, i) => i);
  }).dense_range('size', 1000, 10000, 1000);
});

await run();