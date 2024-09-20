import { kind, measure } from './lib.mjs';

let g_flags = 0;
export { measure };
let g_benchmarks = [];

export const flags = {
  compact: 1 << 0,
  baseline: 1 << 1,
};

export class B {
  _args = {};
  _name = '';
  f = () => { };
  flags = g_flags;

  constructor(name, f) {
    this.f = f;
    this.name(name);
    if (!kind(f)) throw new TypeError(`expected iterator, generator or one-shot function`);
  }

  name(name) {
    return (this._name = name, this);
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

  async run(thrw = false) {
    const args = Object.keys(this._args);
    const kind = 0 === args.length ? 'static' : (1 === args.length ? 'args' : 'multi-args');

    if (kind === 'static') {
      let stats, error;
      try { stats = await measure(this.f); }
      catch (err) { error = err; if (thrw) throw err; }

      return {
        kind,
        args: this._args,
        alias: this._name,
        baseline: !!(this.flags & flags.baseline),

        runs: [{
          stats, error,
          args: {}, name: this._name,
        }],
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
          for (let oo = 0; oo < args.length; oo++) _name = _name.replace(`\$${args[oo]}`, _args[args[oo]]);
          try { stats = await measure(this.f, { args: _args }); } catch (err) { error = err; if (thrw) throw err; }

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
        baseline: !!(this.flags & flags.baseline),
      };
    }
  }
}

export function bench(n, fn) {
  if (typeof n === 'function') (fn = n, n = fn.name || 'anonymous');
  return (g_benchmarks.push(new B(n, fn)), g_benchmarks[g_benchmarks.length - 1]);
}

export function compact(f) {
  const old = g_flags;
  g_flags |= flags.compact;

  const r = f();
  if (!(r instanceof Promise)) g_flags = old;
  else return r.then(() => (g_flags = old, void 0));
}

export function group(f) {
  const old = g_benchmarks;
  const g = g_benchmarks = [];

  g.t = 'g';
  old.push(g);
  const r = f();

  if (!(r instanceof Promise)) g_benchmarks = old;
  else return r.then(() => (g_benchmarks = old, void 0));
}

export function boxplot(f) {
  const old = g_benchmarks;
  const g = g_benchmarks = [];

  g.t = 'x';
  old.push(g);
  const r = f();

  if (!(r instanceof Promise)) g_benchmarks = old;
  else return r.then(() => (g_benchmarks = old, void 0));
}

export function barplot(f) {
  const old = g_benchmarks;
  const g = g_benchmarks = [];

  g.t = 'b';
  old.push(g);
  const r = f();

  if (!(r instanceof Promise)) g_benchmarks = old;
  else return r.then(() => (g_benchmarks = old, void 0));
}

export function summary(f) {
  const old = g_benchmarks;
  const g = g_benchmarks = [];

  g.t = 's';
  old.push(g);
  const r = f();

  if (!(r instanceof Promise)) g_benchmarks = old;
  else return r.then(() => (g_benchmarks = old, void 0));
}

// export function lineplot(f) {
//   const old = g_benchmarks;
//   const g = g_benchmarks = [];

//   g.t = 'l';
//   old.push(g);
//   const r = f();

//   if (!(r instanceof Promise)) g_benchmarks = old;
//   else return r.then(() => (g_benchmarks = old, void 0));
// }

function* unroll() {
  for (const t of g_benchmarks) if (!t.t) yield t; else yield* t;
}

function runtime() {
  if (globalThis.Bun) return 'bun'; if (globalThis.Deno) return 'deno';
  if (globalThis.window && globalThis.navigator) return 'browser'; if (globalThis.process) return 'node'; else return 'unknown';
}

async function arch() {
  try { let n; if (n = Deno?.build?.target) return n; } catch { }
  try { const os = await import('node:os'); return `${os.arch()}-${os.platform()}`; } catch { }

  return null;
}

let print = (() => {
  try { if (typeof print === 'function') return print; } catch { }
  try { if (typeof console === 'object') return console.log; } catch { }

  return () => { throw new Error('no print function available'); };
})();

function colors() {
  return globalThis.process?.env?.FORCE_COLOR
    || (
      !globalThis.Deno?.noColor
      && !globalThis.process?.env?.NO_COLOR
      && !globalThis.process?.env?.NODE_DISABLE_COLORS
    );
}

async function cpu() {
  try { let n; if (n = require('os')?.cpus?.()?.[0]?.model) return n; } catch { }
  try { let n; if (n = require('node:os')?.cpus?.()?.[0]?.model) return n; } catch { }
  try { let n; if (n = (await import('node:os'))?.cpus?.()?.[0]?.model) return n; } catch { }

  return null;
}

function defaults(opts) {
  opts.throw ??= false;
  opts.filter ??= /.*/;
  opts.format ??= 'mitata';
  opts.colors ??= colors();
}

export async function run(opts = {}) {
  defaults(opts);
  const t = Date.now();
  const benchmarks = [];
  const noop = await measure(() => { });
  const noop_iter = await measure(state => { for (const _ of state); });

  const ctx = {
    now: t,
    arch: await arch(),
    runtime: runtime(),

    noop: {
      fn: noop,
      iter: noop_iter,
    },

    cpu: {
      name: await cpu(),
      freq: 1 / noop.avg,
    },
  };

  await formats[opts.format](ctx, opts, benchmarks);

  return (g_benchmarks = [], {
    benchmarks,
    context: ctx,
  });
}

const formats = {
  async quiet(ctx, opts, benchmarks) {
    for (const b of unroll()) {
      if (opts.filter.test(b._name)) benchmarks.push(await b.run(opts.throw));
    }
  },

  async json(ctx, opts, benchmarks) {
    for (const b of unroll()) {
      if (opts.filter.test(b._name)) benchmarks.push(await b.run(opts.throw));
    }

    print(JSON.stringify({
      benchmarks,
      context: ctx,
    },
      (_, v) => {
        if (!(v instanceof Error)) return v;
        return { message: String(v.message), stack: v.stack };
      }, 0));
  },

  async mitata(ctx, opts, benchmarks) {
    const $ = {
      dim: s => !opts.colors ? s : `\x1b[2m${s}\x1b[22m`,
      bold: s => !opts.colors ? s : `\x1b[1m${s}\x1b[22m`,

      red: s => !opts.colors ? s : `\x1b[31m${s}\x1b[39m`,
      cyan: s => !opts.colors ? s : `\x1b[36m${s}\x1b[39m`,
      blue: s => !opts.colors ? s : `\x1b[34m${s}\x1b[39m`,
      gray: s => !opts.colors ? s : `\x1b[90m${s}\x1b[39m`,
      white: s => !opts.colors ? s : `\x1b[37m${s}\x1b[39m`,
      black: s => !opts.colors ? s : `\x1b[30m${s}\x1b[39m`,
      green: s => !opts.colors ? s : `\x1b[32m${s}\x1b[39m`,
      yellow: s => !opts.colors ? s : `\x1b[33m${s}\x1b[39m`,
      magenta: s => !opts.colors ? s : `\x1b[35m${s}\x1b[39m`,

      str(s, len = 3) {
        if (len >= s.length) return s;
        return `${s.slice(0, len - 2)}..`;
      },

      time(ns) {
        if (ns < 1e0) return `${(ns * 1e3).toFixed(2)} ps`;
        if (ns < 1e3) return `${ns.toFixed(2)} ns`; ns /= 1000;
        if (ns < 1e3) return `${ns.toFixed(2)} µs`; ns /= 1000;
        if (ns < 1e3) return `${ns.toFixed(2)} ms`; ns /= 1000;

        if (ns < 1e3) return `${ns.toFixed(2)} s`; ns /= 60;
        if (ns < 1e3) return `${ns.toFixed(2)} m`; ns /= 60; return `${ns.toFixed(2)} h`;
      },

      barplot(map, key = 8, size = 14) {
        let bar = '';
        let tmin = Infinity;
        let tmax = -Infinity;
        bar += ' '.repeat(1 + key) + '┌' + ' '.repeat(size) + '┐' + '\n';

        for (const name in map) {
          const value = map[name];
          if (tmin > value) tmin = value;
          if (tmax < value) tmax = value;
        }

        const steps = size - 10;
        const step = (tmax - tmin) / steps;

        for (const name in map) {
          let offset = 0;
          const value = map[name];

          for (let o = 0; o < steps; o++) {
            const t = tmin + o * step;
            if (t <= value) offset = o;
          }

          bar += $.str(name, key).padStart(key) + ' ┤' + $.dim('■').repeat(1 + offset) + ' ' + $.yellow($.time(value)) + ' ' + '\n';
        }

        bar += ' '.repeat(1 + key) + '└' + ' '.repeat(size) + '┘' + '\n';

        return bar;
      },

      histogram(stats, size = 8, compact = false) {
        const bins = new Array(size).fill(0);
        const symbols = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
        function clamp(m, v, x) { return v < m ? m : v > x ? x : v; }
        const samples = stats.samples.slice(0, (.99 * stats.samples.length) | 0);

        const $min = $.cyan;
        const $avg = $.yellow;
        const $max = $.magenta;

        let last = 0;
        const ravg = stats.avg;
        const min = samples[0];
        const max = samples[samples.length - 1];

        const width = (max - min) / (size - 1);
        for (const s of samples) bins[clamp(0, Math.round((s - min) / width), size - 1)]++;
        for (let o = (.99 * stats.samples.length) | 0; o < stats.samples.length; o++) last++;

        const peak = Math.max(...bins);
        const avg_offset = clamp(0, Math.round((ravg - min) / width), size - 1);

        let histogram = '';
        const scale = (symbols.length - 1) / peak;

        for (let o = 0; o < size; o++) {
          const c = bins[o];
          bins[o] = symbols[(c * scale) | 0];
          if (c === 0) bins[o] = $.dim(bins[o]);
        }

        if (0 !== avg_offset) histogram += $min(bins.slice(0, avg_offset).join(''));

        histogram += $avg(bins[avg_offset]);
        if ((size - 1) !== avg_offset) histogram += $max(bins.slice(1 + avg_offset).join(''));
        if (!compact) histogram += ' ' + $.dim($.magenta(symbols[Math.min((last * scale) | 0, symbols.length - 1)]));

        return histogram;
      },

      boxplot(map, key = 8, size = 14) {
        let box = '';
        let tmin = Infinity;
        let tmax = -Infinity;
        const steps = 2 + size;
        box += ' '.repeat(1 + key) + '┌' + ' '.repeat(size) + '┐' + '\n';

        for (const name in map) {
          const stats = map[name];
          if (tmin > stats.min) tmin = stats.min;
          if (tmax < stats.p99) tmax = stats.p99;
        }

        const step = (tmax - tmin) / steps;

        for (const name in map) {
          const stats = map[name];

          const min = stats.min;
          const avg = stats.avg;
          const max = stats.p99;
          const p25 = stats.p25;
          const p75 = stats.p75;

          let min_offset = 0;
          let max_offset = 0;
          let avg_offset = 0;
          let p25_offset = 0;
          let p75_offset = 0;

          for (let o = 0; o < steps; o++) {
            const t = tmin + o * step;
            if (t <= min) min_offset = o;
            if (t <= max) max_offset = o;
            if (t <= avg) avg_offset = o;
            if (t <= p25) p25_offset = o;
            if (t <= p75) p75_offset = o;
          }

          const u = new Array(1 + max_offset).fill(' ');
          const m = new Array(1 + max_offset).fill(' ');
          const l = new Array(1 + max_offset).fill(' ');

          if (min_offset < p25_offset) {
            u[min_offset] = $.cyan('╷');
            m[min_offset] = $.cyan('├');
            l[min_offset] = $.cyan('╵');
            for (let o = 1 + min_offset; o < p25_offset; o++) m[o] = $.cyan('─');
          }

          if (p25_offset < avg_offset) {
            u[p25_offset] = $.cyan('┌');
            l[p25_offset] = $.cyan('└');
            m[p25_offset] = $.cyan(min_offset === p25_offset ? '│' : '┤');
            for (let o = 1 + p25_offset; o < avg_offset; o++) u[o] = l[o] = $.cyan('─');
          }

          u[avg_offset] = $.yellow('┬');
          m[avg_offset] = $.yellow('│');
          l[avg_offset] = $.yellow('┴');

          if (p75_offset > avg_offset) {
            u[p75_offset] = $.magenta('┐');
            l[p75_offset] = $.magenta('┘');
            m[p75_offset] = $.magenta(max_offset === p75_offset ? '│' : '├');
            for (let o = 1 + avg_offset; o < p75_offset; o++) u[o] = l[o] = $.magenta('─');
          }

          if (max_offset > p75_offset) {
            u[max_offset] = $.magenta('╷');
            m[max_offset] = $.magenta('┤');
            l[max_offset] = $.magenta('╵');
            for (let o = 1 + Math.max(avg_offset, p75_offset); o < max_offset; o++) m[o] = $.magenta('─');
          }

          box +=
            ' '.repeat(1 + key) + u.join('')
            + '\n' + $.str(name, key).padStart(key) + ' '
            + m.join('') + '\n' + ' '.repeat(1 + key) + l.join('') + '\n';
        }

        box += ' '.repeat(1 + key) + '└' + ' '.repeat(size) + '┘' + '\n';

        const rmin = $.time(tmin);
        const rmax = $.time(tmax);
        const rmid = $.time((tmin + tmax) / 2);
        const gap = (size - rmin.length - rmid.length - rmax.length) / 2;
        box += ' '.repeat(1 + key) + `${$.dim(rmin)}${' '.repeat(gap | 0)} ${$.dim(rmid)} ${' '.repeat(Math.ceil(gap))}${$.dim(rmax)}`;

        return box;
      },
    };

    print($.dim(`clk: ~${ctx.cpu.freq.toFixed(2)} GHz`));

    print($.dim(`cpu: ${ctx.cpu.name}`));
    print($.dim(`runtime: ${ctx.runtime} (${ctx.arch})`));

    print('');
    print(' '.repeat(42) + $.dim('histogram: (min … top 1%)'));
    print(`benchmark ${' '.repeat(12)} avg (min … max) ${' '.repeat(5)} p75 ${' '.repeat(6)} p99 ${' '.repeat(5)} p999`);

    let optimized_out_warning = false;
    print(`${'-'.repeat(38)} ${'-'.repeat(31)}`);

    function print_run(b, run) {
      for (const r of run.runs) {
        if (r.error) { print(`${$.str(r.name, 23).padEnd(23)} ${$.red('error:')} ${r.error.message ?? r.error}`); continue; }

        const compact = b.flags & flags.compact;
        const noop = 'iter' !== r.stats.kind ? ctx.noop.fn : ctx.noop.iter;

        const optimized_out = r.stats.avg < (1.21 * noop.avg);
        optimized_out_warning = optimized_out_warning || optimized_out;
        if (!compact) print(`${$.str(r.name, 23).padEnd(23)} ${$.bold($.yellow($.time(r.stats.avg).padStart(9)) + '/iter')} ${$.histogram(r.stats, 31, optimized_out)}${!optimized_out ? '' : $.red(' !')}`);
        else print(`${$.str(r.name, 23).padEnd(23)} ${$.bold($.yellow($.time(r.stats.avg).padStart(9)) + '/iter')} ${$.dim($.time(r.stats.p75).padStart(9) + '  ' + $.time(r.stats.p99).padStart(9) + '  ' + $.time(r.stats.p999).padStart(9))} ${optimized_out ? $.red('!') : $.histogram(r.stats, 9, true)}`);

        if (!compact) print(
          ' '.repeat(15)
          + ($.dim('(') + $.cyan($.time(r.stats.min))
            + $.dim(' … ') + $.magenta($.time(r.stats.max)) + $.dim(')')).padStart(23 + (!opts.colors ? 0 : 47))
          + ' ' + $.dim($.time(r.stats.p75).padStart(9) + '  ' + $.time(r.stats.p99).padStart(9) + '  ' + $.time(r.stats.p999).padStart(9)) + (optimized_out ? '' : $.dim(' <'))
        );
      }
    }

    let first = true;
    let prev_group = false;

    for (const g of g_benchmarks) {
      if (!g.t) {
        if (!first && prev_group) {
          print('');
          prev_group = false;
          print($.dim(`${'-'.repeat(38)} ${'-'.repeat(31)}`));
        };

        if (!opts.filter.test(g._name)) continue;

        first = false;
        print_run(g, (benchmarks.push(await g.run(opts.throw)), benchmarks[benchmarks.length - 1]));
      }

      else {
        prev_group = true;
        const filtered = g.filter(b => opts.filter.test(b._name));

        if ('g' === g.t) {
          if (filtered.length) {
            if (!first) {
              print('');
              print($.dim(`${'-'.repeat(38)} ${'-'.repeat(31)}`));
            }

            first = false;
          }

          for (const b of filtered) {
            print_run(b, (benchmarks.push(await b.run(opts.throw)), benchmarks[benchmarks.length - 1]));
          }
        }

        if ('b' === g.t) {
          if (filtered.length) {
            if (!first) {
              print('');
              print($.dim(`${'-'.repeat(38)} ${'-'.repeat(31)}`));
            }

            first = false;
            const b_benchmarks = [];

            for (const b of filtered) {
              const run = (benchmarks.push(await b.run(opts.throw)), benchmarks[benchmarks.length - 1]);

              print_run(b, run);
              b_benchmarks.push(run);
            }

            if (1 === b_benchmarks.length) {
              const runs = b_benchmarks[0].runs.filter(r => r.stats);

              if (runs.length) {
                print('');
                const map = {};
                for (const r of runs) map[r.name] = r.stats.avg;
                $.barplot(map, 23, 46).split('\n').forEach(l => print(l));
              }
            }

            else {
              const map = {};
              for (const b of b_benchmarks) {
                const runs = b.runs.filter(r => r.stats);
                for (const r of runs) map[r.name] = r.stats.avg;
              }

              if (Object.keys(map).length) {
                print('');
                $.barplot(map, 23, 46).split('\n').forEach(l => print(l));
              }
            }
          }
        }

        if ('x' === g.t) {
          if (filtered.length) {
            if (!first) {
              print('');
              print($.dim(`${'-'.repeat(38)} ${'-'.repeat(31)}`));
            }

            first = false;
            const x_benchmarks = [];

            for (const b of filtered) {
              const run = (benchmarks.push(await b.run(opts.throw)), benchmarks[benchmarks.length - 1]);

              print_run(b, run);
              x_benchmarks.push(run);
            }

            if (1 === x_benchmarks.length) {
              const runs = x_benchmarks[0].runs.filter(r => r.stats);

              if (runs.length) {
                print('');
                const map = {};
                for (const r of runs) map[r.name] = r.stats;
                $.boxplot(map, 23, 46).split('\n').forEach(l => print(l));
              }
            }

            else {
              const map = {};
              for (const b of x_benchmarks) {
                const runs = b.runs.filter(r => r.stats);

                if (!runs.length) continue;
                if (1 === runs.length) map[runs[0].name] = runs[0].stats;

                else {
                  const stats = {
                    avg: 0,
                    p25: Infinity,
                    min: Infinity,
                    p75: -Infinity,
                    p99: -Infinity,
                  };

                  for (let o = 0; o < runs.length; o++) {
                    const r = runs[o];
                    stats.avg += r.stats.avg;
                    stats.p25 = Math.min(stats.p25, r.stats.p25);
                    stats.p75 = Math.max(stats.p75, r.stats.p75);
                    stats.p99 = Math.max(stats.p99, r.stats.p99);
                    stats.min = Math.min(stats.min, r.stats.min);
                  }

                  map[b.alias] = stats;
                  stats.avg /= runs.length;
                }
              }

              if (Object.keys(map).length) {
                print('');
                $.boxplot(map, 23, 46).split('\n').forEach(l => print(l));
              }
            }
          }
        }

        if ('s' === g.t) {
          if (filtered.length) {
            if (!first) {
              print('');
              print($.dim(`${'-'.repeat(38)} ${'-'.repeat(31)}`));
            }

            first = false;
            const s_benchmarks = [];

            for (const b of filtered) {
              const run = (benchmarks.push(await b.run(opts.throw)), benchmarks[benchmarks.length - 1]);

              print_run(b, run);
              s_benchmarks.push(run);
            }

            s_benchmarks.sort((a, b) => {
              const aa = a.runs.filter(r => r.stats);
              const bb = b.runs.filter(r => r.stats);

              if (0 === aa.length) return 1;
              if (0 === bb.length) return -1;
              if (1 === aa.length && 1 === bb.length) return aa[0].stats.avg - bb[0].stats.avg;

              const a_avg = aa.reduce((a, r) => a + r.stats.avg, 0) / aa.length;
              const b_avg = bb.reduce((a, r) => a + r.stats.avg, 0) / bb.length;

              return a_avg - b_avg;
            });

            if (1 === s_benchmarks.length) {
              const runs = s_benchmarks[0].runs.filter(r => r.stats).sort((a, b) => a.stats.avg - b.stats.avg);

              if (1 < runs.length) {
                print('');
                print($.bold('summary'));
                print('  ' + $.bold($.cyan(runs[0].name)));

                for (let o = 1; o < runs.length; o++) {
                  const r = runs[o];
                  const br = runs[0];

                  const faster = r.stats.avg >= br.stats.avg;

                  const diff = !faster
                    ? Number((1 / r.stats.avg * br.stats.avg).toFixed(2))
                    : Number((1 / br.stats.avg * r.stats.avg).toFixed(2));

                  print('   ' + `${faster ? $.green(diff) : $.red(diff)}x ${faster ? 'faster' : 'slower'} than ${$.bold($.cyan(r.name))}`);
                }
              }
            }

            else {
              const baseline = s_benchmarks.find(b => b.baseline && b.runs.some(r => r.stats)) || s_benchmarks[0];

              if (baseline) {
                let print_baseline = false;
                const bruns = baseline.runs.filter(r => !r.error).sort((a, b) => a.stats.avg - b.stats.avg);

                if (bruns.length) for (const b of s_benchmarks) {
                  if (b === baseline) continue;
                  const runs = b.runs.filter(r => !r.error);

                  if (!runs.length) continue;

                  if (!print_baseline) {
                    print('');
                    print_baseline = true;
                    print($.bold('summary'));
                    print('  ' + $.bold($.cyan(baseline.alias)));
                  }

                  runs.sort((a, b) => a.stats.avg - b.stats.avg);

                  if (1 === runs.length && 1 === bruns.length) {
                    const r = runs[0];
                    const br = bruns[0];
                    const faster = r.stats.avg >= br.stats.avg;

                    const diff = !faster
                      ? Number((1 / r.stats.avg * br.stats.avg).toFixed(2))
                      : Number((1 / br.stats.avg * r.stats.avg).toFixed(2));

                    print('   ' + `${faster ? $.green(diff) : $.red(diff)}x ${faster ? 'faster' : 'slower'} than ${$.bold($.cyan(b.alias))}`);
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

                    print('   ' + `${sfaster ? $.green(sdiff) : $.red(sdiff)}…${ffaster ? $.green(fdiff) : $.red(fdiff)}x ${faster ? 'faster' : 'slower'} than ${$.bold($.cyan(b.alias))}`);
                  }
                }
              }
            }
          }
        }
      }
    }

    if (optimized_out_warning) (print(''), print(`${$.red('!')} ${$.dim('=')} benchmark was likely optimized out ${$.dim('(dead code elimination)')}`));
  },
};