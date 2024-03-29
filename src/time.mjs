import { isDeno } from './runtime.mjs';

const time = (() => {
  const ceil = Math.ceil;

  try {
    Bun.nanoseconds();

    return {
      diff: (a, b) => a - b,
      now: Bun.nanoseconds,
    };
  } catch { }

  try {
    if (isDeno) throw 0;
    process.hrtime.bigint();

    return {
      diff: (a, b) => a - b,
      now: () => Number(process.hrtime.bigint()),
    };
  } catch { }

  try {
    Deno.core.opSync('op_bench_now');

    return {
      diff: (a, b) => a - b,
      now: () => Deno.core.opSync('op_bench_now'),
    };
  } catch { }

  try {
    Deno.core.opSync('op_now');

    return {
      diff: (a, b) => a - b,
      now: () => ceil(1e6 * Deno.core.opSync('op_now')),
    };
  } catch { }

  try {
    $.agent.monotonicNow();

    return {
      diff: (a, b) => a - b,
      now: () => ceil(1e6 * $.agent.monotonicNow()),
    };
  } catch {}

  return {
    diff: (a, b) => a - b,
    now: () => ceil(1e6 * performance.now()),
  };
})();

export const now = time.now;
export const diff = time.diff;