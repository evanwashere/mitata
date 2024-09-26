import { print } from '../src/lib.mjs';
import { run, bench, measure } from '../src/main.mjs';

bench('test', () => +new Array(10));

// cpu info
await run();

while (true) {
  const s = await measure(() => { });

  print(`${s.avg}`);
  if (1 < s.avg) print(s.debug);
}