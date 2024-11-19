import { kind, print, measure } from './lib.mjs';

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
  _highlight = false;

  constructor(name, f) {
    this.f = f;
    this.name(name);
    if (!kind(f)) throw new TypeError(`expected iterator, generator or one-shot function`);
  }

  highlight(color = false) {
    return (this._highlight = color, this);
  }

  name(name, highlight = false) {
    return (this._name = name, this._highlight = highlight, this);
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

export function lineplot(f) {
  const old = g_benchmarks;
  const g = g_benchmarks = [];

  g.t = 'l';
  old.push(g);
  const r = f();

  if (!(r instanceof Promise)) g_benchmarks = old;
  else return r.then(() => (g_benchmarks = old, void 0));
}

function* unroll() {
  for (const t of g_benchmarks) if (!t.t) yield t; else yield* t;
}

function version() {
  return ({
    v8: () => globalThis.version?.(),
    bun: () => globalThis.Bun?.version,
    deno: () => globalThis.Deno?.version?.deno,
    node: () => globalThis.process?.versions?.node,
    graaljs: () => globalThis.Graal?.versionGraalVM,
    'quickjs-ng': () => globalThis.navigator?.userAgent?.split?.('/')[1],
    hermes: () => globalThis.HermesInternal?.getRuntimeProperties?.()?.['OSS Release Version'],
  })[runtime()]?.() || null;
}

function runtime() {
  if (globalThis.d8) return 'v8';
  if (globalThis.Graal) return 'graaljs';
  if (globalThis.inIon && globalThis.performance?.mozMemory) return 'spidermonkey';
  if (globalThis.navigator?.userAgent?.toLowerCase?.()?.includes?.('quickjs-ng')) return 'quickjs-ng';
  if (globalThis.$262 && globalThis.lockdown && globalThis.AsyncDisposableStack) return 'XS Moddable';
  if (globalThis.$ && 'IsHTMLDDA' in globalThis.$ && (new Error().stack).startsWith('runtime@')) return 'jsc';

  if (globalThis.os && globalThis.std) return 'quickjs';
  if (globalThis.Bun) return 'bun'; if (globalThis.Deno) return 'deno'; if (globalThis.HermesInternal) return 'hermes';
  if (globalThis.window && globalThis.navigator) return 'browser'; if (globalThis.process) return 'node'; else return null;
}

async function arch() {
  try { let n; if (n = Deno?.build?.target) return n; } catch { }
  try { const os = await import('node:os'); return `${os.arch()}-${os.platform()}`; } catch { }

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

function colors() {
  return globalThis.process?.env?.FORCE_COLOR
    || (
      !globalThis.Deno?.noColor
      && !globalThis.process?.env?.NO_COLOR
      && !globalThis.process?.env?.NODE_DISABLE_COLORS
    );
}

async function cpu() {
  if (globalThis.process?.versions?.webcontainer) return 'webcontainer';
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
  const _cpu = await measure(() => { }, { batch_unroll: 1 });
  const noop_iter = await measure(state => { for (const _ of state); });

  const ctx = {
    now: t,
    arch: await arch(),
    version: version(),
    runtime: runtime(),

    noop: {
      fn: noop,
      iter: noop_iter,
    },

    cpu: {
      name: await cpu(),
      freq: 1 / _cpu.avg,
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
      dim: s => $.gray(s),
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
      colors: ['red', 'cyan', 'white', 'green', 'yellow', 'magenta', 'blue', 'black', 'gray'],

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
        let barplot = '';
        let tmin = Infinity;
        let tmax = -Infinity;
        barplot += ' '.repeat(1 + key) + '┌' + ' '.repeat(size) + '┐' + '\n';

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

          barplot += $.str(name, key).padStart(key) + ' ┤' + $.gray('■').repeat(1 + offset) + ' ' + $.yellow($.time(value)) + ' ' + '\n';
        }

        barplot += ' '.repeat(1 + key) + '└' + ' '.repeat(size) + '┘' + '\n';

        return barplot;
      },

      bins(stats, size = 6, percentile = 1) {
        function clamp(m, v, x) { return v < m ? m : v > x ? x : v; }
        const poffset = (percentile * (stats.samples.length - 1)) | 0;

        const min = stats.min;
        const max = stats.samples[poffset] || stats.max || 1;

        const bins = new Array(size).fill(0);
        const steps = new Array(size).fill(0);
        const step = (max - min) / (size - 1);

        for (let o = 0; o < size; o++) steps[o] = min + o * step;
        for (let o = 0; o < poffset; o++) bins[Math.round((stats.samples[o] - min) / step)]++;

        return {
          min, max,
          step, bins, steps,
          peak: Math.max(...bins),
          outliers: stats.samples.length - 1 - poffset,
          avg: clamp(0, Math.round((stats.avg - min) / step), size - 1),
        };
      },

      histogram(stats, width = 6, height = 2) {
        let histogram = new Array(height);
        const { avg, peak, bins } = $.bins(stats, width, .99);
        const symbols = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
        function clamp(m, v, x) { return v < m ? m : v > x ? x : v; }
        const $min = $.cyan; const $avg = $.yellow; const $max = $.magenta;
        for (let o = 0; o < height; o++) histogram[o] = new Array(width).fill(' ');

        const scale = (height * symbols.length - 1) / peak;

        for (let o = 0; o < bins.length; o++) {
          const b = bins[o];
          let s = Math.round(b * scale);

          for (let h = 0; h < height; h++) {
            const leftover = s - symbols.length;
            histogram[h][o] = symbols[clamp(0, s, symbols.length - 1)]; if (0 >= (s = leftover)) break;
          }
        }

        for (let h = 0; h < height; h++) {
          let l = '';

          { const ll = histogram[h].slice(0, avg); if (ll.length) l += $min(ll.join('')); }

          l += $avg(histogram[h][avg]);
          { const ll = histogram[h].slice(1 + avg); if (ll.length) l += $max(ll.join('')); }

          histogram[h] = l;
        }

        return histogram.reverse();
      },

      lineplot(map, {
        xmin = 0, xmax = 1,
        ymin = 0, ymax = 1,
        width = 12, height = 12, legend = 12,
        labels = { xmin: null, xmax: null, ymin: null, ymax: null },
      } = {}) {
        xmin ??= 0; xmax ??= 1;
        ymin ??= 0; ymax ??= 1;
        const keys = Object.keys(map);
        const canvas = $.braille(width, height);
        const xs = (canvas.vwidth - 1) / (xmax - xmin);
        const ys = (canvas.vheight - 1) / (ymax - ymin);

        for (const name in map) {
          const k = keys.indexOf(name);
          const { x: xp, y: yp } = map[name];

          for (let o = 0; o < (xp.length - 1); o++) {
            if (null == xp[o] || null == xp[o + 1]) continue;
            if (null == yp[o] || null == yp[o + 1]) continue;
            const s = { x: Math.round(xs * (xp[o] - xmin)), y: canvas.vheight - 1 - Math.round(ys * (yp[o] - ymin)) };
            const e = { x: Math.round(xs * (xp[o + 1] - xmin)), y: canvas.vheight - 1 - Math.round(ys * (yp[o + 1] - ymin)) };

            canvas.line(s, e, 1 + (k % $.colors.length));
          }
        }

        let lineplot = '';
        lineplot += ' '.repeat(legend) + ' ' + '┌' + ' '.repeat(canvas.width) + '┐';

        const plot = canvas.toString({
          format(x, y, s, tag) {
            const k = keys[tag - 1];
            if (!map[k].format) return $[$.colors[tag - 1]](s);

            return map[k].format(x, y, s, tag);
          },
        }).split('\n');

        const plabels = { 0: labels.ymax || '', [plot.length - 1]: labels.ymin || '' };
        const legends = keys.map(k => $[$.colors[keys.indexOf(k) % $.colors.length]]($.str(k, legend).padStart(legend)));

        plot.forEach((l, o) => lineplot += '\n' + (legends[o] ?? ' '.repeat(legend)) + '  ' + l + (!plabels[o] ? '' : ` ${plabels[o]}`));

        lineplot += '\n' + ' '.repeat(legend) + ' ' + '└' + ' '.repeat(canvas.width) + '┘';

        if (labels.xmin || labels.xmax) {
          const xmin = (labels.xmin || '').split('');
          const xmax = (labels.xmax || '').split('');
          const line = new Array(1 + 2 + legend + canvas.width).fill(' ');

          line.splice(1 + legend, xmin.length - ('\x1b' !== xmin[0] ? 0 : 10), ...xmin);
          line.splice(line.length - xmax.length + ('\x1b' !== xmax[0] ? 0 : 10), xmax.length - ('\x1b' !== xmax[0] ? 0 : 10), ...xmax);

          lineplot += '\n' + line.join('');
        }

        return lineplot;
      },

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
            format = (s, tag) => s,
          } = {}) {
            let plot = '';

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

                if (c === 0x2800 && !background) plot += ' ';
                else plot += format(x / vwidth, y / vheight, String.fromCharCode(c), buffer[x + y0] || buffer[1 + x + y0] || buffer[x + y1] || buffer[1 + x + y1] || buffer[x + y2] || buffer[1 + x + y2] || buffer[x + y3] || buffer[1 + x + y3]);
              }

              if (y !== vheight - 4) plot += '\n';
            }

            return plot;
          },
        };
      },

      boxplot(map, key = 8, size = 14) {
        let boxplot = '';
        let tmin = Infinity;
        let tmax = -Infinity;
        const steps = 2 + size;
        boxplot += ' '.repeat(1 + key) + '┌' + ' '.repeat(size) + '┐' + '\n';

        for (const name in map) {
          const stats = map[name];
          if (tmin > stats.min) tmin = stats.min;
          if (tmax < stats.p99) tmax = stats.p99 || stats.max || 1;
        }

        const step = (tmax - tmin) / (steps - 1);

        for (const name in map) {
          const stats = map[name];

          const min = stats.min;
          const avg = stats.avg;
          const p25 = stats.p25;
          const p75 = stats.p75;
          const max = stats.p99 || stats.max || 1;

          const min_offset = Math.round((min - tmin) / step);
          const max_offset = Math.round((max - tmin) / step);
          const avg_offset = Math.round((avg - tmin) / step);
          const p25_offset = Math.round((p25 - tmin) / step);
          const p75_offset = Math.round((p75 - tmin) / step);

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

          boxplot +=
            ' '.repeat(1 + key) + u.join('')
            + '\n' + $.str(name, key).padStart(key) + ' '
            + m.join('') + '\n' + ' '.repeat(1 + key) + l.join('') + '\n';
        }

        boxplot += ' '.repeat(1 + key) + '└' + ' '.repeat(size) + '┘' + '\n';

        const rmin = $.time(tmin);
        const rmax = $.time(tmax);
        const rmid = $.time((tmin + tmax) / 2);
        const gap = (size - rmin.length - rmid.length - rmax.length) / 2;
        boxplot += ' '.repeat(1 + key) + `${$.cyan(rmin)}${' '.repeat(gap | 0)} ${$.gray(rmid)} ${' '.repeat(Math.ceil(gap))}${$.magenta(rmax)}`;

        return boxplot;
      },
    };

    print($.gray(`clk: ~${ctx.cpu.freq.toFixed(2)} GHz`));

    print($.gray(`cpu: ${ctx.cpu.name}`));
    print($.gray(`runtime: ${ctx.runtime}${!ctx.version ? '' : ` ${ctx.version}`} (${ctx.arch})`));

    print('');
    print(`benchmark ${' '.repeat(12)} avg (min … max) p75   p99    (min … top 1%)`);

    let optimized_out_warning = false;
    print(`${'-'.repeat(38)} ${'-'.repeat(31)}`);

    function print_run(b, run) {
      const _h = x => $[$.colors[$.colors.indexOf(b._highlight)]]?.(x) ?? x;

      for (const r of run.runs) {
        if (r.error) { print(`${_h($.str(r.name, 23).padEnd(23))} ${$.red('error:')} ${r.error.message ?? r.error}`); continue; }

        const compact = b.flags & flags.compact;
        const noop = 'iter' !== r.stats.kind ? ctx.noop.fn : ctx.noop.iter;

        const optimized_out = r.stats.avg < (1.42 * noop.avg);
        optimized_out_warning = optimized_out_warning || optimized_out;

        if (compact) {
          print(`${_h($.str(r.name, 23).padEnd(23))} ${$.bold($.yellow($.time(r.stats.avg).padStart(9)) + '/iter')} ${$.gray($.time(r.stats.p75).padStart(9) + ' ' + $.time(r.stats.p99).padStart(9))} ${$.histogram(r.stats, 11, 1)}${!optimized_out ? '' : $.red(' !')}`);
        }

        else {
          const histogram = $.histogram(r.stats, 21, 2);
          print(`${_h($.str(r.name, 23).padEnd(23))} ${$.bold($.yellow($.time(r.stats.avg).padStart(9)) + '/iter')} ${$.gray($.time(r.stats.p75).padStart(9))} ${histogram[0]}${!optimized_out ? '' : $.red(' !')}`);

          print(
            ' '.repeat(15)
            + ($.gray('(') + $.cyan($.time(r.stats.min))
              + $.gray(' … ') + $.magenta($.time(r.stats.max)) + $.gray(')')).padStart(23 + (!opts.colors ? 0 : 50))
            + ' ' + $.gray($.time(r.stats.p99).padStart(9)) + ' ' + histogram[1]
          );
        }
      }
    }

    let first = true;
    let prev_group = false;

    for (const g of g_benchmarks) {
      if (!g.t) {
        if (!first && prev_group) {
          print('');
          prev_group = false;
          print($.gray(`${'-'.repeat(38)} ${'-'.repeat(31)}`));
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
              print($.gray(`${'-'.repeat(38)} ${'-'.repeat(31)}`));
            }

            first = false;
          }

          for (const b of filtered) {
            print_run(b, (benchmarks.push(await b.run(opts.throw)), benchmarks[benchmarks.length - 1]));
          }
        }

        if ('l' === g.t) {
          if (filtered.length) {
            if (!first) {
              print('');
              print($.gray(`${'-'.repeat(38)} ${'-'.repeat(31)}`));
            }

            first = false;
            const l_benchmarks = [];

            for (const b of filtered) {
              const run = (benchmarks.push(await b.run(opts.throw)), benchmarks[benchmarks.length - 1]);

              print_run(b, run);
              l_benchmarks.push(run);
            }

            if (1 === l_benchmarks.length) {
              const runs = l_benchmarks[0].runs.filter(r => r.stats);

              if (runs.length) {
                if (1 === runs.length) {
                  const { min, max, avg, peak, bins } = $.bins(runs[0].stats, 44, .99);

                  print('');
                  $.lineplot({
                    [runs[0].name]: {
                      y: bins,
                      x: bins.map((_, o) => o),

                      format(x, y, s, tag) {
                        x = Math.round(x * 44);
                        if (x === avg) return $.yellow(s);
                        if (x < avg) return $.cyan(s); return $.magenta(s);
                      },
                    },
                  }, {
                    xmin: 0,
                    width: 44,
                    ymax: peak,
                    height: 16,
                    legend: 23,
                    xmax: bins.length - 1,
                    ymin: Math.min(...bins),

                    labels: {
                      // ymin: $.yellow(0),
                      // ymax: $.yellow(peak),
                      xmin: $.cyan($.time(min)),
                      xmax: $.magenta($.time(max)),
                    },
                  }).split('\n').forEach(l => print(l));
                }

                else {
                  const ymin = runs.reduce((t, v) => Math.min(t, v.stats.avg), Infinity);
                  const peak = runs.reduce((t, v) => Math.max(t, v.stats.avg), -Infinity);

                  print('');

                  $.lineplot({
                    [l_benchmarks[0].alias]: {
                      y: runs.map(r => r.stats.avg / peak),
                      x: runs.map((_, o) => o / (runs.length - 1)),
                    },
                  }, {
                    width: 44,
                    height: 16,
                    legend: 23,

                    labels: {
                      // xmin: $.yellow(0),
                      // xmax: $.yellow(1),
                      ymin: $.cyan($.time(ymin)),
                      ymax: $.magenta($.time(peak)),
                    },
                  }).split('\n').forEach(l => print(l));
                }
              }
            }

            else {
              const map = {};
              const every_static = l_benchmarks.every(b => b.kind === 'static');

              if (every_static) {
                const runs = l_benchmarks
                  .map(b => b.runs[0])
                  .filter(r => r.stats)
                  .map(r => [r, $.bins(r.stats, 21, .99)]);

                for (const [r, bins] of runs) {
                  map[r.name] = {
                    x: bins.steps,
                    y: bins.bins.map(b => b / bins.peak),
                  };
                }

                const keys = Object.keys(map);

                if (keys.length) {
                  print('');
                  const xmin = keys.reduce((t, k) => Math.min(t, map[k].x.reduce((t, v) => Math.min(t, v), Infinity)), Infinity);
                  const ymin = keys.reduce((t, k) => Math.min(t, map[k].y.reduce((t, v) => Math.min(t, v), Infinity)), Infinity);
                  const xmax = keys.reduce((t, k) => Math.max(t, map[k].x.reduce((t, v) => Math.max(t, v), -Infinity)), -Infinity);
                  const ymax = keys.reduce((t, k) => Math.max(t, map[k].y.reduce((t, v) => Math.max(t, v), -Infinity)), -Infinity);

                  $.lineplot(map, {
                    xmin, xmax,
                    ymin, ymax,
                    width: 44, height: 16, legend: 23,

                    labels: {
                      // ymin: $.yellow(ymin),
                      // ymax: $.yellow(ymax),
                      xmin: $.cyan($.time(xmin)),
                      xmax: $.magenta($.time(xmax)),
                    },
                  }).split('\n').forEach(l => print(l));
                }
              }

              else {
                const peak = l_benchmarks.reduce((t, b) => {
                  return Math.max(t, b.runs.reduce((t, r) => r.error ? t : Math.max(t, r.stats.avg), -Infinity));
                }, -Infinity);

                const bottom = l_benchmarks.reduce((t, b) => {
                  return Math.min(t, b.runs.reduce((t, r) => r.error ? t : Math.min(t, r.stats.avg), Infinity));
                }, Infinity);

                for (const b of l_benchmarks) {
                  const runs = b.runs.filter(r => r.stats);

                  if (!runs.length) continue;

                  if (1 === runs.length) map[b.alias] = {
                    x: [0, 1],
                    y: [runs[0].stats.avg / peak, runs[0].stats.avg / peak],
                  };

                  else map[b.alias] = {
                    y: runs.map(r => r.stats.avg / peak),
                    x: runs.map((_, o) => o / (runs.length - 1)),
                  };
                }

                const keys = Object.keys(map);

                if (keys.length) {
                  print('');
                  const xmin = keys.reduce((t, k) => Math.min(t, map[k].x.reduce((t, v) => Math.min(t, v), Infinity)), Infinity);
                  const ymin = keys.reduce((t, k) => Math.min(t, map[k].y.reduce((t, v) => Math.min(t, v), Infinity)), Infinity);
                  const xmax = keys.reduce((t, k) => Math.max(t, map[k].x.reduce((t, v) => Math.max(t, v), -Infinity)), -Infinity);
                  const ymax = keys.reduce((t, k) => Math.max(t, map[k].y.reduce((t, v) => Math.max(t, v), -Infinity)), -Infinity);

                  $.lineplot(map, {
                    xmin, xmax,
                    ymin, ymax,
                    width: 44, height: 16, legend: 23,

                    labels: {
                      // xmin: $.yellow(xmin),
                      // xmax: $.yellow(xmax),
                      ymin: $.cyan($.time(bottom)),
                      ymax: $.magenta($.time(peak)),
                    },
                  }).split('\n').forEach(l => print(l));
                }
              }
            }
          }
        }

        if ('b' === g.t) {
          if (filtered.length) {
            if (!first) {
              print('');
              print($.gray(`${'-'.repeat(38)} ${'-'.repeat(31)}`));
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
                $.barplot(map, 23, 44).split('\n').forEach(l => print(l));
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
                $.barplot(map, 23, 44).split('\n').forEach(l => print(l));
              }
            }
          }
        }

        if ('x' === g.t) {
          if (filtered.length) {
            if (!first) {
              print('');
              print($.gray(`${'-'.repeat(38)} ${'-'.repeat(31)}`));
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
                $.boxplot(map, 23, 44).split('\n').forEach(l => print(l));
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
                $.boxplot(map, 23, 44).split('\n').forEach(l => print(l));
              }
            }
          }
        }

        if ('s' === g.t) {
          if (filtered.length) {
            if (!first) {
              print('');
              print($.gray(`${'-'.repeat(38)} ${'-'.repeat(31)}`));
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

    if (optimized_out_warning) (print(''), print(`${$.red('!')} ${$.gray('=')} benchmark was likely optimized out ${$.gray('(dead code elimination)')}`));
  },
};