import { sync, async } from './lib.mjs';
import * as kleur from '../reporter/clr.mjs';
import * as table from '../reporter/table.mjs';

let g = null;
let ran = false;
const benchmarks = [];
const groups = new Set;
const AsyncFunction = (async () => { }).constructor;

export function group(name, cb) {
  g = name;
  groups.add(name);
  (cb(), g = null);
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
      const fs = await import('fs');

      try {
        const info = new TextDecoder().decode(fs.readFileSync('/proc/cpuinfo')).split('\n');

        for (const line of info) {
          const [key, value] = line.split(':');
          if (/model name|Hardware|Processor|^cpu model|chip type|^cpu type/.test(key)) return value.trim();
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

globalThis.process?.on?.('beforeExit', run);

export async function run(opts = {}) {
  if (ran) return;

  ran = true;
  opts.colors = opts.colors || true;
  const collect = opts.collect || false;
  opts.size = table.size(benchmarks.map(b => b.name));
  console.log(kleur.gray(opts.colors, `cpu: ${await cpu()}`));
  console.log(kleur.gray(opts.colors, `runtime: ${runtime()} ${version()}`.trim() + ` (${os()})`), '\n');

  console.log(table.header(opts)); console.log(table.br(opts));

  b: {
    let _f = false;
    for (const b of benchmarks) {
      if (b.group) continue;

      _f = true;
      try { console.log(table.benchmark(b.name, !b.async ? sync(b.time, b.fn, collect) : await async(b.time, b.fn, collect), opts)); }

      catch (err) { console.log(table.benchmark_error(b.name, err, opts), '\n'); break b; }
    }

    for (const group of groups) {
      if (_f) console.log('');

      _f = true;
      for (const b of benchmarks) {
        if (group !== b.group) continue;
        try { console.log(table.benchmark(b.name, b.stats = !b.async ? sync(b.time, b.fn, collect) : await async(b.time, b.fn, collect), opts)); }

        catch (err) { console.log(table.benchmark_error(b.name, err, opts)); break b; }
      }

      console.log('\n' + table.summary(benchmarks.filter(b => group === b.group), opts));
    }
  }
}