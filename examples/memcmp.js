import { run, bench, summary, lineplot } from 'mitata';

function gen(len) {
  const u8 = new Uint8Array(len);
  for (let o = 0; o < len; o++) u8[o] = o % 256;

  return u8;
}

function u8(buf, thrw = true, shared = true) {
  if (buf instanceof Uint8Array) return buf;
  if (buf instanceof ArrayBuffer) return new Uint8Array(buf);
  if (shared && buf instanceof SharedArrayBuffer) return new Uint8Array(buf);
  if (ArrayBuffer.isView(buf)) return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);

  if (!thrw) return null;
  throw new TypeError('expected (Buffer | ArrayBuffer | ArrayBufferView | SharedArrayBuffer)');
}

const compare = {
  byte(a, b) {
    a = u8(a); b = u8(b);
    if (a.length !== b.length) return false;

    const len = a.length;
    for (let o = 0; o < len; o++) if (a[o] !== b[o]) return false;

    return true;
  },

  swar(a, b) {
    a = u8(a); b = u8(b);
    if (a.length !== b.length) return false;

    const aligned = a.length & ~3;

    if (aligned) {
      const len = (a.length / 4) | 0;
      const a32 = new Int32Array(a.buffer, a.byteOffset, len);
      const b32 = new Int32Array(b.buffer, b.byteOffset, len);
      for (let o = 0; o < len; o++) if (a32[o] !== b32[o]) return false;
    }

    const len = a.length;
    for (let o = aligned; o < len; o++) if (a[o] !== b[o]) return false;

    return true;
  },
};

lineplot(() => {
  summary(() => {
    bench('byte ($size)', function* (ctx) {
      const len = ctx.get('size');
  
      const a = gen(len);
      const b = gen(len);
      yield () => compare.byte(a, b);
    })
      .range('size', 8, 2 ** 20);
  
    bench('swar ($size)', function* (ctx) {
      const len = ctx.get('size');
  
      const a = gen(len);
      const b = gen(len);
      yield () => compare.swar(a, b);
    })
      .range('size', 8, 2 ** 20);
  });
});

await run();

