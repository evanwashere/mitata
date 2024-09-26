import { print } from '../src/lib.mjs';
import { run, bench, measure } from '../src/main.mjs';
// for (let o = 0; o < 1024; o++) bench('noop', () => { });
for (let o = 0; o < 1024; o++) bench('noop_iter', state => { for (const _ of state); });

await run();