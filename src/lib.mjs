const AsyncFunction = (async () => { }).constructor;
const GeneratorFunction = (function* () { }).constructor;
const AsyncGeneratorFunction = (async function* () { }).constructor;

export function do_not_optimize(v) { $._ = v; }
export const $ = { _: null, __() { return print($._); } };

export async function measure(f, ...args) {
  return await {
    fn, iter, yield: generator,
    [void 0]() { throw new TypeError('expected iterator, generator or one-shot function'); },
  }[kind(f)](f, ...args);
}

export async function generator(gen, opts = {}) {
  const ctx = {
    get(name) { return opts.args?.[name] },
  };

  const g = gen(ctx);
  const n = await g.next();

  let $fn = n.value;
  if (!n.value?.heap && null != n.value?.heap) opts.heap = false;
  opts.concurrency ??= n.value?.concurrency ?? opts.args?.concurrency;
  if (!n.value?.counters && null != n.value?.counters) opts.$counters = false;

  if (n.done || 'fn' !== kind($fn)) {
    $fn = n.value?.bench || n.value?.manual;
    if ('fn' !== kind($fn, true)) throw new TypeError('expected benchmarkable yield from generator');

    opts.params ??= {};
    const params = $fn.length;
    opts.manual = !n.value.manual ? false : ('manual' !== n.value.budget ? 'real' : 'manual');

    for (let o = 0; o < params; o++) {
      opts.params[o] = n.value[o];
      if ('fn' !== kind(n.value[o])) throw new TypeError('expected function for benchmark parameter');
    }
  }

  const stats = await fn($fn, opts);
  if (!(await g.next()).done) throw new TypeError('expected generator to yield once');

  return {
    ...stats,
    kind: 'yield',
  };
}

export const print = (() => {
  if (globalThis.console?.log) return globalThis.console.log;
  if (globalThis.print && !globalThis.document) return globalThis.print;

  return () => { throw new Error('no print function available'); };
})();

export const gc = (() => {
  try { return (Bun.gc(true), () => Bun.gc(true)); } catch { }
  try { return (globalThis.gc(), () => globalThis.gc()); } catch { }
  try { return (globalThis.__gc(), () => globalThis.__gc()); } catch { }
  try { return (globalThis.std.gc(), () => globalThis.std.gc()); } catch { }
  try { return (globalThis.$262.gc(), () => globalThis.$262.gc()); } catch { }
  try { return (globalThis.tjs.engine.gc.run(), () => globalThis.tjs.engine.gc.run()); } catch { }
  return Object.assign(globalThis.Graal ? () => new Uint8Array(2 ** 29) : () => new Uint8Array(2 ** 30), { fallback: true });
})();

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

