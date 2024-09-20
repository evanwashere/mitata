import { B, measure } from 'mitata';

// Example function to measure
function complexCalculation(n) {
  let result = 0;
  for (let i = 0; i < n; i++) {
    result += Math.sin(i) * Math.cos(i);
  }
  return result;
}

// Using the measure function directly
const result = await measure(() => complexCalculation(10000));

// Using the B class for more complex benchmarking
const benchmark = new B('Complex Calculation', function* (state) {
  const n = state.get('n');
  yield () => complexCalculation(n);
}).range('n', 1000, 100000, 10);

// Run the benchmark
const benchmarkResult = await benchmark.run();