// =============================================================================
// src/engines/gamutEngine.ts
// Gamut mapping: reduce chroma progressively (bisection) to stay in sRGB.
// Never clips RGB channels directly; always preserves L and H.
// =============================================================================

import type { OKLCHColor } from "./types";
import { isInSRGBGamut, oklchToHex } from "./colorConversions";

export type GamutResult = {
  oklch: OKLCHColor;
  hex: string;
  originalC: number;
  resolvedC: number;
  wasChromaReduced: boolean;
  isInGamut: boolean;
};

/**
 * If the color is in sRGB gamut, return it unchanged.
 * Otherwise, binary-search for the maximum chroma that stays in gamut
 * while keeping L and H fixed.
 *
 * @param l - OKLCH lightness
 * @param c - requested chroma (may be out of gamut)
 * @param h - hue angle in degrees
 * @param iterations - bisection iterations (20 gives ~0.000001 precision)
 */
export function reduceChromaToGamut(l: number, c: number, h: number, iterations = 20): GamutResult {
  const originalC = c;

  if (isInSRGBGamut({ l, c, h })) {
    const oklch: OKLCHColor = { l, c, h };
    return {
      oklch,
      hex: oklchToHex(oklch),
      originalC,
      resolvedC: c,
      wasChromaReduced: false,
      isInGamut: true,
    };
  }

  // Binary search: find max c in [0, c] that is in gamut
  let lo = 0;
  let hi = c;

  for (let i = 0; i < iterations; i++) {
    const mid = (lo + hi) / 2;
    if (isInSRGBGamut({ l, c: mid, h })) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const resolvedC = lo;
  const oklch: OKLCHColor = { l, c: resolvedC, h };

  return {
    oklch,
    hex: oklchToHex(oklch),
    originalC,
    resolvedC,
    wasChromaReduced: true,
    isInGamut: false,
  };
}