export function kind(fn, _ = false) {
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
    (_ ? true : (0 === fn.length))

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

const k_cpu_time_rescale_heap = 1.1;
const k_cpu_time_rescale_inner_gc = 2;

export const k_concurrency = 1;
export const k_min_samples = 12;
export const k_batch_unroll = 4;
export const k_max_samples = 1e9;
export const k_warmup_samples = 2;
export const k_batch_samples = 4096;
export const k_samples_threshold = 12;
export const k_batch_threshold = 65536;
export const k_min_cpu_time = 642 * 1e6;
export const k_warmup_threshold = 500_000;

function defaults(opts) {
  opts.gc ??= gc;
  opts.now ??= now;
  opts.heap ??= null;
  opts.params ??= {};
  opts.manual ??= false;
  opts.inner_gc ??= false;
  opts.$counters ??= false;
  opts.concurrency ??= k_concurrency;
  opts.min_samples ??= k_min_samples;
  opts.max_samples ??= k_max_samples;
  opts.min_cpu_time ??= k_min_cpu_time;
  opts.batch_unroll ??= k_batch_unroll;
  opts.batch_samples ??= k_batch_samples;
  opts.warmup_samples ??= k_warmup_samples;
  opts.batch_threshold ??= k_batch_threshold;
  opts.warmup_threshold ??= k_warmup_threshold;
  opts.samples_threshold ??= k_samples_threshold;

  if (opts.heap) opts.min_cpu_time *= k_cpu_time_rescale_heap;
  if (opts.gc && opts.inner_gc) opts.min_cpu_time *= k_cpu_time_rescale_inner_gc;
}

export async function fn(fn, opts = {}) {
  defaults(opts);
  let async = false;
  let batch = false;
  const params = Object.keys(opts.params);

  warmup: {
    const $p = new Array(params.length);

    for (let o = 0; o < params.length; o++) {
      $p[o] = await opts.params[o]();
    }

    const t0 = now();
    const r = fn(...$p); let t1 = now();
    if (async = r instanceof Promise) (await r, t1 = now());

    if ((t1 - t0) <= opts.warmup_threshold) {
      for (let o = 0; o < opts.warmup_samples; o++) {
        for (let oo = 0; oo < params.length; oo++) {
          $p[oo] = await opts.params[oo]();
        }

        const t0 = now();
        await fn(...$p); const t1 = now();
        if (batch = (t1 - t0) <= opts.batch_threshold) break;
      }
    }
  }

  if (opts.manual) {
    batch = false;
    opts.concurrency = 1;
  }

  const loop = new AsyncFunction('$fn', '$gc', '$now', '$heap', '$params', '$counters', `
    ${!opts.$counters ? '' : 'let _hc = false;'}
    ${!opts.$counters ? '' : 'try { $counters.init(); _hc = true; } catch {}'}

    let _ = 0; let t = 0;
    let samples = new Array(2 ** 20);
    ${!opts.heap ? '' : 'const heap = { _: 0, total: 0, min: Infinity, max: -Infinity };'}
    ${!(opts.gc && opts.inner_gc && !opts.gc.fallback) ? '' : 'const gc = { total: 0, min: Infinity, max: -Infinity };'}

    ${!params.length ? '' : Array.from({ length: params.length }, (_, o) => `
      ${Array.from({ length: opts.concurrency }, (_, c) => `
        let param_${o}_${c} = ${!batch ? 'null' : `new Array(${opts.batch_samples})`};
      `.trim()).join(' ')}
    `.trim()).join('\n')}

    ${!opts.gc ? '' : `$gc();`}

    for (; _ < ${opts.max_samples}; _++) {
      if (_ >= ${opts.min_samples} && t >= ${opts.min_cpu_time}) break;

      ${!params.length ? '' : `
        ${!batch ? `
          ${Array.from({ length: params.length }, (_, o) => `
            ${Array.from({ length: opts.concurrency }, (_, c) => `
              if ((param_${o}_${c} = $params[${o}]()) instanceof Promise) param_${o}_${c} = await param_${o}_${c};
            `.trim()).join(' ')}
          `.trim()).join('\n')}
        ` : `
          for (let o = 0; o < ${opts.batch_samples}; o++) {
            ${Array.from({ length: params.length }, (_, o) => `
              ${Array.from({ length: opts.concurrency }, (_, c) => `
                if ((param_${o}_${c}[o] = $params[${o}]()) instanceof Promise) param_${o}_${c}[o] = await param_${o}_${c}[o];
              `.trim()).join(' ')}
            `.trim()).join('\n')}
          }
        `}
      `}

      ${!(opts.gc && opts.inner_gc) ? '' : `
        igc: {
          const t0 = $now();
          $gc(); t += $now() - t0;
        }
      `}

      ${!opts.manual ? '' : 'let t2 = 0;'}
      ${!opts.heap ? '' : 'const h0 = $heap();'}
      ${!opts.$counters ? '' : 'if (_hc) try { $counters.before(); } catch {};'} const t0 = $now();

      ${!batch ? `
        ${!async ? '' : (1 >= opts.concurrency ? '' : 'await Promise.all([')}
          ${Array.from({ length: opts.concurrency }, (_, c) => `
            ${!opts.manual ? '' : 't2 +='} ${!async ? '' : (1 < opts.concurrency ? '' : 'await')} ${(!params.length ? `
              $fn()
            ` : `
              $fn(${Array.from({ length: params.length }, (_, o) => `param_${o}_${c}`).join(', ')})
            `).trim()}${!async ? ';' : (1 < opts.concurrency ? ',' : ';')}
          `.trim()).join('\n')}
        ${!async ? '' : (1 >= opts.concurrency ? '' : `]);`)}
      ` : `
        for (let o = 0; o < ${(opts.batch_samples / opts.batch_unroll) | 0}; o++) {
          ${!params.length ? '' : `const param_offset = o * ${opts.batch_unroll};`}

          ${Array.from({ length: opts.batch_unroll }, (_, u) => `
            ${!async ? '' : (1 >= opts.concurrency ? '' : 'await Promise.all([')}
              ${Array.from({ length: opts.concurrency }, (_, c) => `
                ${!async ? '' : (1 < opts.concurrency ? '' : 'await')} ${(!params.length ? `
                  $fn()
                ` : `
                  $fn(${Array.from({ length: params.length }, (_, o) => `param_${o}_${c}[${u === 0 ? '' : `${u} + `}param_offset]`).join(', ')})
                `).trim()}${!async ? ';' : (1 < opts.concurrency ? ',' : ';')}
              `.trim()).join(' ')}
            ${!async ? '' : (1 >= opts.concurrency ? '' : ']);')}
          `.trim()).join('\n')}
        }
      `}

      const t1 = $now();
      ${!opts.$counters ? '' : 'if (_hc) try { $counters.after(); } catch {};'}

      ${!opts.heap ? '' : `
        heap: {
          const t0 = $now();
          const h1 = ($heap() - h0) ${!batch ? '' : `/ ${opts.batch_samples}`}; t += $now() - t0;

          if (0 <= h1) {
            heap._++;
            heap.total += h1;
            heap.min = Math.min(h1, heap.min);
            heap.max = Math.max(h1, heap.max);
          }
        }
      `}

      ${!(opts.gc && opts.inner_gc && !opts.gc.fallback) ? '' : `
        igc: {
          const t0 = $now();
          $gc(); const t1 = $now() - t0;

          t += t1;
          gc.total += t1;
          gc.min = Math.min(t1, gc.min);
          gc.max = Math.max(t1, gc.max);
        }
      `};

      const diff = ${opts.manual ? 't2' : 't1 - t0'};
      t += ${'manual' === opts.manual ? 't2' : 't1 - t0'};
      samples[_] = diff ${!batch ? '' : `/ ${opts.batch_samples}`};
    }

    samples.length = _;
    samples.sort((a, b) => a - b);
    if (samples.length > ${opts.samples_threshold}) samples = samples.slice(2, -2);

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
      ${!opts.heap ? '' : 'heap: { ...heap, avg: heap.total / heap._ },'}
      ${!(opts.gc && opts.inner_gc && !opts.gc.fallback) ? '' : 'gc: { ...gc, avg: gc.total / _ },'}
      ${!opts.$counters ? '' : `...(!_hc ? {} : { counters: $counters.translate(${!batch ? 1 : opts.batch_samples}, _) }),`}
    };

    ${!opts.$counters ? '' : 'if (_hc) try { $counters.deinit(); } catch {};'}
  `);

  return {
    kind: 'fn',
    debug: loop.toString(),
    ...(await loop(fn, opts.gc, opts.now, opts.heap, opts.params, opts.$counters)),
  };
}



// TODO: update when jit can do zero-cost opt
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

    const loop = new GeneratorFunction('$gc', '$now', '$samples', _.debug = `
      let _ = 0; let t = 0;

      ${!opts.gc ? '' : `$gc();`}

      for (; _ < ${opts.max_samples}; _++) {
        if (_ >= ${opts.min_samples} && t >= ${opts.min_cpu_time}) break;

        ${!(opts.gc && opts.inner_gc) ? '' : `
          let inner_gc_cost = 0;

          igc: {
            const t0 = $now(); $gc();
            inner_gc_cost = $now() - t0;
          }
        `}

        const t0 = $now();
        
        ${!batch ? 'yield void 0;' : `
          for (let o = 0; o < ${(opts.batch_samples / opts.batch_unroll) | 0}; o++) {
            ${new Array(opts.batch_unroll).fill('yield void 0;').join(' ')}
          }
        `}

        const t1 = $now();
        const diff = t1 - t0;

        $samples[_] = diff ${!batch ? '' : `/ ${opts.batch_samples}`};
        t += diff ${!(opts.gc && opts.inner_gc) ? '' : '+ inner_gc_cost'};
      }

      $samples.length = _;
    `)(opts.gc, opts.now, samples);

    _.batch = batch;
    _.next = loop.next.bind(loop); yield void 0;
  })();

  await iter((_.next = gen.next.bind(gen), ctx));
  if (samples.length < opts.min_samples) throw new TypeError(`expected at least ${opts.min_samples} samples from iterator`);

  samples.sort((a, b) => a - b);
  if (samples.length > opts.samples_threshold) samples = samples.slice(2, -2);

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