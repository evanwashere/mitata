export function bench(name: string, fn: () => any): void;
export function baseline(name: string, fn: () => any): void;

export function group(fn: () => void): void;
export function group(name: string, fn: () => void): void;
export function group(options: { name?: string, summary?: boolean }, fn: () => void): void;

export function run(options?: {
  avg?: boolean,
  silent?: boolean,
  colors?: boolean,
  min_max?: boolean,
  percentiles?: boolean,
  json?: number | boolean,
  units?: boolean,

  /**
  * @deprecated does not do anything since 0.1.7
  */
  collect?: boolean,
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
      avg: number;
      min: number;
      max: number;
      p50: number;
      p75: number;
      p99: number;
      p999: number;
    };
  }[];
}