// Utilidad para formatear unit_size (fracciones y enteros)
export function formatUnitSizeDisplay(val?: string | number | null): string {
  if (val == null) return '';
  const raw = String(val).replace(/["”]/g, '').trim();

  // Si es un número entero o una fracción equivalente a un entero, devolver directamente el entero
  const fractionMatch = raw.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (fractionMatch) {
    const numerator = parseInt(fractionMatch[1], 10);
    const denominator = parseInt(fractionMatch[2], 10);
    if (denominator === 1) return String(numerator);
  }

  // Si es un número entero, devolver directamente
  if (/^-?\d+$/.test(raw)) {
    return raw;
  }

  // Fracción mixta como "1 1/8"
  if (/^\d+\s+\d+\/\d+$/.test(raw)) return raw;
  // Fracción simple, posiblemente impropia, como "9/8"
  const f = raw.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (f) {
    const numerator = parseInt(f[1], 10);
    const denominator = parseInt(f[2], 10);
    const sign = Math.sign(numerator);
    const n = Math.abs(numerator);
    const d = denominator;
    const whole = Math.floor(n / d);
    let rem = n % d;
    if (rem === 0) return String(sign < 0 ? -whole : whole);
    const g = gcd(rem, d);
    rem = Math.floor(rem / g);
    const dd = Math.floor(d / g);
    const prefix = sign < 0 ? '-' : '';
    return whole > 0 ? `${prefix}${whole} ${rem}/${dd}` : `${prefix}${rem}/${dd}`;
  }
  // Decimal number like 1.125
  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    const negative = raw.startsWith('-');
    const num = Math.abs(parseFloat(raw));
    const whole = Math.floor(num);
    const frac = num - whole;
    if (frac < 1e-8) return `${negative ? '-' : ''}${whole}`;
    const baseDen = 64;
    let n = Math.round(frac * baseDen);
    let d = baseDen;
    const g = gcd(n, d);
    n = Math.floor(n / g);
    d = Math.floor(d / g);
    if (n === d) return `${negative ? '-' : ''}${whole + 1}`;
    return whole > 0
      ? `${negative ? '-' : ''}${whole} ${n}/${d}`
      : `${negative ? '-' : ''}${n}/${d}`;
  }
  // Unknown format, return as-is
  return raw;
}

function gcd(a: number, b: number): number {
  if (!b) return a;
  return gcd(b, a % b);
}
