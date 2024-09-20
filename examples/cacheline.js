import { run, bench, boxplot } from 'mitata';

// https://lemire.me/blog/2023/12/12/measuring-the-size-of-the-cache-line-empirically/

boxplot(() => {
  bench('stride copy ($stride)', function* (state) {
    const size = 32 * 1024 * 1024;
    const stride = state.get('stride');
    const buffer0 = new Uint8Array(size);
    const buffer1 = new Uint8Array(size);

    yield () => {
      for (let o = 0; o < size; o += stride) {
        buffer1[o] = buffer0[o];
      }
    }
  }).range('stride', 16, 512, 2);
})

await run();