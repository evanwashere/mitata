import { run, bench, summary } from 'mitata';

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
  bench('Recursive Fibonacci', () => {
    fibonacciRecursive(20);
  });

  bench('Iterative Fibonacci', () => {
    fibonacciIterative(20);
  });
});

await run();