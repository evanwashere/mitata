import { now, print } from '../src/lib.mjs';
import { run, bench, boxplot, barplot, lineplot, measure } from '../src/main.mjs';

boxplot(() => {
// barplot(() => {
// lineplot(() => {
  bench('noop', () => { });

  bench('test', function* (state) {
    const size = state.get(0);
    yield () => new Array(size);
  }).args([0]);
});

// cpu info
await run();

// while (true) print(`${now() / 1e6}`);

while (true) {
  const s = await measure(() => { });

  print(`${s.avg}`);
  if (1 < s.avg) print(s.debug);
}