/*
clk: ~3.15 GHz
cpu: Apple M1 Pro
runtime: bun 1.2.2 (arm64-darwin)

benchmark                   avg (min … max) p75 / p99    (min … top 1%)
------------------------------------------- -------------------------------
byte (8)                       9.91 ns/iter   9.64 ns █                    
                       (9.58 ns … 33.01 ns)  18.79 ns █                    
                    (  0.00  b …  72.00  b)   0.07  b █▂▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁
                  7.16 ipc (  0.01% stalls) 100.00% L1 data cache
          32.50 cycles  232.83 instructions  24.36% retired LD/ST (  56.71)

byte (64)                     45.12 ns/iter  44.71 ns █                    
                      (44.60 ns … 53.74 ns)  49.99 ns █                    
                    (  0.00  b …  52.00  b)   0.05  b █▁▁▄▁▁▁▁▁▂▁▁▁▁▁▁▁▁▁▁▁
                  5.84 ipc (  0.00% stalls) 100.00% L1 data cache
         146.37 cycles  855.01 instructions  20.30% retired LD/ST ( 173.57)

byte (512)                   332.64 ns/iter 333.32 ns  ██                  
                    (329.62 ns … 355.56 ns) 352.80 ns ▂██                  
                    (  0.00  b …   0.00  b)   0.00  b █████▆▃▃▂▁▁▁▁▁▁▁▁▁▁▁▁
                  5.41 ipc (  0.00% stalls) 100.00% L1 data cache
          1.07k cycles   5.80k instructions  18.55% retired LD/ST (  1.08k)

byte (4096)                    2.56 µs/iter   2.57 µs    █ ▅▅ ▅▅           
                        (2.55 µs … 2.58 µs)   2.58 µs   ▆████▃██   ▆▃      
                    (  0.00  b …   0.00  b)   0.00  b ▄██████████▄████▁▄▁▁█
                  5.47 ipc (  0.00% stalls) 100.00% L1 data cache
          8.27k cycles  45.27k instructions  18.25% retired LD/ST (  8.26k)

byte (32768)                  20.41 µs/iter  20.41 µs             █        
                      (20.37 µs … 20.53 µs)  20.44 µs ▅  ▅▅▅▅ ▅▅▅ █       ▅
                    (  0.00  b …   0.00  b)   0.00  b █▁▁████▁███▁█▁▁▁▁▁▁▁█
                  5.48 ipc (  0.00% stalls) 100.00% L1 data cache
         65.84k cycles 360.70k instructions  18.19% retired LD/ST ( 65.61k)

byte (262144)                163.43 µs/iter 162.71 µs █                    
                    (162.46 µs … 187.54 µs) 174.83 µs █                    
                    (  0.00  b …   0.00  b)   0.00  b █▂▁▁▁▄▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁
                  5.45 ipc (  0.84% stalls)  98.30% L1 data cache
        531.66k cycles   2.90M instructions  18.11% retired LD/ST (524.67k)

byte (1048576)               653.19 µs/iter 652.92 µs █                    
                    (649.88 µs … 691.63 µs) 673.71 µs █ ▂                  
                    (  0.00  b …   0.00  b)   0.00  b █▂█▇▂▂▂▁▂▂▃▁▁▁▁▁▁▁▁▁▁
                  5.47 ipc (  0.83% stalls)  97.85% L1 data cache
          2.11M cycles  11.55M instructions  18.16% retired LD/ST (  2.10M)

swar (8)                      79.51 ns/iter  72.27 ns █                    
                     (70.80 ns … 771.71 ns) 158.91 ns █                    
                    (  0.00  b … 132.00  b)   0.50  b █▃▂▂▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁
                  6.63 ipc (  0.74% stalls)  99.79% L1 data cache
         257.45 cycles   1.71k instructions  38.40% retired LD/ST ( 655.59)

swar (64)                     86.19 ns/iter  80.59 ns █                    
                     (79.43 ns … 752.52 ns) 112.93 ns █▂                   
                    (  0.00  b …  16.00  b)   0.01  b ██▃▂▂▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁
                  6.61 ipc (  0.86% stalls)  99.71% L1 data cache
         280.90 cycles   1.86k instructions  36.86% retired LD/ST ( 684.51)

swar (512)                   168.61 ns/iter 162.81 ns ██                   
                    (159.85 ns … 832.05 ns) 203.70 ns ██                   
                    (  0.00  b …  12.00  b)   0.01  b ██▅▃▂▁▂▂▁▂▃▂▁▁▁▁▁▁▁▁▁
                  5.63 ipc (  1.03% stalls)  99.43% L1 data cache
         548.95 cycles   3.09k instructions  29.39% retired LD/ST ( 908.52)

swar (4096)                  731.29 ns/iter 740.05 ns  █                   
                    (713.72 ns … 918.13 ns) 791.73 ns ▃█    ▃▅             
                    (  0.00  b …  24.00  b)   0.17  b ███▄▂▅██▇▄▂▂▂▁▁▁▁▁▁▁▁
                  5.46 ipc (  0.32% stalls)  99.74% L1 data cache
          2.38k cycles  12.97k instructions  20.85% retired LD/ST (  2.70k)

swar (32768)                   5.22 µs/iter   5.23 µs     ▂▂▂     █        
                        (5.21 µs … 5.25 µs)   5.24 µs ▅ ▅▅███   ▅▅█       ▅
                    (  0.00  b …  32.00  b)   0.97  b █▁█████▁▇▇███▇▁▁▁▁▁▁█
                  5.45 ipc (  0.06% stalls)  99.91% L1 data cache
         16.85k cycles  91.82k instructions  18.55% retired LD/ST ( 17.03k)

swar (262144)                 40.92 µs/iter  40.95 µs      █       █ █     
                      (40.80 µs … 41.08 µs)  41.01 µs ▅ ▅  █  ▅  ▅ █ █    ▅
                    (  0.00  b …   0.00  b)   0.00  b █▁█▁▁█▁▁█▁▁█▁█▁█▁▁▁▁█
                  5.48 ipc (  0.42% stalls)  99.76% L1 data cache
        131.99k cycles 722.68k instructions  18.23% retired LD/ST (131.73k)

swar (1048576)               164.58 µs/iter 162.96 µs █                    
                    (162.63 µs … 216.50 µs) 187.42 µs █                    
                    (  0.00  b …   0.00  b)   0.00  b █▁▄▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁
                  5.42 ipc (  3.30% stalls)  97.45% L1 data cache
        535.20k cycles   2.90M instructions  18.12% retired LD/ST (525.24k)

                             ┌                                            ┐
                byte ($size)                                             ⡜ 653.19 µs
                swar ($size)                                            ⢠⠃
                                                                        ⡎ 
                                                                       ⢸  
                                                                      ⢀⠇  
                                                                      ⡜   
                                                                     ⢠⠃   
                                                                     ⡎    
                                                                    ⢸     
                                                                   ⢀⠇     
                                                                   ⡜      
                                                                  ⢠⠃     ⢀
                                                                ⢀⠔⠁    ⡠⠔⠁
                                                              ⡠⠔⠁    ⡠⠊   
                                                            ⡠⠊   ⢀⣀⠔⠉     
                              ⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣤⣤⠤⠴⠶⠮⠔⠒⠒⠉⠉⠁         9.91 ns
                             └                                            ┘

summary
  swar ($size)
   +3.97…-8.03x faster than byte ($size)
*/