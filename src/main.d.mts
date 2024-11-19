type Gen = Generator<() => any, void, undefined> | AsyncGenerator<() => any, void, undefined>;
type Color = 'red' | 'cyan' | 'white' | 'green' | 'yellow' | 'magenta' | 'blue' | 'black' | 'gray';

export function measure(fn: () => any, opts?: k_options): Promise<stats>;
export function measure(gen: (state: k_statefree) => Gen, opts?: k_options): Promise<stats>;
export function measure(iter: (state: k_iter & k_statefree) => any, opts?: k_options): Promise<stats>;
export function measure<T extends Record<string, any>>(gen: (state: k_statefull<T>) => Gen, opts: k_args<T>): Promise<stats>;
export function measure<T extends Record<string, any>>(iter: (state: k_iter & k_statefull<T>) => any, opts: k_args<T>): Promise<stats>;

interface k_state {
  get(name: string): any;
}

interface k_statefree {
  get(name: string): undefined;
}

interface k_args<T extends Record<string, any>> extends k_options {
  args: T;
}

interface k_statefull<T extends Record<string, any>> {
  get<K extends keyof T>(name: K): T[K];
}

interface k_iter {
  [Symbol.iterator](): Iterator<undefined, void, undefined>;
  [Symbol.asyncIterator](): AsyncIterator<undefined, void, undefined>;
}

interface ctx {
  now: number,
  arch: null | string,
  runtime: null | string,
  noop: { fn: stats, iter: stats },
  cpu: { freq: number; name: null | string; },
}

interface stats {
  debug: string;
  ticks: number;
  samples: number[];
  kind: 'fn' | 'iter' | 'yield';
  min: number; max: number; avg: number; p25: number;
  p50: number; p75: number; p99: number; p999: number;
}

interface k_options {
  now?: () => number;
  min_samples?: number;
  max_samples?: number;
  min_cpu_time?: number;
  batch_unroll?: number;
  batch_samples?: number;
  warmup_samples?: number;
  batch_threshold?: number;
  warmup_threshold?: number;
  samples_threshold?: number;
  gc?: boolean | (() => void);
}

// ---
export function bench(fn: () => any): B;
export function bench(name: string, fn: () => any): B;
export function bench(gen: (state: k_state) => Gen): B;
export function bench(iter: (state: k_iter & k_state) => any): B;
export function bench(name: string, gen: (state: k_state) => Gen): B;
export function bench(name: string, iter: (state: k_iter & k_state) => any): B;

export function group(f: () => any): void;
export function compact(f: () => any): void;
export function summary(f: () => any): void;
export function boxplot(f: () => any): void;
export function barplot(f: () => any): void;
export function lineplot(f: () => any): void;
export function group(f: () => Promise<any>): Promise<void>;
export function compact(f: () => Promise<any>): Promise<void>;
export function summary(f: () => Promise<any>): Promise<void>;
export function boxplot(f: () => Promise<any>): Promise<void>;
export function barplot(f: () => Promise<any>): Promise<void>;

export function run(opts?: { throw?: boolean; filter?: RegExp; colors?: boolean; format?: 'json' | 'quiet' | 'mitata'; }): Promise<{ context: ctx, benchmarks: trial[] }>;

export const flags: {
  compact: number;
  baseline: number;
};

interface trial {
  runs: run[];
  alias: string;
  baseline: boolean;
  args: Record<string, any[]>;
  kind: 'args' | 'static' | 'multi-args';
}

type run = ({
  stats: stats;
  error: undefined;
} | {
  stats: undefined;
  error: Error | { message: string; stack: string; } | unknown;
}) & {
  name: string;
  args: Record<string, any>;
}

export class B {
  constructor(name: string, fn: () => any);
  constructor(name: string, gen: (state: k_state) => Gen);
  constructor(name: string, iter: (state: k_iter & k_state) => any);

  args(values: any[]): this;
  compact(bool?: boolean): this;
  baseline(bool?: boolean): this;
  highlight(color?: Color): this;
  run(thrw?: boolean): Promise<trial>;
  args(map: Record<string, any[]>): this;
  args(name: string, values: any[]): this;
  name(name: string, highlight?: Color): this;
  range(name: string, s: number, e: number, multiplier?: number): this;
  dense_range(name: string, s: number, e: number, accumulator?: number): this;
}