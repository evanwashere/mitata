import { print } from '../src/lib.mjs';
import { run, bench, measure } from '../src/main.mjs';

bench('noop', () => { });

bench('test', function* (state) {
  const size = state.get(0);
  yield () => size;
}).args([0]);

// cpu info
await run();

while (true) {
  const s = await measure(() => { });

  print(`${s.avg}`);
  if (1 < s.avg) print(s.debug);
}