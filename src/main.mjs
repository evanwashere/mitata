export { measure, do_not_optimize } from './lib.mjs';
import { kind, measure, print as grint } from './lib.mjs';

let FLAGS = 0;
let $counters = null;
let COLLECTIONS = [{ id: 0, name: null, types: [], trials: [] }];

export const flags = {
  compact: 1 << 0,
  baseline: 1 << 1,
};

export class B {
  f = null;
  _args = {};
  _name = '';
  _group = 0;
  _gc = 'once';
  flags = FLAGS;
  _highlight = false;

  constructor(name, f) {
    this.f = f;
    this.name(name);
    if (!kind(f)) throw new TypeError('expected iterator, generator or one-shot function');
  }

  name(name, color = false) {
    return (this._name = name, this.highlight(color), this);
  }

  gc(gc = 'once') {
    if (![true, false, 'once', 'inner'].includes(gc)) throw new TypeError('invalid gc type'); return (this._gc = gc, this);
  }

  highlight(color = false) {
    if (!color) return (this._highlight = false, this);
    if (!$.colors.includes(color)) throw new TypeError('invalid highlight color'); return (this._highlight = color, this);
  }

  compact(bool = true) {
    if (bool) return (this.flags |= flags.compact, this);
    if (!bool) return (this.flags &= ~flags.compact, this);
  }

  baseline(bool = true) {
    if (bool) return (this.flags |= flags.baseline, this);
    if (!bool) return (this.flags &= ~flags.baseline, this);
  }

  range(name, s, e, m = 8) {
    const arr = [];
    for (let o = s; o <= e; o *= m) arr.push(Math.min(o, e));
    if (!arr.includes(e)) arr.push(e); return this.args(name, arr);
  }

  dense_range(name, s, e, a = 1) {
    const arr = [];
    for (let o = s; o <= e; o += a) arr.push(o);
    if (!arr.includes(e)) arr.push(e); return this.args(name, arr);
  }

  args(name, args) {
    if (name === null) return (delete this._args.x, this);
    if (Array.isArray(name)) return (this._args.x = name, this);
    if (null === args && 'string' === typeof name) return (delete this._args[name], this);
    if (Array.isArray(args) && 'string' === typeof name) return (this._args[name] = args, this);

    if (null !== name && 'object' === typeof name) {
      for (const key in name) {
        const v = name[key];
        if (v == null) delete this._args[key];
        else if (Array.isArray(v)) this._args[key] = v;
        else throw new TypeError('invalid arguments map value');
      }

      return this;
    }

    throw new TypeError('invalid arguments');
  }

  *_names() {
    const args = Object.keys(this._args);
    const kind = 0 === args.length ? 'static' : (1 === args.length ? 'args' : 'multi-args');

    if (kind === 'static') {
      yield this._name;
    }

    else {
      const offsets = new Array(args.length).fill(0);
      const runs = args.reduce((len, name) => len * this._args[name].length, 1);

      for (let o = 0; o < runs; o++) {
        {
          const _args = {};
          let _name = this._name;
          for (let oo = 0; oo < args.length; oo++) _args[args[oo]] = this._args[args[oo]][offsets[oo]];
          for (let oo = 0; oo < args.length; oo++) _name = _name.replaceAll(`\$${args[oo]}`, _args[args[oo]]);

          yield _name;
        }

        let offset = 0;
        do { offsets[offset] = (1 + offsets[offset]) % this._args[args[offset]].length; } while (0 === offsets[offset++] && offset < args.length);
      }
    }
  }

  async run(thrw = false) {
    const args = Object.keys(this._args);
    const kind = 0 === args.length ? 'static' : (1 === args.length ? 'args' : 'multi-args');

    const tune = {
      $counters,
      inner_gc: 'inner' === this._gc,
      gc: !this._gc ? false : undefined,

      heap: await (async () => {
        if (globalThis.Bun) {
          const { memoryUsage } = await import('bun:jsc');
          return () => { const m = memoryUsage(); return m.current; };
        }

        try {
          const { getHeapStatistics } = await import('node:v8'); getHeapStatistics();
          return () => { const m = getHeapStatistics(); return m.used_heap_size + m.malloced_memory; }
        } catch { }
      })(),
    };

    if (kind === 'static') {
      let stats, error;
      try { stats = await measure(this.f, tune); }
      catch (err) { error = err; if (thrw) throw err; }

      return {
        kind,
        args: this._args,
        alias: this._name,
        group: this._group,
        baseline: !!(this.flags & flags.baseline),

        runs: [{
          stats, error,
          args: {}, name: this._name,
        }],

        style: {
          highlight: this._highlight,
          compact: !!(this.flags & flags.compact),
        },
      };
    }

    else {
      const offsets = new Array(args.length).fill(0);
      const runs = new Array(args.reduce((len, name) => len * this._args[name].length, 1));

      for (let o = 0; o < runs.length; o++) {
        {
          let stats, error;
          const _args = {};
          let _name = this._name;
          for (let oo = 0; oo < args.length; oo++) _args[args[oo]] = this._args[args[oo]][offsets[oo]];
          for (let oo = 0; oo < args.length; oo++) _name = _name.replaceAll(`\$${args[oo]}`, _args[args[oo]]);
          try { stats = await measure(this.f, { ...tune, args: _args }); } catch (err) { error = err; if (thrw) throw err; }

          runs[o] = {
            stats, error,
            args: _args, name: _name,
          };
        }

        let offset = 0;
        do { offsets[offset] = (1 + offsets[offset]) % this._args[args[offset]].length; } while (0 === offsets[offset++] && offset < args.length);
      }

      return {
        runs, kind,
        args: this._args,
        alias: this._name,
        group: this._group,
        baseline: !!(this.flags & flags.baseline),

        style: {
          highlight: this._highlight,
          compact: !!(this.flags & flags.compact),
        },
      };
    }
  }
}

// ------ collections ------

export function boxplot(f) { return _c(f, 'x'); }
export function barplot(f) { return _c(f, 'b'); }
export function summary(f) { return _c(f, 's'); }
export function lineplot(f) { return _c(f, 'l'); }
export function group(name, f) { if (typeof name === 'function') (f = name, name = null); return _c(f, 'g', name); }

export function bench(n, fn) {
  if (typeof n === 'function') (fn = n, n = fn.name || 'anonymous');

  const collection = COLLECTIONS[COLLECTIONS.length - 1];
  const b = new B(n, fn); b._group = collection.id; return (collection.trials.push(b), b);
}

export function compact(f) {
  const old = FLAGS;
  FLAGS |= flags.compact;

  const r = f();
  if (!(r instanceof Promise)) FLAGS = old;
  else return r.then(() => (FLAGS = old, void 0));
}

const _c = (f, t, name = null) => {
  const last = COLLECTIONS[COLLECTIONS.length - 1];
  COLLECTIONS.push({ trials: [], name: name ?? last.name, id: COLLECTIONS.length, types: [t, ...last.types] });

  const r = f();
  const n = { trials: [], name: last.name, types: last.types, id: COLLECTIONS.length };
  if (!(r instanceof Promise)) COLLECTIONS.push(n); else return r.then(() => (COLLECTIONS.push(n), void 0));
};

// ------ runtime ------

function colors() {
  return globalThis.tjs?.env?.FORCE_COLOR || globalThis.process?.env?.FORCE_COLOR
    || (
      !globalThis.Deno?.noColor
      && !globalThis.tjs?.env?.NO_COLOR
      && !globalThis.process?.env?.NO_COLOR
      && !globalThis.process?.env?.NODE_DISABLE_COLORS
    );
}

