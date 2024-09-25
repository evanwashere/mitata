const AsyncFunction = (async () => { }).constructor;
const GeneratorFunction = (function* () { }).constructor;
const AsyncGeneratorFunction = (async function* () { }).constructor;

export async function measure(f, ...args) {
  return await {
    fn, iter, yield: generator,
    [void 0]() { throw new TypeError(`expected iterator, generator or one-shot function`); },
  }[kind(f)](f, ...args);
}

export async function generator(gen, opts = {}) {
  const ctx = {
    get(name) { return opts.args?.[name] },
  };

  const g = gen(ctx);
  const n = await g.next();
  if (n.done || 'fn' !== kind(n.value)) throw new TypeError(`expected benchmarkable yield from generator`);

  const stats = await fn(n.value, opts);
  if (!(await g.next()).done) throw new TypeError(`expected generator to yield once`);

  return {
    ...stats,
    kind: 'yield',
  };
}

export const now = (() => {
  try { // bun
    Bun.nanoseconds();
    return Bun.nanoseconds;
  } catch { }

  try { // jsc
    $.agent.monotonicNow();
    return () => 1e6 * $.agent.monotonicNow();
  } catch { }

  try { // 262 agent
    $262.agent.monotonicNow();
    return () => 1e6 * $262.agent.monotonicNow();
  } catch { }

  try { // node/deno/... (v8 inline, anti-deopts)
    const now = performance.now.bind(performance);

    now(); return () => 1e6 * now();
  } catch { return () => 1e6 * Date.now(); }
})();

export function kind(fn) {
  if (!(
    fn instanceof Function
    || fn instanceof AsyncFunction
    || fn instanceof GeneratorFunction
    || fn instanceof AsyncGeneratorFunction
  )) return;

  if (
    fn instanceof GeneratorFunction
    || fn instanceof AsyncGeneratorFunction
  ) return 'yield';

  if (
    0 === fn.length

    && (
      fn instanceof Function
      || fn instanceof AsyncFunction
    )
  ) return 'fn';

  if (
    0 !== fn.length

    && (
      fn instanceof Function
      || fn instanceof AsyncFunction
    )
  ) return 'iter';
}

export const k_min_samples = 2;
export const k_max_samples = 1e9;
export const k_warmup_samples = 2;
export const k_batch_samples = 2240;
export const k_samples_threshold = 5;
export const k_batch_threshold = 65536;
export const k_min_cpu_time = 642 * 1e6;
export const k_warmup_threshold = 500_000;

function defaults(opts) {
  opts.min_samples ??= k_min_samples;
  opts.max_samples ??= k_max_samples;
  opts.min_cpu_time ??= k_min_cpu_time;
  opts.batch_samples ??= k_batch_samples;
  opts.warmup_samples ??= k_warmup_samples;
  opts.batch_threshold ??= k_batch_threshold;
  opts.warmup_threshold ??= k_warmup_threshold;
  opts.samples_threshold ??= k_samples_threshold;
}

