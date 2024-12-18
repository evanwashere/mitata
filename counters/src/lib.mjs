import os from 'node:os';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

let lib = null;

if (!globalThis.Bun) {
  const require = createRequire(import.meta.url);
  lib = require(`../dist/${os.arch()}-${os.platform()}.node`);
} else {
  const { dlopen, CString } = globalThis.Bun.FFI;
  const path = new URL(`../dist/${os.arch()}-${os.platform()}.node`, import.meta.url);

  const _lib = dlopen(path.pathname, {
    libcounters_load: { args: [], returns: 'i32' },
    libcounters_init: { args: [], returns: 'i32' },
    libcounters_after: { args: [], returns: 'i32' },
    libcounters_deinit: { args: [], returns: 'i32' },
    libcounters_before: { args: [], returns: 'i32' },
    libcounters_translate: { args: [], returns: 'i32' },

    libcounters_translate_len: { args: [], returns: 'u32' },
    libcounters_translate_ptr: { args: [], returns: 'ptr' },
    libcounters_translate_free: { args: [], returns: 'void' },
  });

  lib = {
    load() {
      if (_lib.symbols.libcounters_load()) throw new Error('failed to load libcounters');
    },

    init() {
      if (_lib.symbols.libcounters_init()) throw new Error('failed to init libcounters');
    },

    after() {
      if (_lib.symbols.libcounters_after()) throw new Error('failed to after libcounters');
    },

    deinit() {
      if (_lib.symbols.libcounters_deinit()) throw new Error('failed to deinit libcounters');
    },

    before() {
      if (_lib.symbols.libcounters_before()) throw new Error('failed to before libcounters');
    },

    translate() {
      if (_lib.symbols.libcounters_translate()) throw new Error('failed to translate libcounters');

      const len = _lib.symbols.libcounters_translate_len();
      const ptr = _lib.symbols.libcounters_translate_ptr();

      const json = JSON.parse(new CString(ptr, 0, len));
      return (_lib.symbols.libcounters_translate_free(), json);
    },
  };
}

lib.load();

if ('darwin' === os.platform()) {
  const cwd = import.meta.url.replace('file://', '').replace('/lib.mjs', '');

  const paths = [
    'xctrace',
    '/Applications/Xcode.app/Contents/Developer/usr/bin/xctrace',
    '/Applications/Xcode-beta.app/Contents/Developer/usr/bin/xctrace',
  ];

  const args = [
    'record',
    '--output', '/tmp',
    '--template', '../dist/l1cache.template',
    '--launch', '--', '/bin/echo', 'cpu counters',
  ];

  for (const path of paths) {
    try {
      if (globalThis.Bun) {
        const r = Bun.spawnSync([path, ...args], {
          cwd,
          stdin: null,
          stdout: null,
          stderr: null,
        });

        if (r.success) break;
      }

      else {
        const r = spawnSync(path, args, {
          cwd,
          stdio: 'ignore',
        });

        if (0 === r.status) break;
      }
    } catch { }
  }
}

export function init() { lib.init(); }
export function deinit() { lib.deinit(); }

export function after() { lib.after(); }
export function before() { lib.before(); }

export function translate(batch = 1, samples = 1) {
  if ('darwin' === os.platform()) {
    const events = lib.translate();

    const cycles = {
      min: events.FIXED_CYCLES.min / batch,
      max: events.FIXED_CYCLES.max / batch,
      avg: events.FIXED_CYCLES.total / batch / samples,

      stalls: {
        min: events.MAP_STALL.min / batch,
        max: events.MAP_STALL.max / batch,
        avg: events.MAP_STALL.total / batch / samples,
      },
    };

    const branches = !events.INST_BRANCH ? null : {
      min: events.INST_BRANCH.min / batch,
      max: events.INST_BRANCH.max / batch,
      avg: events.INST_BRANCH.total / batch / samples,

      mispredicted: {
        min: events.BRANCH_MISPRED_NONSPEC.min / batch,
        max: events.BRANCH_MISPRED_NONSPEC.max / batch,
        avg: events.BRANCH_MISPRED_NONSPEC.total / batch / samples,
      },
    };

    const instructions = {
      min: events.FIXED_INSTRUCTIONS.min / batch,
      max: events.FIXED_INSTRUCTIONS.max / batch,
      avg: events.FIXED_INSTRUCTIONS.total / batch / samples,

      loads_and_stores: !events.INST_LDST ? null : {
        min: events.INST_LDST.min / batch,
        max: events.INST_LDST.max / batch,
        avg: events.INST_LDST.total / batch / samples,
      },
    };

    const l1 = {
      miss_loads: !events.L1D_CACHE_MISS_LD_NONSPEC ? null : {
        min: events.L1D_CACHE_MISS_LD_NONSPEC.min / batch,
        max: events.L1D_CACHE_MISS_LD_NONSPEC.max / batch,
        avg: events.L1D_CACHE_MISS_LD_NONSPEC.total / batch / samples,
      },

      miss_stores: !events.L1D_CACHE_MISS_ST_NONSPEC ? null : {
        min: events.L1D_CACHE_MISS_ST_NONSPEC.min / batch,
        max: events.L1D_CACHE_MISS_ST_NONSPEC.max / batch,
        avg: events.L1D_CACHE_MISS_ST_NONSPEC.total / batch / samples,
      },
    };

    return {
      l1,
      cycles,
      branches,
      instructions,
    };
  }

  if ('linux' === os.platform()) {
    const events = lib.translate();

    const cycles = {
      min: events.CPU_CYCLES.min / batch,
      max: events.CPU_CYCLES.max / batch,
      avg: events.CPU_CYCLES.total / batch / samples,
    };

    const instructions = {
      min: events.INSTRUCTIONS.min / batch,
      max: events.INSTRUCTIONS.max / batch,
      avg: events.INSTRUCTIONS.total / batch / samples,
    };

    const _bmispred = !events.BRANCH_MISSES ? null : {
      min: events.BRANCH_MISSES.min / batch,
      max: events.BRANCH_MISSES.max / batch,
      avg: events.BRANCH_MISSES.total / batch / samples,
    };

    const branches = !events.BRANCH_INSTRUCTIONS ? null : {
      mispredicted: _bmispred,
      min: events.BRANCH_INSTRUCTIONS.min / batch,
      max: events.BRANCH_INSTRUCTIONS.max / batch,
      avg: events.BRANCH_INSTRUCTIONS.total / batch / samples,
    };

    const cache = !events.CACHE_REFERENCES ? null : {
      min: events.CACHE_REFERENCES.min / batch,
      max: events.CACHE_REFERENCES.max / batch,
      avg: events.CACHE_REFERENCES.total / batch / samples,

      misses: !events.CACHE_MISSES ? null : {
        min: events.CACHE_MISSES.min / batch,
        max: events.CACHE_MISSES.max / batch,
        avg: events.CACHE_MISSES.total / batch / samples,
      },
    };

    return {
      cache,
      cycles,
      branches,
      _bmispred,
      instructions,
    };
  }
}