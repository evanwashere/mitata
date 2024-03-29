const runtimes = {
  bun: 'bun',
  deno: 'deno',
  node: 'node',
  browser: 'browser',
};

export const isBun = 'Bun' in globalThis;
export const isDeno = 'Deno' in globalThis;
export const isNode = 'process' in globalThis;
export const isBrowser = 'navigator' in globalThis;

export function runtime() {
  if (isBun) return runtimes.bun;
  if (isDeno) return runtimes.deno;
  if (isNode) return runtimes.node;
  if (isBrowser) return runtimes.browser;

  return 'unknown';
}

