import { run, bench, summary } from '..';

function fibonacci(n) {
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}

function fibonacciRecursive(n) {
  if (n <= 1) return n;
  return fibonacciRecursive(n - 1) + fibonacciRecursive(n - 2);
}

function fibonacciIterative(n) {
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}

summary(() => {
  bench('recursive fibonacci (20)', () => {
    fibonacciRecursive(20);
  });

  bench('iterative fibonacci (20)', () => {
    fibonacciIterative(20);
  });

  bench('fibonacci($n)', function* (state) {
    const n = state.get('n');
    yield () => fibonacci(n);
  }).range('n', 10, 40, 2);
});

await run();