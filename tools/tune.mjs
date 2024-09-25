import { run, bench, measure } from '../src/main.mjs';

bench('test', () => +new Array(10));

// cpu info
await run();

while (true) {
  const s = await measure(() => {});

  console.log(s.avg);
  if (1 < s.avg) console.log(s.debug);
}