async function cpu() {
  if (globalThis.process?.versions?.webcontainer) return null;
  try { let n; if (n = require('os')?.cpus?.()?.[0]?.model) return n; } catch { }
  try { let n; if (n = require('node:os')?.cpus?.()?.[0]?.model) return n; } catch { }
  try { let n; if (n = globalThis.tjs?.system?.cpus?.[0]?.model) return n; } catch { }
  try { let n; if (n = (await import('node:os'))?.cpus?.()?.[0]?.model) return n; } catch { }

  return null;
}

function version() {
  return ({
    v8: () => globalThis.version?.(),
    bun: () => globalThis.Bun?.version,
    'txiki.js': () => globalThis.tjs?.version,
    deno: () => globalThis.Deno?.version?.deno,
    llrt: () => globalThis.process?.versions?.llrt,
    node: () => globalThis.process?.versions?.node,
    graaljs: () => globalThis.Graal?.versionGraalVM,
    webcontainer: () => globalThis.process?.versions?.webcontainer,
    'quickjs-ng': () => globalThis.navigator?.userAgent?.split?.('/')[1],
    hermes: () => globalThis.HermesInternal?.getRuntimeProperties?.()?.['OSS Release Version'],
  })[runtime()]?.() || null;
}

function runtime() {
  if (globalThis.d8) return 'v8';
  if (globalThis.tjs) return 'txiki.js';
  if (globalThis.Graal) return 'graaljs';
  if (globalThis.process?.versions?.llrt) return 'llrt';
  if (globalThis.process?.versions?.webcontainer) return 'webcontainer';
  if (globalThis.inIon && globalThis.performance?.mozMemory) return 'spidermonkey';
  if (globalThis.window && globalThis.netscape && globalThis.InternalError) return 'firefox';
  if (globalThis.window && globalThis.navigator && Error.prepareStackTrace) return 'chromium';
  if (globalThis.navigator?.userAgent?.toLowerCase?.()?.includes?.('quickjs-ng')) return 'quickjs-ng';
  if (globalThis.$262 && globalThis.lockdown && globalThis.AsyncDisposableStack) return 'XS Moddable';
  if (globalThis.$ && 'IsHTMLDDA' in globalThis.$ && (new Error().stack).includes('runtime@')) return 'jsc';
  if (globalThis.window && globalThis.navigator && (new Error().stack).includes('runtime@')) return 'webkit';

  if (globalThis.os && globalThis.std) return 'quickjs';
  if (globalThis.Bun) return 'bun'; if (globalThis.Deno) return 'deno'; if (globalThis.HermesInternal) return 'hermes';
  if (globalThis.window && globalThis.navigator) return 'browser'; if (globalThis.process) return 'node'; else return null;
}

async function arch() {
  if (runtime() === 'webcontainer') return 'js + wasm';
  try { let n; if (n = Deno?.build?.target) return n; } catch { }
  try { const os = await import('node:os'); return `${os.arch()}-${os.platform()}`; } catch { }

  if (globalThis.process?.arch && globalThis.process?.platform) {
    return `${globalThis.process.arch}-${globalThis.process.platform}`;
  }

  if (runtime() === 'txiki.js') {
    return `${globalThis.tjs.system?.arch}-${globalThis.tjs.system?.platform}`;
  }

  if (runtime() === 'spidermonkey') {
    try {
      const build = globalThis.getBuildConfiguration();
      const platforms = ['osx', 'linux', 'android', 'windows'];
      const archs = ['arm', 'x64', 'x86', 'wasi', 'arm64', 'mips32', 'mips64', 'loong64', 'riscv64'];

      const arch = archs.find(k => build[k]);
      const platform = platforms.find(k => build[k]);
      if (arch) return !platform ? arch : `${arch}-${platform}`;
    } catch { }

    try { if (globalThis.isAvxPresent()) return 'x86_64'; } catch { }
  }

  return null;
}

// ------ run ------

function defaults(opts) {
  opts.print ??= grint;
  opts.throw ??= false;
  opts.filter ??= /.*/;
  opts.format ??= 'mitata';
  opts.colors ??= colors();
  opts.observe ??= trial => trial;
}

export async function run(opts = {}) {
  defaults(opts);
  const t = Date.now();
  const benchmarks = [];
  const noop = await measure(() => { });
  const _cpu = await measure(() => { }, { batch_unroll: 1 });
  const noop_inner_gc = await measure(() => { }, { inner_gc: true });
  const noop_iter = await measure(state => { for (const _ of state); });

  const context = {
    now: t,
    arch: await arch(),
    version: version(),
    runtime: runtime(),

    cpu: {
      name: await cpu(),
      freq: 1 / _cpu.avg,
    },

    noop: {
      fn: noop,
      iter: noop_iter,
      fn_gc: noop_inner_gc,
    },
  };

  if (
    !$counters
    && context.arch?.includes?.('darwin')
    && ['bun', 'node', 'deno'].includes(context.runtime)
  ) {
    try {
      $counters = await import('@mitata/counters');
      if (0 !== process.getuid()) throw ($counters = false, 1);
    } catch { }
  }

  if (
    !$counters
    && context.arch?.includes?.('linux')
    && ['bun', 'node', 'deno'].includes(context.runtime)
  ) {
    try { $counters = await import('@mitata/counters'); }
    catch (err) { if (err?.message?.includes?.('PermissionDenied')) $counters = false; }
  }

  const layout = COLLECTIONS.map(c => ({ name: c.name, types: c.types }));
  const format = 'string' === typeof opts.format ? opts.format : Object.keys(opts.format)[0];
  await formats[format](context, { ...opts, format: opts.format[format] }, benchmarks, layout);
  return (COLLECTIONS = [{ name: 0, types: [], trials: [] }], { layout, context, benchmarks });
}

