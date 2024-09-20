import { run, bench, barplot } from 'mitata';

const longString = 'a'.repeat(1000000);

barplot(() => {
  bench('String concatenation', () => {
    let result = '';
    for (let i = 0; i < 1000; i++) {
      result += 'a';
    }
  });

  bench('Array join', () => {
    const arr = new Array(1000).fill('a');
    arr.join('');
  });

  bench('String includes', () => {
    longString.includes('aaaaa');
  });

  // this one will likely get optimized out by JIT
  bench('String indexOf', () => {
    longString.indexOf('aaaaa');
  });
});

await run();