export async function fn(fn, opts = {}) {
  defaults(opts);
  let async = false;
  let batch = false;

  warmup: {
    const t0 = now();
    const r = fn(); let t1 = now();
    if (async = r instanceof Promise) (await r, t1 = now());

    if ((t1 - t0) <= opts.warmup_threshold) {
      for (let o = 0; o < opts.warmup_samples; o++) {
        const t0 = now();
        await fn(); const t1 = now();
        if (batch = (t1 - t0) <= opts.batch_threshold) break;
      }
    }
  }

  const loop = new AsyncFunction('$fn', '$now', `
    let _ = 0; let t = 0;
    let samples = new Array(2 ** 20);

    ${!globalThis.gc ? '' : 'gc();'}
    ${!globalThis.Bun?.gc ? '' : 'Bun.gc(true);'}

    for (; _ < ${opts.max_samples}; _++) {
      if (_ >= ${opts.min_samples} && t >= ${opts.min_cpu_time}) break;

      const t0 = $now();
      ${!batch ? '' : `for (let o = 0; o < ${opts.batch_samples}; o++)`} ${!async ? '' : 'await'} $fn();

      const t1 = $now();
      const diff = t1 - t0;

      t += diff;
      samples[_] = diff ${!batch ? '' : `/ ${opts.batch_samples}`};
    }

    samples.length = _;
    samples.sort((a, b) => a - b);
    if (samples.length > ${opts.samples_threshold}) samples = samples.slice(1, -1);

    return {
      samples,
      min: samples[0],
      max: samples[samples.length - 1],
      p25: samples[(.25 * (samples.length - 1)) | 0],
      p50: samples[(.50 * (samples.length - 1)) | 0],
      p75: samples[(.75 * (samples.length - 1)) | 0],
      p99: samples[(.99 * (samples.length - 1)) | 0],
      p999: samples[(.999 * (samples.length - 1)) | 0],
      avg: samples.reduce((a, v) => a + v, 0) / samples.length,
      ticks: samples.length ${!batch ? '' : `* ${opts.batch_samples}`},
    };
  `);

  return {
    kind: 'fn',
    debug: loop.toString(),
    ...(await loop(fn, now)),
  };
}

export async function iter(iter, opts = {}) {
  const _ = {};
  defaults(opts);
  let samples = new Array(2 ** 20);
  const _i = { next() { return _.next() } };

  const ctx = {
    [Symbol.iterator]() { return _i },
    [Symbol.asyncIterator]() { return _i },
    get(name) { return opts.args?.[name] },
  };

  const gen = (function* () {
    let batch = false;

    warmup: {
      const t0 = now();
      yield void 0; const t1 = now();

      if ((t1 - t0) <= opts.warmup_threshold) {
        for (let o = 0; o < opts.warmup_samples; o++) {
          const t0 = now();
          yield void 0; const t1 = now();
          if (batch = (t1 - t0) <= opts.batch_threshold) break;
        }
      }
    }

    const loop = new GeneratorFunction('$now', '$samples', _.debug = `
      let _ = 0; let t = 0;
      ${!globalThis.gc ? '' : 'gc();'}
      ${!globalThis.Bun?.gc ? '' : 'Bun.gc(true);'}

      for (; _ < ${opts.max_samples}; _++) {
        if (_ >= ${opts.min_samples} && t >= ${opts.min_cpu_time}) break;
        const t0 = $now(); ${!batch ? '' : `for (let o = 0; o < ${opts.batch_samples}; o++)`} yield void 0;

        const t1 = $now();
        const diff = t1 - t0;

        t += diff;
        $samples[_] = diff ${!batch ? '' : `/ ${opts.batch_samples}`};
      }

      $samples.length = _;
    `)(now, samples);

    _.batch = batch;
    _.next = loop.next.bind(loop); yield void 0;
  })();

  await iter((_.next = gen.next.bind(gen), ctx));
  if (samples.length < opts.min_samples) throw new TypeError(`expected at least ${opts.min_samples} samples from iterator`);

  samples.sort((a, b) => a - b);
  if (samples.length > opts.samples_threshold) samples = samples.slice(1, -1);

  return {
    samples,
    kind: 'iter',
    debug: _.debug,
    min: samples[0],
    max: samples[samples.length - 1],
    p25: samples[(.25 * (samples.length - 1)) | 0],
    p50: samples[(.50 * (samples.length - 1)) | 0],
    p75: samples[(.75 * (samples.length - 1)) | 0],
    p99: samples[(.99 * (samples.length - 1)) | 0],
    p999: samples[(.999 * (samples.length - 1)) | 0],
    avg: samples.reduce((a, v) => a + v, 0) / samples.length,
    ticks: samples.length * (!_.batch ? 1 : opts.batch_samples),
  };
}