import * as time from './time.mjs';

const now = time.now;
const AsyncFunction = (async () => { }).constructor;
const GeneratorFunction = (function* () { }).constructor;
const AsyncGeneratorFunction = (async function* () { }).constructor;

// doesn't actually support generators yet (1.0.0 feature)
export function measure(fn, ctx, _ = {}) {
  if (!(
    fn instanceof Function
    || fn instanceof AsyncFunction
    || fn instanceof GeneratorFunction
    || fn instanceof AsyncGeneratorFunction
  )) throw new Error('fn must be a function or generator');

  if (!_.spc) {
    const t0 = now();

    _.spc = true;
    const r = fn();
    _.t = now() - t0;
    if (!(r instanceof Promise)) {}
    else return r.then(() => (_.a = true, _.t = now() - t0, measure(fn, ctx, _)));
  }

  _.t ||= 0;
  const warmup = false === ctx.warmup ? false : { samples: ctx.warmup?.samples || 128 };
  const async = _.a || [AsyncFunction, AsyncGeneratorFunction].includes(fn.constructor);
  const generator = [GeneratorFunction, AsyncGeneratorFunction].includes(fn.constructor);

  const b = new (!async ? Function : AsyncFunction)('$fn', '$now', `
    let $w = ${_.t};

    ${!warmup ? '' : (() => {
      if (_.t > 250_000_000) return '';

      return `
        warmup: {
          const samples = new Array(${warmup.samples - 1});

          for (let o = 0; o < ${warmup.samples - 1}; o++) {
            const t0 = $now();
            const t1 = (${!async ? '' : 'await'} $fn(), $now());

            samples[o] = t1 - t0;
          }

          $w = (samples.sort((a, b) => a - b), samples[1]);
        }
      `;
    })()}

    let s = 0;
    let t = 600_000_000;
    let samples = new Array;

    if ($w > 10_000) {
      while (s < t || 10 > samples.length) {
        const t0 = $now();
        const t1 = (${!async ? '' : 'await'} $fn(), $now());

        s += samples[samples.push(t1 - t0) - 1];
      }
    }

    else {
      while (s < t || 128 > samples.length) {
        const t0 = $now();

        for (let o = 0; o < 256; o++) {
          ${`${!async ? '' : 'await'} $fn();\n`.repeat(8)}
        }

        const t1 = $now();

        s += t1 - t0;
        samples.push((t1 - t0) / 2048);
      }
    }

    samples.sort((a, b) => a - b);
    samples = samples.slice(1, -1);

    return {
      // samples,
      min: samples[0],
      max: samples[samples.length - 1],
      p50: samples[(.50 * samples.length) | 0],
      p75: samples[(.75 * samples.length) | 0],
      p99: samples[(.99 * samples.length) | 0],
      p999: samples[(.999 * samples.length) | 0],
      avg: samples.reduce((a, b) => a + b, 0) / samples.length,
    };
  `);

  const stats = b(fn, now);
  return !(stats instanceof Promise)
    ? ({ stats, async, warmup, generator })
    : stats.then(stats => ({ stats, async, warmup, generator }));
}