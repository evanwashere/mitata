export function bench(name: string, fn: () => any): void;
export function baseline(name: string, fn: () => any): void;

export function group(fn: () => void): void;
export function group(name: string, fn: () => void): void;
export function group(options: { name?: string, summary?: boolean }, fn: () => void): void;

export function run(options?: {
  avg?: boolean,
  colors?: boolean,
  min_max?: boolean,
  collect?: boolean,
  percentiles?: boolean,
  json?: number | boolean,
}): Promise<Report>;

export interface Report {
  cpu: string;
  runtime: string;

  benchmarks: {
    name: string;
    time: number;
    fn: () => any;
    async: boolean;
    warmup: boolean;
    baseline: boolean;
    group: string | null;

    error?: {
      stack: string;
      message: string;
    };

    stats?: {
      n: number;
      avg: number;
      min: number;
      max: number;
      p75: number;
      p99: number;
      p995: number;
      p999: number;
      jit: number[];
    };
  }[];
}