const formats = {
  async quiet(_, opts, benchmarks) {
    for (const collection of COLLECTIONS) {
      for (const trial of collection.trials) {
        if (opts.filter.test(trial._name)) benchmarks.push(opts.observe(await trial.run(opts.throw)));
      }
    }
  },

  async json(ctx, opts, benchmarks, layout) {
    const print = opts.print;
    const debug = opts.format?.debug ?? true;
    const samples = opts.format?.samples ?? true;

    for (const collection of COLLECTIONS) {
      for (const trial of collection.trials) {
        if (opts.filter.test(trial._name)) benchmarks.push(opts.observe(await trial.run(opts.throw)));
      }
    }

    print(JSON.stringify({
      layout,
      benchmarks,
      context: ctx,
    },
      (k, v) => {
        if (!debug && k === 'debug') return '';
        if (!samples && k === 'samples') return null;

        if (!(v instanceof Error)) return v;
        return { message: String(v.message), stack: v.stack };
      }, 0));
  },

  async markdown(ctx, opts, benchmarks) {
    let first = true;
    const print = opts.print;

    print(`clk: ~${ctx.cpu.freq.toFixed(2)} GHz`); print(`cpu: ${ctx.cpu.name}`);
    print(`runtime: ${ctx.runtime}${!ctx.version ? '' : ` ${ctx.version}`} (${ctx.arch})`);

    print('');

    for (const collection of COLLECTIONS) {
      const trials = [];
      if (!collection.trials.length) continue;

      for (const trial of collection.trials) {
        if (opts.filter.test(trial._name)) {
          let bench = await trial.run(opts.throw);

          bench = opts.observe(bench);
          trials.push(bench); benchmarks.push(bench);
        }
      }

      if (!trials.length) continue; if (!first) print('');
      const name_len = trials.reduce((a, b) => Math.max(a, b.runs.reduce((a, b) => Math.max(a, b.name.length), 0)), 0);
      print(`| ${(collection.name ? `• ${collection.name}` : (!first ? '' : 'benchmark')).padEnd(name_len)} | ${'avg'.padStart(2 + 14)} | ${'min'.padStart(2 + 9)} | ${'p75'.padStart(2 + 9)} | ${'p99'.padStart(2 + 9)} | ${'max'.padStart(2 + 9)} |`);
      print(`| ${'-'.repeat(name_len)} | ${'-'.repeat(2 + 14)} | ${'-'.repeat(2 + 9)} | ${'-'.repeat(2 + 9)} | ${'-'.repeat(2 + 9)} | ${'-'.repeat(2 + 9)} |`);

      first = false;

      for (const trial of trials) {
        for (const run of trial.runs) {
          if (run.error) print(`| ${run.name.padEnd(name_len)} | error: ${run.error.message ?? run.error} |`);
          else print(`| ${run.name.padEnd(name_len)} | \`${`${$.time(run.stats.avg)}/iter`.padStart(14)}\` | \`${$.time(run.stats.min).padStart(9)}\` | \`${$.time(run.stats.p75).padStart(9)}\` | \`${$.time(run.stats.p99).padStart(9)}\` | \`${$.time(run.stats.max).padStart(9)}\` |`);
        }
      }
    }
  },

  async mitata(ctx, opts, benchmarks) {
    const print = opts.print;
    let k_legend = opts.format?.name ?? 'longest';

    if ('fixed' === k_legend) k_legend = 28;

    else if (k_legend === 'longest') {
      k_legend = 28;

      for (const collection of COLLECTIONS) {
        for (const trial of collection.trials) {
          if (opts.filter.test(trial._name)) {
            for (const name of trial._names()) {
              k_legend = Math.max(k_legend, name.length);
            }
          }
        }
      }
    }

    k_legend = Math.max(20, k_legend);
    if (!opts.colors) print(`clk: ~${ctx.cpu.freq.toFixed(2)} GHz`);
    else print($.gray + `clk: ~${ctx.cpu.freq.toFixed(2)} GHz` + $.reset);

    if (!opts.colors) print(`cpu: ${ctx.cpu.name}`);
    else print($.gray + `cpu: ${ctx.cpu.name}` + $.reset);
    if (!opts.colors) print(`runtime: ${ctx.runtime}${!ctx.version ? '' : ` ${ctx.version}`} (${ctx.arch})`);
    else print($.gray + `runtime: ${ctx.runtime}${!ctx.version ? '' : ` ${ctx.version}`} (${ctx.arch})` + $.reset);

    print('');
    print(`${'benchmark'.padEnd(k_legend - 1)} avg (min … max) p75 / p99    (min … top 1%)`); print('-'.repeat(15 + k_legend) + ' ' + '-'.repeat(31));

    let first = true;
    let optimized_out_warning = false;

    for (const collection of COLLECTIONS) {
      const trials = [];
      let prev_run_gap = false;
      if (!collection.trials.length) continue;
      const has_matches = collection.trials.some(trial => opts.filter.test(trial._name));

      if (!has_matches) continue;

      else if (first) {
        first = false;

        if (collection.name) {
          print(`• ${collection.name}`);
          if (!opts.colors) print('-'.repeat(15 + k_legend) + ' ' + '-'.repeat(31));
          else print($.gray + '-'.repeat(15 + k_legend) + ' ' + '-'.repeat(31) + $.reset);
        }
      }

      else {
        print('');
        if (collection.name) print(`• ${collection.name}`);
        if (!opts.colors) print('-'.repeat(15 + k_legend) + ' ' + '-'.repeat(31));
        else print($.gray + '-'.repeat(15 + k_legend) + ' ' + '-'.repeat(31) + $.reset);
      }

      for (const trial of collection.trials) {
        if (opts.filter.test(trial._name)) {
          let bench = await trial.run(opts.throw);

          bench = opts.observe(bench);
          trials.push([trial, bench]); benchmarks.push(bench);
          if (-1 === $.colors.indexOf(trial._highlight)) trial._highlight = null;
          const _h = !opts.colors || !trial._highlight ? x => x : x => $[trial._highlight] + x + $.reset;

          for (const r of bench.runs) {
            if (prev_run_gap) print('');

            if (r.error) {
              if (!opts.colors) print(`${_h($.str(r.name, k_legend).padEnd(k_legend))} error: ${r.error.message ?? r.error}`);
              else print(`${_h($.str(r.name, k_legend).padEnd(k_legend))} ${$.red + 'error:' + $.reset} ${r.error.message ?? r.error}`);
            }

            else {
              const compact = trial.flags & flags.compact;
              const noop = 'iter' === r.stats.kind ? ctx.noop.iter : (trial._gc !== 'inner' ? ctx.noop.fn : ctx.noop.fn_gc);

              const optimized_out = r.stats.avg < (1.42 * noop.avg);
              optimized_out_warning = optimized_out_warning || optimized_out;

              if (compact) {
                let l = '';
                prev_run_gap = false;
                const avg = $.time(r.stats.avg).padStart(9);
                const name = $.str(r.name, k_legend).padEnd(k_legend);

                l += _h(name) + ' ';
                if (!opts.colors) l += avg + '/iter';
                else l += $.bold + $.yellow + avg + $.reset + $.bold + '/iter' + $.reset;

                const p75 = $.time(r.stats.p75).padStart(9);
                const p99 = $.time(r.stats.p99).padStart(9);
                const bins = $.histogram.bins(r.stats, 11, .99);
                const histogram = $.histogram.ascii(bins, 1, { colors: opts.colors });

                l += ' ';
                if (!opts.colors) l += p75 + ' ' + p99 + ' ' + histogram[0];
                else l += $.gray + p75 + ' ' + p99 + $.reset + ' ' + histogram[0];

                if (optimized_out)
                  if (!opts.colors) l += ' !';
                  else l += $.red + ' !' + $.reset;

                print(l);
              }

              else {
                let l = '';
                const avg = $.time(r.stats.avg).padStart(9);
                const name = $.str(r.name, k_legend).padEnd(k_legend);

                l += _h(name) + ' ';
                const p75 = $.time(r.stats.p75).padStart(9);
                const bins = $.histogram.bins(r.stats, 21, .99);
                const histogram = $.histogram.ascii(bins, (r.stats.gc && r.stats.heap) ? 2 : (!(r.stats.gc || r.stats.heap) ? 2 : 3), { colors: opts.colors });

                if (!opts.colors) l += avg + '/iter' + ' ' + p75 + ' ' + histogram[0];
                else l += $.bold + $.yellow + avg + $.reset + $.bold + '/iter' + $.reset + ' ' + $.gray + p75 + $.reset + ' ' + histogram[0];

                if (optimized_out)
                  if (!opts.colors) l += ' !';
                  else l += $.red + ' !' + $.reset;

                print(l);

                l = '';
                const min = $.time(r.stats.min);
                const max = $.time(r.stats.max);
                const p99 = $.time(r.stats.p99).padStart(9);
                const diff = (2 * 9) - (min.length + max.length);

                l += ' '.repeat(diff + k_legend - 8);
                if (!opts.colors) l += '(' + min + ' … ' + max + ')';
                else l += $.gray + '(' + $.reset + $.cyan + min + $.reset + $.gray + ' … ' + $.reset + $.magenta + max + $.reset + $.gray + ')' + $.reset;

                l += ' ';
                if (!opts.colors) l += p99 + ' ' + histogram[1];
                else l += $.gray + p99 + $.reset + ' ' + histogram[1];

                print(l);

                if (r.stats.gc) {
                  l = '';
                  prev_run_gap = true;
                  l += ' '.repeat(k_legend - 10);
                  const gcm = $.time(r.stats.gc.min).padStart(9);
                  const gcx = $.time(r.stats.gc.max).padStart(9);

                  if (!opts.colors)
                    l += 'gc(' + gcm + ' … ' + gcx + ')';
                  else l += $.gray + 'gc(' + $.reset + $.blue + gcm + $.reset + $.gray + ' … ' + $.reset + $.blue + gcx + $.reset + $.gray + ')' + $.reset;

                  if (r.stats.heap) {
                    l += ' ';
                    const ha = $.bytes(r.stats.heap.avg).padStart(9);
                    const hm = $.bytes(r.stats.heap.min).padStart(9);
                    const hx = $.bytes(r.stats.heap.max).padStart(9);

                    if (!opts.colors)
                      l += ha + ' (' + hm + '…' + hx + ')';
                    else l += $.yellow + ha + $.reset + $.gray + ' (' + $.reset + $.yellow + hm + $.reset + $.gray + '…' + $.reset + $.yellow + hx + $.reset + $.gray + ')' + $.reset;
                  }

                  else {
                    l += ' ';
                    const gca = ($.time(r.stats.gc.avg)).padStart(9);

                    if (!opts.colors) l += gca + ' ' + histogram[2];
                    else l += $.blue + gca + $.reset + ' ' + histogram[2];
                  }

                  print(l);
                }

                else if (r.stats.heap) {
                  prev_run_gap = true;
                  l = ' '.repeat(k_legend - 8);
                  const ha = $.bytes(r.stats.heap.avg).padStart(9);
                  const hm = $.bytes(r.stats.heap.min).padStart(9);
                  const hx = $.bytes(r.stats.heap.max).padStart(9);

                  if (!opts.colors)
                    l += '(' + hm + ' … ' + hx + ') ' + ha + ' ' + histogram[2];
                  else l += $.gray + '(' + $.reset + $.yellow + hm + $.reset + $.gray + ' … ' + $.reset + $.yellow + hx + $.reset + $.gray + ') ' + $.reset + $.yellow + ha + $.reset + ' ' + histogram[2];

                  print(l);
                }

                if (r.stats.counters) {
                  l = '';
                  prev_run_gap = true;

                  if (ctx.arch.includes('linux')) {
                    const _bmispred = r.stats.counters._bmispred.avg;
                    const ipc = r.stats.counters.instructions.avg / r.stats.counters.cycles.avg;
                    const cache = 100 - Math.min(100, 100 * r.stats.counters.cache.misses.avg / r.stats.counters.cache.avg);

                    l += ' '.repeat(k_legend - 12);
                    if (!opts.colors) l += $.amount(ipc).padStart(7) + ' ipc';
                    else l += $.bold + $.green + $.amount(ipc).padStart(7) + $.reset + $.bold + ' ipc' + $.reset;

                    if (!opts.colors) l += ' (' + cache.toFixed(2).padStart(6) + '% cache)';
                    else l += $.gray + ' (' + $.reset + (50 > cache ? $.red : (84 < cache ? $.green : $.yellow)) + cache.toFixed(2).padStart(6) + '%' + $.reset + ' cache' + $.gray + ')' + $.reset;

                    if (!opts.colors) l += ' ' + $.amount(_bmispred).padStart(7) + ' branch misses';
                    else l += ' ' + $.green + $.amount(_bmispred).padStart(7) + $.reset + ' branch misses';

                    print(l);

                    l = '';
                    l += ' '.repeat(k_legend - 20);

                    if (opts.colors) l += $.gray;
                    l += $.amount(r.stats.counters.cycles.avg).padStart(7) + ' cycles';
                    l += ' ' + $.amount(r.stats.counters.instructions.avg).padStart(7) + ' instructions';

                    l += ' ' + $.amount(r.stats.counters.cache.avg).padStart(7) + ' c-refs';
                    l += ' ' + $.amount(r.stats.counters.cache.misses.avg).padStart(7) + ' c-misses';

                    if (opts.colors) l += $.reset;

                    print(l);
                  }

                  if (ctx.arch.includes('darwin')) {
                    const ipc = r.stats.counters.instructions.avg / r.stats.counters.cycles.avg;
                    const stalls = 100 * r.stats.counters.cycles.stalls.avg / r.stats.counters.cycles.avg;
                    const ldst = 100 * r.stats.counters.instructions.loads_and_stores.avg / r.stats.counters.instructions.avg;
                    const cache = 100 - Math.min(100, 100 * (r.stats.counters.l1.miss_loads.avg + r.stats.counters.l1.miss_stores.avg) / r.stats.counters.instructions.loads_and_stores.avg);

                    l += ' '.repeat(k_legend - 13);
                    if (!opts.colors) l += $.amount(ipc).padStart(7) + ' ipc';
                    else l += $.bold + $.green + $.amount(ipc).padStart(7) + $.reset + $.bold + ' ipc' + $.reset;

                    if (!opts.colors) l += ' (' + stalls.toFixed(2).padStart(6) + '% stalls)';
                    else l += $.gray + ' (' + $.reset + (12 > stalls ? $.green : (50 < stalls ? $.red : $.yellow)) + stalls.toFixed(2).padStart(6) + '%' + $.reset + ' stalls' + $.gray + ')' + $.reset;

                    if (!opts.colors) l += ' ' + cache.toFixed(2).padStart(6) + '% L1 data cache';
                    else l += ' ' + (50 > cache ? $.red : (84 < cache ? $.green : $.yellow)) + cache.toFixed(2).padStart(6) + '%' + $.reset + ' L1 data cache';

                    print(l);

                    l = '';
                    l += ' '.repeat(k_legend - 20);

                    if (opts.colors) l += $.gray;
                    l += $.amount(r.stats.counters.cycles.avg).padStart(7) + ' cycles';
                    l += ' ' + $.amount(r.stats.counters.instructions.avg).padStart(7) + ' instructions';
                    l += ' ' + ldst.toFixed(2).padStart(6) + '%' + ' retired LD/ST (' + $.amount(r.stats.counters.instructions.loads_and_stores.avg).padStart(7) + ')';

                    if (opts.colors) l += $.reset;

                    print(l);
                  }
                }
              }
            }
          }
        }
      }

      if (collection.types.includes('b')) {
        const map = {};
        const colors = {};

        for (const [trial, bench] of trials) {
          for (const r of bench.runs) {
            if (r.error) continue;
            map[r.name] = r.stats.avg;
            colors[r.name] = $[trial._highlight];
          }
        }

        if (Object.keys(map).length) {
          print('');

          $.barplot.ascii(map, k_legend, 44, {
            steps: -10,
            colors: !opts.colors ? null : colors,
          }).forEach(l => print(l));
        }
      }

      if (collection.types.includes('x')) {
        const map = {};
        const colors = {};

        if (1 === trials.length) {
          for (const [trial, bench] of trials) {
            for (const r of bench.runs) {
              map[r.name] = r.stats;
              colors[r.name] = $[trial._highlight];
            }
          }
        }

        else {
          for (const [trial, bench] of trials) {
            const runs = bench.runs.filter(r => r.stats);

            if (!runs.length) continue;

            if (1 === runs.length) {
              map[runs[0].name] = runs[0].stats;
              colors[runs[0].name] = $[trial._highlight];
            }

            else {
              const stats = {
                avg: 0,
                min: Infinity,
                p25: Infinity,
                p75: -Infinity,
                p99: -Infinity,
              };

              for (const r of runs) {
                stats.avg += r.stats.avg;
                stats.min = Math.min(stats.min, r.stats.min);
                stats.p25 = Math.min(stats.p25, r.stats.p25);
                stats.p75 = Math.max(stats.p75, r.stats.p75);
                stats.p99 = Math.max(stats.p99, r.stats.p99);
              }

              map[bench.alias] = stats;
              stats.avg /= runs.length;
              colors[bench.alias] = $[trial._highlight];
            }
          }
        }

        if (Object.keys(map).length) {
          print('');
          $.boxplot.ascii(map, k_legend, 44, {
            colors: !opts.colors ? null : colors,
          }).forEach(l => print(l));
        }
      }

      if (collection.types.includes('l')) {
        const map = {};
        const extra = {};
        const colors = {};
        const labels = {};

        if (1 === trials.length) {
          for (const [trial, bench] of trials) {
            const runs = bench.runs.filter(r => r.stats);

            if (!runs.length) continue;

            if (1 === runs.length) {
              const { min, max, avg, peak, bins } = $.histogram.bins(runs[0].stats, 44, .99);

              extra.ymax = peak;
              colors.xmin = $.cyan;
              colors.xmax = $.magenta;
              extra.ymin = $.min(bins);
              labels.xmin = $.time(min);
              labels.xmax = $.time(max);
              extra.xmax = bins.length - 1;
              colors[runs[0].name] = $[trial._highlight] || $.bold;

              map[runs[0].name] = {
                y: bins,
                x: bins.map((_, o) => o),

                format(x, y, s) {
                  x = Math.round(x * 44);
                  if (!opts.colors) return s;
                  if (x === avg) return $.yellow + s + $.reset;
                  return (x < avg ? $.cyan : $.magenta) + s + $.reset;
                },
              };
            }

            else {
              const avgs = runs.map(r => r.stats.avg);

              colors.ymin = $.cyan;
              colors.ymax = $.magenta;
              extra.ymin = $.min(avgs);
              extra.ymax = $.max(avgs);
              extra.xmax = runs.length - 1;
              labels.ymin = $.time(extra.ymin);
              labels.ymax = $.time(extra.ymax);
              colors[bench.alias] = $[trial._highlight];

              map[bench.alias] = {
                y: avgs,
                x: avgs.map((_, o) => o),
              };
            }
          }
        }

        else {
          if (trials.every(([_, bench]) => 'static' === bench.kind)) {
            colors.xmin = $.cyan;
            colors.xmax = $.magenta;

            for (const [trial, bench] of trials) {
              for (const r of bench.runs) {
                if (r.error) continue;
                const { bins, peak, steps } = $.histogram.bins(r.stats, 44, .99);

                const y = bins.map(b => b / peak);

                map[r.name] = { y, x: steps };
                colors[r.name] = $[trial._highlight];
                extra.ymin = Math.min($.min(y), extra.ymin ?? Infinity);
                extra.ymax = Math.max($.max(y), extra.ymax ?? -Infinity);
                extra.xmin = Math.min($.min(steps), extra.xmin ?? Infinity);
                extra.xmax = Math.max($.max(steps), extra.xmax ?? -Infinity);
                labels.xmin = $.time(extra.xmin); labels.xmax = $.time(extra.xmax);
              }
            }
          }

          else {
            let min = Infinity;
            let max = -Infinity;

            for (const [trial, bench] of trials) {
              for (const r of bench.runs) {
                if (r.error) continue;
                min = Math.min(min, r.stats.avg);
                max = Math.max(max, r.stats.avg);
              }
            }

            colors.ymin = $.cyan;
            colors.ymax = $.magenta;
            labels.ymin = $.time(min);
            labels.ymax = $.time(max);

            for (const [trial, bench] of trials) {
              const runs = bench.runs.filter(r => r.stats);

              if (!runs.length) continue;

              if (1 === runs.length) {
                const y = runs[0].stats.avg / max;
                colors[runs[0].name] = $[trial._highlight];
                map[runs[0].name] = { x: [0, 1], y: [y, y] };
                extra.ymin = Math.min(y, extra.ymin ?? Infinity);
                extra.ymax = Math.max(y, extra.ymax ?? -Infinity);
              }

              else {
                colors[bench.alias] = $[trial._highlight];
                const y = runs.map(r => r.stats.avg / max);
                extra.ymin = Math.min($.min(y), extra.ymin ?? Infinity);
                extra.ymax = Math.max($.max(y), extra.ymax ?? -Infinity);
                map[bench.alias] = { y, x: runs.map((_, o) => o / (runs.length - 1)) };
              }
            }
          }
        }

        if (Object.keys(map).length) {
          print('');

          $.lineplot.ascii(map, {
            labels,
            ...extra,
            width: 44,
            height: 16,
            key: k_legend,
            colors: !opts.colors ? null : colors,
          }).forEach(l => print(l));
        }
      }

      if (collection.types.includes('s')) {
        trials.sort((a, b) => {
          const aa = a[1].runs.filter(r => r.stats);
          const bb = b[1].runs.filter(r => r.stats);

          if (0 === aa.length) return 1;
          if (0 === bb.length) return -1;

          const a_avg = aa.reduce((a, r) => a + r.stats.avg, 0) / aa.length;
          const b_avg = bb.reduce((a, r) => a + r.stats.avg, 0) / bb.length;

          return a_avg - b_avg;
        });

        if (1 === trials.length) {
          const runs = trials[0][1].runs
            .filter(r => r.stats)
            .sort((a, b) => a.stats.avg - b.stats.avg);

          if (1 < runs.length) {
            print('');
            if (!opts.colors) print('summary');
            else print($.bold + 'summary' + $.reset);
            if (!opts.colors) print('  ' + runs[0].name);
            else print(' '.repeat(2) + $.bold + $.cyan + runs[0].name + $.reset);

            for (let o = 1; o < runs.length; o++) {
              const r = runs[o];
              const baseline = runs[0];
              const faster = r.stats.avg >= baseline.stats.avg;

              const diff = !faster
                ? Number((1 / r.stats.avg * baseline.stats.avg).toFixed(2))
                : Number((1 / baseline.stats.avg * r.stats.avg).toFixed(2));

              if (!opts.colors) print(' '.repeat(3) + diff + `x ${faster ? 'faster' : 'slower'} than ${r.name}`);
              else print(' '.repeat(3) + (!faster ? $.red : $.green) + diff + $.reset + `x ${faster ? 'faster' : 'slower'} than ${$.bold + $.cyan + r.name + $.reset}`);

            }
          }
        }

        else {
          let header = false;
          const baseline = trials.find(([trial, bench]) => bench.baseline && bench.runs.some(r => r.stats))?.[1] || trials[0][1];

          if (baseline) {
            const bruns = baseline.runs.filter(r => !r.error).sort((a, b) => a.stats.avg - b.stats.avg);

            for (const [trial, bench] of trials) {
              if (bench === baseline) continue;

              const runs = bench.runs
                .filter(r => !r.error)
                .sort((a, b) => a.stats.avg - b.stats.avg);

              if (!runs.length) continue;

              if (!header) {
                print('');
                header = true;
                if (!opts.colors) print('summary');
                else print($.bold + 'summary' + $.reset);

                if (1 !== bruns.length) {
                  if (!opts.colors) print('  ' + baseline.alias);
                  else print(' '.repeat(2) + $.bold + $.cyan + baseline.alias + $.reset);
                }

                else {
                  if (!opts.colors) print('  ' + bruns[0].name);
                  else print(' '.repeat(2) + $.bold + $.cyan + bruns[0].name + $.reset);
                }
              }

              if (1 === runs.length && 1 === bruns.length) {
                const r = runs[0];
                const br = bruns[0];
                const faster = r.stats.avg >= br.stats.avg;

                const diff = !faster
                  ? Number((1 / r.stats.avg * br.stats.avg).toFixed(2))
                  : Number((1 / br.stats.avg * r.stats.avg).toFixed(2));

                if (!opts.colors) print(' '.repeat(3) + diff + `x ${faster ? 'faster' : 'slower'} than ${r.name}`);
                else print(' '.repeat(3) + (!faster ? $.red : $.green) + diff + $.reset + `x ${faster ? 'faster' : 'slower'} than ${$.bold + $.cyan + r.name + $.reset}`);
              }

              else {
                const rf = runs[0];
                const bf = bruns[0];
                const rs = runs[runs.length - 1];
                const bs = bruns[bruns.length - 1];

                const ravg = runs.reduce((a, r) => a + r.stats.avg, 0) / runs.length;
                const bavg = bruns.reduce((a, r) => a + r.stats.avg, 0) / bruns.length;

                const faster = ravg >= bavg;
                const sfaster = rs.stats.avg >= bs.stats.avg;
                const ffaster = rf.stats.avg >= bf.stats.avg;

                const sdiff = !sfaster
                  ? Number((1 / rs.stats.avg * bs.stats.avg).toFixed(2))
                  : Number((1 / bs.stats.avg * rs.stats.avg).toFixed(2));

                const fdiff = !ffaster
                  ? Number((1 / rf.stats.avg * bf.stats.avg).toFixed(2))
                  : Number((1 / bf.stats.avg * rf.stats.avg).toFixed(2));

                if (!opts.colors) print(
                  ' '.repeat(3)
                  + (
                    1 === sdiff
                      ? sdiff
                      : ((sfaster ? '+' : '-') + sdiff)
                  )
                  + '…'
                  + (
                    1 === fdiff
                      ? fdiff
                      : ((ffaster ? '+' : '-') + fdiff)
                  )
                  + `x ${faster ? 'faster' : 'slower'} than ${1 === runs.length ? rf.name : bench.alias}`
                );

                else print(
                  ' '.repeat(3)
                  + (
                    1 === sdiff
                      ? ($.gray + sdiff + $.reset)
                      : (
                        !sfaster
                          ? ($.red + '-' + sdiff + $.reset)
                          : ($.green + '+' + sdiff + $.reset)
                      )
                  )
                  + '…'
                  + (
                    1 === fdiff
                      ? ($.gray + fdiff + $.reset)
                      : (
                        !ffaster
                          ? ($.red + '-' + fdiff + $.reset)
                          : ($.green + '+' + fdiff + $.reset)
                      )
                  )
                  + `x ${faster ? 'faster' : 'slower'} than ${$.bold + $.cyan + (1 === runs.length ? rf.name : bench.alias) + $.reset}`
                )
              }
            }
          }
        }
      }
    }

    let nl = false;

    if (false === $counters)
      if (!opts.colors) (print(''), nl = true, print('! = run with sudo to enable hardware counters'));
      else (print(''), nl = true, print($.yellow + '!' + $.reset + $.gray + ' = ' + $.reset + 'run with sudo to enable hardware counters'));

    if (optimized_out_warning)
      if (!opts.colors) (nl ? null : print(''), print(' '.repeat(k_legend - 13) + 'benchmark was likely optimized out (dead code elimination) = !'), print(' '.repeat(k_legend - 13) + 'https://github.com/evanwashere/mitata#writing-good-benchmarks'));
      else (nl ? null : print(''), print(' '.repeat(k_legend - 13) + 'benchmark was likely optimized out' + ' ' + $.gray + '(dead code elimination)' + $.reset + $.gray + ' = ' + $.reset + $.red + '!' + $.reset), print(' '.repeat(k_legend - 13) + $.gray + 'https://github.com/evanwashere/mitata#writing-good-benchmarks' + $.reset));
  },
};

