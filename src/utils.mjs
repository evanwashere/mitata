export const runtimes = {
  bun: 'bun',
  deno: 'deno',
  node: 'node',
  browser: 'browser',
};

export const isBun = 'Bun' in globalThis;
export const isDeno = 'Deno' in globalThis;
export const isNode = 'process' in globalThis;
export const isBrowser = 'navigator' in globalThis;

