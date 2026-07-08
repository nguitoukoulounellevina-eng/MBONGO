const parseVal = (v: number|string|undefined|null): number =>
  Math.round(typeof v === 'string' ? parseFloat(v) : (v || 0));

export const dotSep = (n: number): string =>
  n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export const fmt = (v: number|string|undefined|null): string =>
  `${dotSep(parseVal(v))} FCFA`;

export const fmtCurrency = (v: number|string|undefined|null, currency?: string): string =>
  `${dotSep(parseVal(v))} ${currency || 'FCFA'}`;
