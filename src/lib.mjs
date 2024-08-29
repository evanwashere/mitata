const AsyncFunction = (async () => { }).constructor;
const GeneratorFunction = (function* () { }).constructor;
const AsyncGeneratorFunction = (async function* () { }).constructor;

export const now = (() => {
  const ceil = Math.ceil;

  try { // bun
    Bun.nanoseconds();
    return Bun.nanoseconds;
  } catch { }

  try { // jsc
    $.agent.monotonicNow();
    return () => ceil(1e6 * $.agent.monotonicNow());
  } catch { }

  try { // 262 agent
    $262.agent.monotonicNow();
    return () => ceil(1e6 * $262.agent.monotonicNow());
  } catch { }

  try {
    performance.now();
    return () => ceil(1e6 * performance.now());
  } catch { return () => ceil(1e6 * Date.now()); }
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

export async function measure(f) {
  return await {
    fn, iter, yield: generator,
    [void 0]() { throw new TypeError(`expected iterator, generator or one-shot function`) },
  }[kind(f)](f);
}

export async function generator(gen) {
  const g = gen();
  const n = await g.next();
  if (n.done || 'fn' !== kind(n.value)) throw new TypeError(`expected benchmarkable yield from generator`);

  const stats = await fn(n.value);
  if (!(await g.next()).done) throw new TypeError(`expected generator to yield once`);

  return {
    ...stats,
    kind: 'yield',
  };
}

const k_min_samples = 2;
const k_max_samples = 1e9;
const k_batch_samples = 2048;
const k_samples_threshold = 5;
const k_batch_threshold = 16384;
const k_min_cpu_time = 640 * 1e6;
const k_warmup_threshold = 500_000;

export async function fn(fn) {
  let async = false;
  let batch = false;

  warmup: {
    const t0 = now();
    const r = fn(); let t1 = now();
    if (async = r instanceof Promise) (await r, t1 = now());

    if ((t1 - t0) <= k_warmup_threshold) {
      const t0 = now();
      fn(); const t1 = now();
      batch = (t1 - t0) <= k_batch_threshold;
    }
  }

  const loop = new AsyncFunction('$fn', '$now', `
    let t = 0;
    let samples = [];

    while (true) {
      if (samples.length >= ${k_max_samples}) break;
      else if (t >= ${k_min_cpu_time} && samples.length >= ${k_min_samples}) break;

      const t0 = $now();
      ${!batch ? '' : `for (let o = 0; o < ${k_batch_samples}; o++)`} ${!async ? '' : 'await'} $fn();

      const t1 = $now();
      const diff = t1 - t0;

      t += diff;
      samples.push(diff ${!batch ? '' : `/ ${k_batch_samples}`});
    }

    samples.sort((a, b) => a - b);
    if (samples.length > ${k_samples_threshold}) samples = samples.slice(1, -1);

    return {
      samples,
      min: samples[0],
      max: samples[samples.length - 1],
      p50: samples[(.50 * samples.length) | 0],
      p75: samples[(.75 * samples.length) | 0],
      p99: samples[(.99 * samples.length) | 0],
      p999: samples[(.999 * samples.length) | 0],
      avg: samples.reduce((a, b) => a + b, 0) / samples.length,
    };
  `);

  return {
    kind: 'fn',
    debug: loop.toString(),
    ...(await loop(fn, now)),
  };
}

export async function iter(iter) {
  const _ = {};
  let samples = [];

  const ctx = {
    next() { return _.next() },
    [Symbol.iterator]() { return this },
    [Symbol.asyncIterator]() { return this },
  };

  const gen = (function* () {
    let batch = false;

    warmup: {
      const t0 = now();
      yield void 0; const t1 = now();

      if ((t1 - t0) <= k_warmup_threshold) {
        const t0 = now();
        yield void 0; const t1 = now();
        batch = (t1 - t0) <= k_batch_threshold;
      }
    }

    const loop = new GeneratorFunction('$now', '$samples', _.debug = `
      let t = 0;

      while (true) {
        if ($samples.length >= ${k_max_samples}) break;
        else if (t >= ${k_min_cpu_time} && $samples.length >= ${k_min_samples}) break;
        const t0 = $now(); ${!batch ? '' : `for (let o = 0; o < ${k_batch_samples}; o++)`} yield void 0;

        const t1 = $now();
        const diff = t1 - t0;

        t += diff;
        $samples.push(diff ${!batch ? '' : `/ ${k_batch_samples}`});
      }
    `)(now, samples);

    _.next = loop.next.bind(loop); yield void 0;
  })();

  await iter((_.next = gen.next.bind(gen), ctx));
  if (samples.length < k_min_samples) throw new TypeError(`expected at least ${k_min_samples} samples from iterator`);

  samples.sort((a, b) => a - b);
  if (samples.length > k_samples_threshold) samples = samples.slice(1, -1);

  return {
    samples,
    kind: 'iter',
    debug: _.debug,
    min: samples[0],
    max: samples[samples.length - 1],
    p50: samples[(.50 * samples.length) | 0],
    p75: samples[(.75 * samples.length) | 0],
    p99: samples[(.99 * samples.length) | 0],
    p999: samples[(.999 * samples.length) | 0],
    avg: samples.reduce((a, b) => a + b, 0) / samples.length,
  };
}