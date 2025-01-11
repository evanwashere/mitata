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
});

await run();

/*
clk: ~3.34 GHz
cpu: Apple M2 Pro
runtime: bun 1.1.42 (arm64-darwin)

benchmark                   avg (min … max) p75   p99    (min … top 1%)
------------------------------------------- -------------------------------
stride copy (16)               1.14 ms/iter   1.16 ms  ▇▆█▇▄               
                        (1.07 ms … 1.88 ms)   1.31 ms ██████▇▇▅▃▅▄▅▆▃▂▂▂▂▁▁
                  3.74 ipc ( 35.60% stalls)  65.31% L1 data cache
          3.96M cycles  14.81M instructions  28.53% retired LD/ST (  4.22M)

stride copy (32)               1.14 ms/iter   1.17 ms  ▄█▇▅▂               
                        (1.07 ms … 1.49 ms)   1.31 ms ▅█████▇▅▅▅▄▃▅▅▃▄▃▂▁▂▂
                  2.67 ipc ( 27.41% stalls)  60.91% L1 data cache
          3.96M cycles  10.59M instructions  19.96% retired LD/ST (  2.11M)

stride copy (64)               1.13 ms/iter   1.15 ms   █▆▆▅               
                        (1.06 ms … 1.31 ms)   1.28 ms ▅██████▇▅▄▃▄▃▅▄▂▄▂▂▂▂
                  1.35 ipc ( 51.30% stalls)  10.00% L1 data cache
          3.93M cycles   5.30M instructions  19.92% retired LD/ST (  1.06M)

stride copy (128)              1.69 ms/iter   1.71 ms     █▅               
                        (1.61 ms … 2.09 ms)   1.86 ms ▂▂▇▇███▆▆▆▄▂▄▁▂▂▁▁▁▁▁
                  0.46 ipc ( 36.19% stalls)   1.63% L1 data cache
          5.89M cycles   2.69M instructions  19.71% retired LD/ST (530.48k)

stride copy (256)            706.60 µs/iter 716.54 µs  ▂▆█▆▄               
                      (669.17 µs … 1.16 ms) 804.33 µs ▂█████▇█▇▄▅▃▂▂▂▁▂▂▂▁▁
                  0.54 ipc ( 35.69% stalls)   1.80% L1 data cache
          2.46M cycles   1.34M instructions  19.72% retired LD/ST (263.77k)

stride copy (512)            291.77 µs/iter 294.21 µs  █▅                  
                    (281.71 µs … 755.79 µs) 337.75 µs ▄██▆▆▄▃▃▂▂▂▁▁▁▁▁▁▁▁▁▁
                  0.66 ipc ( 24.48% stalls)   0.70% L1 data cache
          1.02M cycles 672.34k instructions  19.59% retired LD/ST (131.69k)

                             ┌                                            ┐
                                                   ╷┌┬┐   ╷
            stride copy (16)                       ├┤│├───┤
                                                   ╵└┴┘   ╵
                                                   ╷┌┬┐   ╷
            stride copy (32)                       ├┤│├───┤
                                                   ╵└┴┘   ╵
                                                   ╷┌┬┐  ╷
            stride copy (64)                       ├┤│├──┤
                                                   ╵└┴┘  ╵
                                                                   ╷┌┬┐   ╷
           stride copy (128)                                       ├┤│├───┤
                                                                   ╵└┴┘   ╵
                                        ╷┬  ╷
           stride copy (256)            ├│──┤
                                        ╵┴  ╵
                             ┬ ╷
           stride copy (512) │─┤
                             ┴ ╵
                             └                                            ┘
                             281.71 µs           1.07 ms            1.86 ms
*/