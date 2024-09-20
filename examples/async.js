import { run, bench, group, compact } from 'mitata';

async function sleep(ms) {
  return await new Promise(resolve => setTimeout(resolve, ms));
}

group(() => {
  bench('$n x sleep($ms)', async (state) => {
    const n = state.get('n');
    const ms = state.get('ms');

    for (const _ of state) {
      for (let o = 0; o < n; o++) await sleep(ms);
    }
  }).args({ ms: [1], n: [10, 20] });
});

compact(() => {
  bench('$n x sleep($ms)', function* (state) {
    const n = state.get('n');
    const ms = state.get('ms');

    yield async () => {
      for (let o = 0; o < n; o++) await sleep(ms);
    };
  }).args('ms', [1]).args('n', [5, 15]);
});

await run();