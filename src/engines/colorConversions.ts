// =============================================================================
// src/engines/colorConversions.ts
// Pure OKLCH → sRGB color math. No side effects, no dependencies.
// =============================================================================

import type { OKLCHColor } from "./types";

// ─── Math utilities ───────────────────────────────────────────────────────────

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(x: number, lo = 0, hi = 1): number {
  return Math.max(lo, Math.min(hi, x));
}

// ─── Color conversion chain ───────────────────────────────────────────────────

/** OKLCH → OKLab */
export function oklchToOklab(color: OKLCHColor): { L: number; a: number; b: number } {
  const hRad = (color.h * Math.PI) / 180;
  return {
    L: color.l,
    a: color.c * Math.cos(hRad),
    b: color.c * Math.sin(hRad),
  };
}

/**
 * OKLab → linear-light sRGB via Björn Ottosson matrices.
 * Values outside [0,1] indicate out-of-sRGB-gamut colors.
 */
export function oklabToLinearSRGB(lab: { L: number; a: number; b: number }): {
  r: number;
  g: number;
  b: number;
} {
  const { L, a, b } = lab;

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return {
    r: +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  };
}

/** Linear light → gamma-encoded sRGB channel. Clamps to [0,1] first. */
export function linearToSRGBGamma(x: number): number {
  const c = clamp(x);
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

/**
 * OKLCH → #rrggbb. Out-of-gamut colors are hard-clipped per channel.
 * For gamut-safe conversion, use gamutEngine.reduceChromaToGamut() first.
 */
export function oklchToHex(color: OKLCHColor): string {
  const lab = oklchToOklab(color);
  const { r, g, b } = oklabToLinearSRGB(lab);

  const toHexByte = (ch: number): string =>
    Math.round(linearToSRGBGamma(ch) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
}

/**
 * Check whether an OKLCH color is within the sRGB gamut.
 * Uses a small epsilon to handle floating-point rounding at the boundary.
 */
export function isInSRGBGamut(color: OKLCHColor, eps = 0.0001): boolean {
  const lab = oklchToOklab(color);
  const { r, g, b } = oklabToLinearSRGB(lab);
  return (
    r >= -eps && r <= 1 + eps &&
    g >= -eps && g <= 1 + eps &&
    b >= -eps && b <= 1 + eps
  );
}

/**
 * Convert sRGB hex (#rrggbb) to linear-light sRGB [0,1] per channel.
 */
export function hexToLinearSRGB(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const parse = (s: string) => parseInt(s, 16) / 255;
  const r = parse(h.slice(0, 2));
  const g = parse(h.slice(2, 4));
  const b = parse(h.slice(4, 6));

  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return { r: toLinear(r), g: toLinear(g), b: toLinear(b) };
}

/**
 * Convert linear-light sRGB to OKLab.
 * Inverse of oklabToLinearSRGB.
 */
export function linearSRGBToOklab(r: number, g: number, b: number): { L: number; a: number; b_: number } {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    L: 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    b_: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  };
}

/**
 * Convert a 6-digit hex color to OKLCH.
 */
export function hexToOklch(hex: string): OKLCHColor {
  const { r, g, b } = hexToLinearSRGB(hex);
  const { L, a, b_ } = linearSRGBToOklab(r, g, b);

  const c = Math.sqrt(a * a + b_ * b_);
  let h = (Math.atan2(b_, a) * 180) / Math.PI;
  if (h < 0) h += 360;

  return { l: L, c, h };
}
