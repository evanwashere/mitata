type Gen = Generator<() => any, void, undefined> | AsyncGenerator<() => any, void, undefined>;

export function gc(): void;
export function now(): number;
export function print(line: string): void;
export function do_not_optimize(v: any): void;
export function fn(fn: () => any, opts?: k_options): Promise<stats>;
export function kind(fn: Function): 'fn' | 'iter' | 'yield' | undefined;
export function generator(gen: (state: k_statefree) => Gen, opts?: k_options): Promise<stats>;
export function iter(iter: (state: k_iter & k_statefree) => any, opts?: k_options): Promise<stats>;
export function generator<T extends Record<string, any>>(gen: (state: k_statefull<T>) => Gen, opts: k_args<T>): Promise<stats>;
export function iter<T extends Record<string, any>>(iter: (state: k_iter & k_statefull<T>) => any, opts: k_args<T>): Promise<stats>;

export function measure(fn: () => any, opts?: k_options): Promise<stats>;
export function measure(gen: (state: k_statefree) => Gen, opts?: k_options): Promise<stats>;
export function measure(iter: (state: k_iter & k_statefree) => any, opts?: k_options): Promise<stats>;
export function measure<T extends Record<string, any>>(gen: (state: k_statefull<T>) => Gen, opts: k_args<T>): Promise<stats>;
export function measure<T extends Record<string, any>>(iter: (state: k_iter & k_statefull<T>) => any, opts: k_args<T>): Promise<stats>;

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

interface stats {
  debug: string;
  ticks: number;
  samples: number[];
  kind: 'fn' | 'iter' | 'yield';
  min: number; max: number; avg: number; p25: number;
  p50: number; p75: number; p99: number; p999: number;
  gc?: { avg: number, min: number, max: number, total: number };
  heap?: { avg: number, min: number, max: number, total: number };
}

interface k_options {
  now?: () => number;
  inner_gc?: boolean;
  heap?: () => number;
  concurrency?: number;
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

export const k_concurrency: number;
export const k_min_samples: number;
export const k_max_samples: number;
export const k_min_cpu_time: number;
export const k_batch_unroll: number;
export const k_batch_samples: number;
export const k_warmup_samples: number;
export const k_batch_threshold: number;
export const k_warmup_threshold: number;
export const k_samples_threshold: number;