export const $ = {
  bold: '\x1b[1m',
  reset: '\x1b[0m',

  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
  black: '\x1b[30m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',

  colors: ['red', 'cyan', 'blue', 'green', 'yellow', 'magenta', 'gray', 'white', 'black'],

  clamp(m, v, x) {
    return v < m ? m : v > x ? x : v;
  },

  min(arr, s = Infinity) {
    return arr.reduce((x, v) => Math.min(x, v), s);
  },

  max(arr, s = -Infinity) {
    return arr.reduce((x, v) => Math.max(x, v), s);
  },

  str(s, len = 3) {
    if (len >= s.length) return s;
    return `${s.slice(0, len - 2)}..`;
  },

  amount(n) {
    if (Number.isNaN(n)) return 'NaN';
    if (n < 1e3) return n.toFixed(2); n /= 1000;
    if (n < 1e3) return `${n.toFixed(2)}k`; n /= 1000;
    if (n < 1e3) return `${n.toFixed(2)}M`; n /= 1000;
    if (n < 1e3) return `${n.toFixed(2)}G`; n /= 1000;
    if (n < 1e3) return `${n.toFixed(2)}T`; n /= 1000;

    return `${n.toFixed(2)}P`;
  },

  bytes(b, pad = true) {
    if (Number.isNaN(b)) return 'NaN';
    if (b < 1e3) return `${b.toFixed(2)} ${!pad ? '' : ' '}b`;

    b /= 1024;
    if (b < 1e3) return `${b.toFixed(2)} kb`; b /= 1024;
    if (b < 1e3) return `${b.toFixed(2)} mb`; b /= 1024;
    if (b < 1e3) return `${b.toFixed(2)} gb`; b /= 1024;
    if (b < 1e3) return `${b.toFixed(2)} tb`; b /= 1024;

    return `${b.toFixed(2)} pb`;
  },

  time(ns) {
    if (ns < 1e0) return `${(ns * 1e3).toFixed(2)} ps`;
    if (ns < 1e3) return `${ns.toFixed(2)} ns`; ns /= 1000;
    if (ns < 1e3) return `${ns.toFixed(2)} µs`; ns /= 1000;
    if (ns < 1e3) return `${ns.toFixed(2)} ms`; ns /= 1000;

    if (ns < 1e3) return `${ns.toFixed(2)} s`; ns /= 60;
    if (ns < 1e3) return `${ns.toFixed(2)} m`; ns /= 60;

    return `${ns.toFixed(2)} h`;
  },

  barplot: {
    symbols: {
      bar: '■',
      legend: '┤',
      tl: '┌', tr: '┐',
      bl: '└', br: '┘',
    },

    ascii(map, key = 8, size = 14, { steps = 0, fmt = $.time, colors = true, symbols = $.barplot.symbols } = {}) {
      const values = Object.values(map);
      const canvas = new Array(2 + values.length).fill('');

      steps += size;
      const min = $.min(values);
      const max = $.max(values);
      const step = (max - min) / steps;

      canvas[0] += ' '.repeat(1 + key);
      canvas[0] += symbols.tl + ' '.repeat(size) + symbols.tr;

      Object.keys(map).forEach((name, o) => {
        const value = map[name];
        const bars = Math.round((value - min) / step);
        if (colors?.[name]) canvas[o + 1] += colors[name];

        canvas[o + 1] += $.str(name, key).padStart(key);
        if (colors?.[name]) canvas[o + 1] += $.reset; canvas[o + 1] += ' ' + symbols.legend;

        if (colors) canvas[o + 1] += $.gray;
        canvas[o + 1] += symbols.bar.repeat(bars); if (colors) canvas[o + 1] += $.reset;

        canvas[o + 1] += ' ';
        if (colors) canvas[o + 1] += $.yellow;
        canvas[o + 1] += fmt(value); if (colors) canvas[o + 1] += $.reset;
      });

      canvas[canvas.length - 1] += ' '.repeat(1 + key);
      canvas[canvas.length - 1] += symbols.bl + ' '.repeat(size) + symbols.br;

      return canvas;
    },
  },

  canvas: {
    braille(width, height) {
      const vwidth = 2 * width;
      const vheight = 4 * height;
      const buffer = new Uint8Array(vwidth * vheight);

      const symbols = [
        0x2801, 0x2802, 0x2804, 0x2840,
        0x2808, 0x2810, 0x2820, 0x2880,
      ];

      return {
        buffer,
        width, height,
        vwidth, vheight,

        set(x, y, tag = 1) {
          buffer[x + y * vwidth] = tag;
        },

        line(s, e, tag = 1) {
          s.x = Math.round(s.x); s.y = Math.round(s.y);
          e.x = Math.round(e.x); e.y = Math.round(e.y);
          const dx = Math.abs(e.x - s.x); const dy = Math.abs(e.y - s.y);

          let err = dx - dy;
          let x = s.x; let y = s.y;
          const sx = s.x < e.x ? 1 : -1;
          const sy = s.y < e.y ? 1 : -1;

          while (true) {
            buffer[x + y * vwidth] = tag;
            if (x === e.x && y === e.y) break;

            const e2 = 2 * err;
            if (e2 < dx) (y += sy, err += dx);
            if (e2 > -dy) (x += sx, err -= dy);
          }
        },

        toString({
          background = false,
          format = (x, y, s, tag, backgorund) => s,
        } = {}) {
          const canvas = new Array(height).fill('');

          for (let y = 0; y < vheight; y += 4) {
            const y0 = y * vwidth;
            const y1 = y0 + vwidth;
            const y2 = y1 + vwidth;
            const y3 = y2 + vwidth;

            for (let x = 0; x < vwidth; x += 2) {
              let c = 0x2800;

              if (buffer[x + y0]) c |= symbols[0]; if (buffer[1 + x + y0]) c |= symbols[4];
              if (buffer[x + y1]) c |= symbols[1]; if (buffer[1 + x + y1]) c |= symbols[5];
              if (buffer[x + y2]) c |= symbols[2]; if (buffer[1 + x + y2]) c |= symbols[6];
              if (buffer[x + y3]) c |= symbols[3]; if (buffer[1 + x + y3]) c |= symbols[7];

              if (c === 0x2800 && !background) canvas[y / 4] += ' ';
              else canvas[y / 4] += format(x / (vwidth - 1), y / (vheight - 1), String.fromCharCode(c), buffer[x + y0] || buffer[1 + x + y0] || buffer[x + y1] || buffer[1 + x + y1] || buffer[x + y2] || buffer[1 + x + y2] || buffer[x + y3] || buffer[1 + x + y3], c === 0x2800);
            }
          }

          return canvas;
        },
      };
    },
  },

  lineplot: {
    symbols: {
      tl: '┌', tr: '┐',
      bl: '└', br: '┘',
    },

    ascii(map, {
      colors = true,
      xmin = 0, xmax = 1,
      ymin = 0, ymax = 1,
      symbols = $.lineplot.symbols,
      key = 8, width = 12, height = 12,
      labels = { xmin: null, xmax: null, ymin: null, ymax: null },
    } = {}) {
      const keys = Object.keys(map);
      const _canvas = $.canvas.braille(width, height);
      const xs = (_canvas.vwidth - 1) / (xmax - xmin);
      const ys = (_canvas.vheight - 1) / (ymax - ymin);

      const colorsv = Object.entries(colors)
        .filter(([n]) => !Object.keys(labels).includes(n)).map(([_, v]) => v);

      const acolors = $.colors.filter(n => !colorsv.includes($[n]));

      keys.forEach((name, k) => {
        const { x: xp, y: yp } = map[name];

        for (let o = 0; o < (xp.length - 1); o++) {
          if (null == xp[o] || null == xp[o + 1]) continue;
          if (null == yp[o] || null == yp[o + 1]) continue;
          const s = { x: Math.round(xs * (xp[o] - xmin)), y: _canvas.vheight - 1 - Math.round(ys * (yp[o] - ymin)) };
          const e = { x: Math.round(xs * (xp[o + 1] - xmin)), y: _canvas.vheight - 1 - Math.round(ys * (yp[o + 1] - ymin)) };

          _canvas.line(s, e, 1 + k);
        }
      });

      const canvas = new Array(2 + _canvas.height).fill('');

      canvas[0] += ' '.repeat(1 + key);
      canvas[0] += symbols.tl + ' '.repeat(width) + symbols.tr;

      const lines = _canvas.toString({
        format(x, y, s, tag) {
          const name = keys[tag - 1];
          if (map[name].format) return map[name].format(x, y, s);
          else if (colors?.[name]) return colors[name] + s + $.reset;
          else return $[acolors[(tag - 1) % acolors.length]] + s + $.reset;
        },
      });

      const plabels = {
        0: !colors?.ymax ? (labels.ymax || '') : (colors.ymax + (labels.ymax || '') + $.reset),
        [lines.length - 1]: !colors?.ymin ? (labels.ymin || '') : (colors.ymin + (labels.ymin || '') + $.reset),
      };

      const legends = keys.map((name, k) => {
        if (colors?.[name]) return colors[name] + $.str(name, key).padStart(key) + $.reset;
        else return $[acolors[k % acolors.length]] + $.str(name, key).padStart(key) + $.reset;
      });

      lines.forEach((l, o) => {
        canvas[o + 1] += legends[o] ?? ' '.repeat(key);
        canvas[o + 1] += ' '.repeat(2) + l + (!plabels[o] ? '' : ' ' + plabels[o]);
      });

      canvas[canvas.length - 1] += ' '.repeat(1 + key);
      canvas[canvas.length - 1] += symbols.bl + ' '.repeat(width) + symbols.br;

      if (labels.xmin || labels.xmax) {
        const xmin = labels.xmin || '';
        const xmax = labels.xmax || '';
        const gap = 2 + width - xmin.length;

        canvas.push(
          ' '.repeat(key) + ' '
          + (!colors?.xmin ? xmin : colors.xmin + xmin + $.reset)
          + (!colors?.xmax ? xmax.padStart(gap) : colors.xmax + xmax.padStart(gap) + $.reset)
        );
      }

      return canvas;
    },
  },

  histogram: {
    symbols: ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'],

    bins(stats, size = 6, percentile = 1) {
      const offset = (percentile * (stats.samples.length - 1)) | 0;

      let min = stats.min;
      const max = stats.samples[offset] || stats.max || 1;

      const steps = new Array(size);
      const bins = new Array(size).fill(0);
      const step = (max - min) / (size - 1);

      if (0 === step) {
        min = 0;
        for (let o = 0; o < size; o++) steps[o] = o * step;
        bins[$.clamp(0, Math.round((stats.avg - min) / step), size - 1)] = 1;
      }

      else {
        for (let o = 0; o < size; o++) steps[o] = min + o * step;
        for (let o = 0; o <= offset; o++) bins[Math.round((stats.samples[o] - min) / step)]++;
      }

      return {
        min, max,
        step, bins, steps,
        peak: $.max(bins),
        outliers: stats.samples.length - 1 - offset,
        avg: $.clamp(0, Math.round((stats.avg - min) / step), size - 1),
      };
    },

    ascii(_bins, height = 1, { colors = true, symbols = $.histogram.symbols } = {}) {
      const canvas = new Array(height);
      const { avg, peak, bins } = _bins;
      const scale = (height * symbols.length - 1) / peak;

      for (let y = 0; y < height; y++) {
        let l = '';

        if (0 !== avg) {
          if (colors) l += $.cyan;

          for (let o = 0; o < avg; o++) {
            const b = bins[o];
            if (y === 0) l += symbols[$.clamp(0, Math.round(b * scale), symbols.length - 1)];

            else {
              const min = y * symbols.length;
              const max = (y + 1) * symbols.length;
              const offset = Math.round(b * scale) | 0;

              if (min >= offset) l += ' ';
              else if (max <= offset) l += symbols[symbols.length - 1];
              else l += symbols[$.clamp(min, offset, max) % symbols.length];
            }
          }

          if (colors) l += $.reset;
        }

        {
          if (colors) l += $.yellow;

          const b = bins[avg];
          if (y === 0) l += symbols[$.clamp(0, Math.round(b * scale), symbols.length - 1)];

          else {
            const min = y * symbols.length;
            const max = (y + 1) * symbols.length;
            const offset = Math.round(b * scale) | 0;

            if (min >= offset) l += ' ';
            else if (max <= offset) l += symbols[symbols.length - 1];
            else l += symbols[$.clamp(min, offset, max) % symbols.length];
          }

          if (colors) l += $.reset;
        }

        if (avg != (bins.length - 1)) {
          if (colors) l += $.magenta;

          for (let o = 1 + avg; o < bins.length; o++) {
            const b = bins[o];
            if (y === 0) l += symbols[$.clamp(0, Math.round(b * scale), symbols.length - 1)];

            else {
              const min = y * symbols.length;
              const max = (y + 1) * symbols.length;
              const offset = Math.round(b * scale) | 0;

              if (min >= offset) l += ' ';
              else if (max <= offset) l += symbols[symbols.length - 1];
              else l += symbols[$.clamp(min, offset, max) % symbols.length];
            }
          }

          if (colors) l += $.reset;
        }

        canvas[y] = l;
      }

      return canvas.reverse();
    },
  },

  boxplot: {
    symbols: {
      v: '│', h: '─',
      tl: '┌', tr: '┐',
      bl: '└', br: '┘',

      avg: {
        top: '┬',
        middle: '│',
        bottom: '┴',
      },

      tail: {
        top: '╷',
        bottom: '╵',
        middle: ['├', '┤'],
      },
    },

    ascii(map, key = 8, size = 14, { fmt = $.time, colors = true, symbols = $.boxplot.symbols } = {}) {
      let tmin = Infinity;
      let tmax = -Infinity;
      const keys = Object.keys(map);
      const canvas = new Array(3 + 3 * keys.length).fill('');

      for (const name of keys) {
        const stats = map[name];
        if (tmin > stats.min) tmin = stats.min;
        const max = stats.p99 || stats.max || 1; if (max > tmax) tmax = max;
      }

      const steps = 2 + size;
      const step = (tmax - tmin) / (steps - 1);

      canvas[0] += ' '.repeat(1 + key);
      canvas[0] += symbols.tl + ' '.repeat(size) + symbols.tr;

      keys.forEach((name, o) => {
        o *= 3;
        const stats = map[name];

        const min = stats.min;
        const avg = stats.avg;
        const p25 = stats.p25;
        const p75 = stats.p75;
        const max = stats.p99 || stats.max || 1;

        // TODO: ????
        const min_offset = 1 + Math.min(steps - 1, Math.round((min - tmin) / step));
        const max_offset = 1 + Math.min(steps - 1, Math.round((max - tmin) / step));
        const avg_offset = 1 + Math.min(steps - 1, Math.round((avg - tmin) / step));
        const p25_offset = 1 + Math.min(steps - 1, Math.round((p25 - tmin) / step));
        const p75_offset = 1 + Math.min(steps - 1, Math.round((p75 - tmin) / step));

        const u = new Array(2 + steps).fill(' ');
        const m = new Array(2 + steps).fill(' ');
        const l = new Array(2 + steps).fill(' ');

        u[0] = !colors ? '' : $.cyan;
        m[0] = !colors ? '' : $.cyan;
        l[0] = !colors ? '' : $.cyan;

        if (min_offset < p25_offset) {
          u[min_offset] = symbols.tail.top;
          l[min_offset] = symbols.tail.bottom;
          m[min_offset] = symbols.tail.middle[0];
          for (let o = 1 + min_offset; o < p25_offset; o++) m[o] = symbols.h;
        }

        if (avg_offset > p25_offset) {
          u[p25_offset] = symbols.tl;
          l[p25_offset] = symbols.bl;
          m[p25_offset] = min_offset === p25_offset ? symbols.v : symbols.tail.middle[1];

          for (let o = 1 + p25_offset; o < avg_offset; o++) u[o] = l[o] = symbols.h;
        }

        u[avg_offset] = !colors ? symbols.avg.top : ($.reset + $.yellow + symbols.avg.top + $.reset + $.magenta);
        l[avg_offset] = !colors ? symbols.avg.bottom : ($.reset + $.yellow + symbols.avg.bottom + $.reset + $.magenta);
        m[avg_offset] = !colors ? symbols.avg.middle : ($.reset + $.yellow + symbols.avg.middle + $.reset + $.magenta);

        if (avg_offset < p75_offset) {
          u[p75_offset] = symbols.tr;
          l[p75_offset] = symbols.br;
          m[p75_offset] = max_offset === p75_offset ? symbols.v : symbols.tail.middle[0];

          for (let o = 1 + avg_offset; o < p75_offset; o++) u[o] = l[o] = symbols.h;
        }

        if (max_offset > p75_offset) {
          u[max_offset] = symbols.tail.top;
          l[max_offset] = symbols.tail.bottom;
          m[max_offset] = symbols.tail.middle[1];
          for (let o = 1 + Math.max(avg_offset, p75_offset); o < max_offset; o++) m[o] = symbols.h;
        }

        canvas[o + 1] = ' '.repeat(1 + key) + u.join('').trimEnd() + (!colors ? '' : $.reset);
        if (colors?.[name]) canvas[o + 2] += colors[name]; canvas[o + 2] += $.str(name, key).padStart(key);

        if (colors?.[name]) canvas[o + 2] += $.reset;
        canvas[o + 2] += ' ' + m.join('').trimEnd() + (!colors ? '' : $.reset);
        canvas[o + 3] = ' '.repeat(1 + key) + l.join('').trimEnd() + (!colors ? '' : $.reset);
      });

      canvas[canvas.length - 2] += ' '.repeat(1 + key);
      canvas[canvas.length - 2] += symbols.bl + ' '.repeat(size) + symbols.br;

      const rmin = fmt(tmin);
      const rmax = fmt(tmax);
      const rmid = fmt((tmin + tmax) / 2);
      const gap = (size - rmin.length - rmid.length - rmax.length) / 2;

      canvas[canvas.length - 1] += ' '.repeat(1 + key);
      canvas[canvas.length - 1] += !colors ? rmin : ($.cyan + rmin + $.reset);

      canvas[canvas.length - 1] += ' '.repeat(1 + gap | 0);
      canvas[canvas.length - 1] += !colors ? rmid : ($.gray + rmid + $.reset);

      canvas[canvas.length - 1] += ' '.repeat(1 + Math.ceil(gap));
      canvas[canvas.length - 1] += !colors ? rmax : ($.magenta + rmax + $.reset); return canvas;
    },
  },
};