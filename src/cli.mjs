import { sync, async } from './lib.mjs';
import * as kleur from '../reporter/clr.mjs';
import * as table from '../reporter/table.mjs';

let _gc = 0;
let g = null;
const summaries = {};
const benchmarks = [];
const groups = new Set;
const AsyncFunction = (async () => { }).constructor;

export function group(name, cb) {
  const o = {
    summary: name.summary ?? true,
    name: ('string' === typeof name ? name : name.name) || `$mitata_group${++_gc}`,
  };

  g = o.name;
  groups.add(o.name);
  summaries[g] = o.summary;
  ((cb || name)(), g = null);
}

export function bench(name, fn) {
  if ([Function, AsyncFunction].includes(name.constructor)) (fn = name, name = fn.name);
  if (![Function, AsyncFunction].includes(fn.constructor)) throw new TypeError(`expected function, got ${fn.constructor.name}`);

  benchmarks.push({
    fn,
    name,
    group: g,
    time: 500,
    warmup: true,
    baseline: false,
    async: AsyncFunction === fn.constructor,
  });
};

export function baseline(name, fn) {
  if ([Function, AsyncFunction].includes(name.constructor)) (fn = name, name = fn.name);
  if (![Function, AsyncFunction].includes(fn.constructor)) throw new TypeError(`expected function, got ${fn.constructor.name}`);

  benchmarks.push({
    fn,
    name,
    group: g,
    time: 500,
    warmup: true,
    baseline: true,
    async: AsyncFunction === fn.constructor,
  });
};

let _print;

try {
  _print = console.log;
  if ('function' !== typeof _print) throw 1;
} catch {
  _print = print;
}

function log(...args) {
  _print(...args);
}

function runtime() {
  if ('Bun' in globalThis) return 'bun';
  if ('Deno' in globalThis) return 'deno';
  if ('process' in globalThis) return 'node';
  if ('navigator' in globalThis) return 'browser';

  return 'unknown';
}

function version() {
  return ({
    unknown: () => '',
    browser: () => '',
    node: () => process.version,
    deno: () => Deno.version.deno,
    bun: () => process.versions.bun,
  })[runtime()]();
}

function os() {
  return ({
    unknown: () => 'unknown',
    browser: () => 'unknown',
    deno: () => Deno.build.target,
    bun: () => `${process.arch}-${process.platform}`,
    node: () => `${process.arch}-${process.platform}`,
  })[runtime()]();
}

async function cpu() {
  return await ({
    unknown: () => 'unknown',
    browser: () => 'unknown',
    node: () => import('os').then(x => x.cpus()[0].model),

    bun: async () => {
      try {
        if ('linux' === process.platform) {
          const fs = await import('fs');
          const buf = new Uint8Array(64 * 1024);
          const fd = fs.openSync('/proc/cpuinfo', 'r');
          const info = new TextDecoder().decode(buf.subarray(0, fs.readSync(fd, buf))).trim().split('\n');

          fs.closeSync(fd);

          for (const line of info) {
            const [key, value] = line.split(':');
            if (/model name|Hardware|Processor|^cpu model|chip type|^cpu type/.test(key)) return value.trim();
          }
        }

        if ('darwin' === process.platform) {
          const { ptr, dlopen, CString } = Bun.FFI;

          const sysctlbyname = dlopen('libc.dylib', {
            sysctlbyname: { args: ['ptr', 'ptr', 'ptr', 'ptr', 'isize'], returns: 'isize' },
          }).symbols.sysctlbyname;

          const buf = new Uint8Array(256);
          const len = new BigInt64Array([256n]);
          const cmd = new TextEncoder().encode('machdep.cpu.brand_string\0');
          if (-1 === Number(sysctlbyname(ptr(cmd), ptr(buf), ptr(len), 0, 0))) throw 0;

          return new CString(ptr(buf));
        }
      } catch { }

      return 'unknown';
    },

    deno: async () => {
      try {
        if ('darwin' === Deno.build.os) {
          const p = Deno.run({
            stdin: 'null',
            stderr: 'null',
            stdout: 'piped',
            cmd: ['sysctl', '-n', 'machdep.cpu.brand_string'],
          });

          return Deno.core.decode(await p.output()).trim();
        }

        if ('linux' === Deno.build.os) {
          const info = new TextDecoder().decode(Deno.readFileSync('/proc/cpuinfo')).split('\n');

          for (const line of info) {
            const [key, value] = line.split(':');
            if (/model name|Hardware|Processor|^cpu model|chip type|^cpu type/.test(key)) return value.trim();
          }
        }

        if ('windows' === Deno.build.os) {
          const p = Deno.run({
            stdin: 'null',
            stderr: 'null',
            stdout: 'piped',
            cmd: ['wmic', 'cpu', 'get', 'name'],
          });

          return Deno.core.decode(await p.output()).split('\n').at(-1).trim();
        }
      } catch { }


      return 'unknown';
    },
  })[runtime()]();
}

export async function run(opts = {}) {
  const colors = opts.colors ??= true;
  const collect = opts.collect || false;
  const json = !!opts.json || (0 === opts.json);
  opts.size = table.size(benchmarks.map(b => b.name));

  const report = {
    benchmarks,
    cpu: await cpu(),
    runtime: `${`${runtime()} ${version()}`.trim()} (${os()})`,
  };

  if (!json) {
    log(kleur.gray(colors, `cpu: ${report.cpu}`));
    log(kleur.gray(colors, `runtime: ${report.runtime}`));

    log('');
    log(table.header(opts)), log(table.br(opts));
  }

  b: {
    let _f = false;
    let _b = false;
    for (const b of benchmarks) {
      if (b.group) continue;
      if (b.baseline) _b = true;

      _f = true;

      try {
        b.stats = !b.async ? await sync(b.time, b.fn, collect) : await async(b.time, b.fn, collect);

        if (!json) log(table.benchmark(b.name, b.stats, opts));
      }

      catch (err) {
        b.error = { stack: err.stack, message: err.message };
        if (!json) log(table.benchmark_error(b.name, err, opts));
      }
    }

    if (_b && !json) log('\n' + table.summary(benchmarks.filter(b => null === b.group), opts));

    for (const group of groups) {
      if (!json) {
        if (_f) log('');
        if (!group.startsWith('$mitata_group')) log(`• ${group}`);
        if (_f || !group.startsWith('$mitata_group')) log(kleur.gray(colors, table.br(opts)));
      }

      _f = true;
      for (const b of benchmarks) {
        if (group !== b.group) continue;

        try {
          b.stats = !b.async ? await sync(b.time, b.fn, collect) : await async(b.time, b.fn, collect);

          if (!json) log(table.benchmark(b.name, b.stats, opts));
        }

        catch (err) {
          b.error = { stack: err.stack, message: err.message };
          if (!json) log(table.benchmark_error(b.name, err, opts));
        }
      }

      if (summaries[group] && !json) log('\n' + table.summary(benchmarks.filter(b => group === b.group), opts));
    }

    if (json) log(JSON.stringify(report, null, 'number' !== typeof opts.json ? 0 : opts.json));

    return report;
  }
}