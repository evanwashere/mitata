const locale = 'en-us';

export function duration(time) {
  if (time < 1e0) return `${Number((time * 1e3).toFixed(0)).toString()} ps`

  if (time < 1e2) return `${Number(time.toFixed(2)).toString()} ns`;
  if (time < 1e3) return `${Number(time.toFixed(0)).toString()} ns`;
  if (time < 1e5) return `${Number(time.toFixed(0)).toLocaleString(locale).replace(',', '\'')} ns`;

  if (time < 1e6) return `${Number((time / 1e3).toFixed(0)).toString()} µs`;
  if (time < 1e8) return `${Number((time / 1e3).toFixed(0)).toLocaleString(locale).replace(',', '\'')} µs`;

  if (time < 1e9) return `${Number((time / 1e6).toFixed(0)).toString()} ms`;
  if (time < 1e11) return `${Number((time / 1e6).toFixed(0)).toLocaleString(locale).replace(',', '\'')} ms`;

  if (time < 1e12) return `${Number((time / 1e9).toFixed(0)).toString()} s`;
  if (time < 36e11) return `${Number((time / 60e9).toFixed(0)).toString()} m`;
  return `${Number((time / 36e11).toFixed(2)).toLocaleString(locale, { notation: 'compact' })} h`;
}