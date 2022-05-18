export function bench(name: string, fn: () => unknown): void;
export function group(
  name:
    | string
    | {
        name?: string;
        summary?: boolean;
      },
  fn: () => void
): void;
export function baseline(name: string, fn: () => unknown): void;
export function run<
  T extends {
    avg?: boolean;
    json?: boolean;
    colors?: boolean;
    min_max?: boolean;
    collect?: boolean;
    percentilse?: boolean;
  }
>(
  opts?: T
): Promise<
  T["json"] extends true
    ? Result
    : T["json"] extends false
    ? void
    : void | Result
>;

export interface Result {
  cpu: string;
  runtime: string;
  benchmarks: {
    fn: () => unknown;
    name: string;
    group: string | null;
    time: number;
    warmup: boolean;
    baseline: boolean;
    async: boolean;
    stats?: {
      n: number;
      min: number;
      max: number;
      jit: number;
      p75: number;
      p99: number;
      p995: number;
      p999: number;
      avg: number;
    };
    error?: {
      stack: string;
      message: string;
    };
  }[];
}
