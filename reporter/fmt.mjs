export function duration(time, locale = 'en-us') {
  if (time < 1e0) return `${Number((time * 1e3).toFixed(2)).toLocaleString(locale)} ps`

  if (time < 1e3) return `${Number(time.toFixed(2)).toLocaleString(locale)} ns`;
  if (time < 1e4) return `${Number(time.toFixed(0)).toLocaleString(locale)} ns`;
  if (time < 1e6) return `${Number((time / 1e3).toFixed(2)).toLocaleString(locale)} µs`;
  if (time < 1e7) return `${Number((time / 1e3).toFixed(0)).toLocaleString(locale)} µs`;
  if (time < 1e9) return `${Number((time / 1e6).toFixed(2)).toLocaleString(locale)} ms`;
  if (time < 1e10) return `${Number((time / 1e6).toFixed(0)).toLocaleString(locale)} ms`;

  if (time < 1e12) return `${Number((time / 1e9).toFixed(2)).toLocaleString(locale)} s`;
  if (time < 36e11) return `${Number((time / 60e9).toFixed(2)).toLocaleString(locale)} m`;

  return `${Number((time / 36e11).toFixed(2)).toLocaleString(locale)} h`;
}