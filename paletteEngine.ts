// =============================================================================
// paletteEngine.ts
// OKLCH Primitive Palette Generator — pure mathematical engine, no dependencies
// =============================================================================

// ─── Public types ─────────────────────────────────────────────────────────────

export type OKLCHColor = {
  /** Perceptual lightness, 0 (black) to 1 (white) */
  l: number;
  /** Chroma (colorfulness), typically 0 to ~0.4 */
  c: number;
  /** Hue angle in degrees, 0 to 360 */
  h: number;
};

export type PaletteStep = {
  name: string | number;
  oklch: OKLCHColor;
  /** 6-digit hex, e.g. "#1a2b3c". Out-of-sRGB-gamut values are hard-clipped. */
  hex: string;
  /** L difference from the previous step (null for the first step) */
  deltaL: number | null;
  /** C difference from the previous step (null for the first step) */
  deltaC: number | null;
};

export type PaletteConfig = {
  /** The user-supplied anchor color that acts as a fixed point in the scale */
  anchor: OKLCHColor;
  /** Which step name the anchor maps to, e.g. "500" */
  anchorStepName: string;
  /** Ordered step names, lightest → darkest, e.g. [50, 100, 200, …, 900, 950] */
  steps: (string | number)[];
  lightnessRange: {
    /** L value for the very first (lightest) step. Default: 0.97 */
    lightest: number;
    /** L value for the very last (darkest) step. Default: 0.12 */
    darkest: number;
  };
  chromaCurve: {
    /** Peak chroma = anchor.c × peakMultiplier. Default: 1.0 */
    peakMultiplier: number;
    /** Edge chroma = peak × edgeFactor (0–1). Default: 0.15 */
    edgeFactor: number;
  };
  /**
   * 0 = purely linear lightness steps throughout the scale.
   * 1 = full cubic ease-in-out compression applied to the first two and last
   *     two steps (the extremes are bunched together). Default: 0.3
   */
  easingStrength: number;
};

export type SymmetryReport = {
  /** True when all symmetric pairs satisfy the deltaL/deltaC thresholds */
  isSymmetric: boolean;
  /**
   * One entry per pair of steps equidistant from the anchor.
   * deltaLDiff < 0.02 and deltaCDiff < 0.01 indicates a well-balanced pair.
   */
  pairs: {
    stepA: string;
    stepB: string;
    /** |Δ|ΔL_A|| − |ΔL_B|| */
    deltaLDiff: number;
    /** |ΔC_A| − |ΔC_B|| */
    deltaCDiff: number;
  }[];
  /** True when chroma rises to a single interior peak then falls monotonically */
  chromaIsBellCurve: boolean;
};

export type PaletteResult = {
  steps: PaletteStep[];
  config: PaletteConfig;
  symmetryReport: SymmetryReport;
};

// ─── Internal math utilities ──────────────────────────────────────────────────

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(x: number, lo = 0, hi = 1): number {
  return Math.max(lo, Math.min(hi, x));
}

// ─── Color conversion ─────────────────────────────────────────────────────────

/**
 * OKLCH → OKLab
 *
 * L is passed through unchanged; a and b are the Cartesian projections of
 * the polar (C, h) coordinates.
 */
export function oklchToOklab(color: OKLCHColor): { L: number; a: number; b: number } {
  const hRad = (color.h * Math.PI) / 180;
  return {
    L: color.l,
    a: color.c * Math.cos(hRad),
    b: color.c * Math.sin(hRad),
  };
}

/**
 * OKLab → linear-light sRGB
 *
 * Uses the standard Björn Ottosson matrices:
 *
 *   Step 1 — OKLab to LMS (cube-root domain):
 *     l' = L + 0.3963377774·a + 0.2158037573·b
 *     m' = L − 0.1055613458·a − 0.0638541728·b
 *     s' = L − 0.0894841775·a − 1.2914855480·b
 *
 *   Step 2 — cube to recover linear LMS:
 *     l = l'³,  m = m'³,  s = s'³
 *
 *   Step 3 — linear LMS to linear sRGB (ICC D65):
 *     r =  4.0767416621·l − 3.3077115913·m + 0.2309699292·s
 *     g = −1.2684380046·l + 2.6097574011·m − 0.3413193965·s
 *     b = −0.0041960863·l − 0.7034186147·m + 1.7076147010·s
 */
export function oklabToLinearSRGB(lab: { L: number; a: number; b: number }): {
  r: number;
  g: number;
  b: number;
} {
  const { L, a, b } = lab;

  // OKLab → LMS cube-root space
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  // Cube to get linear LMS
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  // Linear LMS → linear sRGB (Bradford D65 matrix from Oklab spec)
  return {
    r: +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  };
}

/**
 * Apply the sRGB piecewise gamma transfer function to a single linear channel.
 * The input is clamped to [0, 1] first so out-of-gamut values are hard-clipped.
 */
function linearToSRGBGamma(x: number): number {
  const c = clamp(x);
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

/**
 * Full conversion: OKLCH → OKLab → linear sRGB → gamma sRGB → #rrggbb hex.
 *
 * Colors outside the sRGB gamut are hard-clipped per channel before gamma
 * encoding. No gamut mapping is performed.
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

// ─── Lightness distribution ───────────────────────────────────────────────────

/**
 * Build the lightness (L) value for every step index.
 *
 * Algorithm:
 *   1. Two-segment piecewise linear baseline:
 *      • Segment A — indices [0 … anchorIdx]: lightest → anchor.l
 *      • Segment B — indices [anchorIdx … n-1]: anchor.l → darkest
 *      The anchor step is always an exact fixed point.
 *   2. For the first two (i ∈ {0,1}) and last two (i ∈ {n-2, n-1}) steps,
 *      blend the linear value toward a cubic ease-in-out value computed over
 *      the full [lightest → darkest] range, by `easingStrength`.
 *      Middle steps retain pure linear spacing.
 */
function buildLightnessValues(
  n: number,
  anchorIdx: number,
  anchorL: number,
  lightest: number,
  darkest: number,
  easingStrength: number,
): number[] {
  if (n === 1) return [anchorL];

  const linearL = (i: number): number => {
    // When the anchor sits at an edge, fall back to a single linear segment
    if (anchorIdx <= 0 || anchorIdx >= n - 1) {
      return lightest + (darkest - lightest) * (i / (n - 1));
    }
    if (i <= anchorIdx) {
      return lightest + (anchorL - lightest) * (i / anchorIdx);
    }
    return anchorL + (darkest - anchorL) * ((i - anchorIdx) / (n - 1 - anchorIdx));
  };

  // Global ease-in-out target for extreme steps (full-range, not per-segment)
  const easedL = (i: number): number => {
    const t = i / (n - 1);
    return lightest + (darkest - lightest) * easeInOutCubic(t);
  };

  return Array.from({ length: n }, (_, i) => {
    if (i === anchorIdx) return anchorL;
    const base = linearL(i);
    if (easingStrength === 0 || (i > 1 && i < n - 2)) return base;
    return lerp(base, easedL(i), easingStrength);
  });
}

// ─── Chroma distribution ──────────────────────────────────────────────────────

/**
 * Build the chroma (C) value for every step index.
 *
 * Algorithm:
 *   • Define peak = anchor.c × peakMultiplier
 *   • Define edge = peak × edgeFactor
 *   • Apply a cosine bell curve:
 *       C(i) = edge + (peak − edge) × cos²( (i/(n−1) − 0.5) × π )
 *     which evaluates to `edge` at both ends (i=0, i=n-1) and `peak` at
 *     the midpoint.
 *   • Scale the entire curve uniformly so that C(anchorIdx) === anchor.c
 *     (the anchor is a fixed point).
 *   • Negative values after scaling are clamped to 0.
 */
function buildChromaValues(
  n: number,
  anchorIdx: number,
  anchorC: number,
  peakMultiplier: number,
  edgeFactor: number,
): number[] {
  if (n === 1) return [anchorC];

  const peak = anchorC * peakMultiplier;
  const edge = peak * edgeFactor;

  const bellChroma = (i: number): number => {
    const t = i / (n - 1);
    const cos = Math.cos((t - 0.5) * Math.PI);
    return edge + (peak - edge) * cos * cos;
  };

  // Scale factor so the curve passes exactly through (anchorIdx, anchor.c)
  const valueAtAnchor = bellChroma(anchorIdx);
  const scale = valueAtAnchor > 0 ? anchorC / valueAtAnchor : 1;

  return Array.from({ length: n }, (_, i) => {
    if (i === anchorIdx) return anchorC;
    return Math.max(0, bellChroma(i) * scale);
  });
}

// ─── Symmetry report ─────────────────────────────────────────────────────────

/**
 * Analyse how symmetric the palette is around the anchor step.
 *
 * For each offset `k` from the anchor we compare:
 *   • |ΔL| at (anchorIdx − k)  vs  |ΔL| at (anchorIdx + k)
 *   • |ΔC| at (anchorIdx − k)  vs  |ΔC| at (anchorIdx + k)
 *
 * Pairs where either step lacks a delta (i.e. the first step) are skipped.
 */
function buildSymmetryReport(steps: PaletteStep[], anchorIdx: number): SymmetryReport {
  const n = steps.length;
  const maxOffset = Math.min(anchorIdx, n - 1 - anchorIdx);
  const pairs: SymmetryReport["pairs"] = [];

  for (let offset = 1; offset <= maxOffset; offset++) {
    const idxA = anchorIdx - offset;
    const idxB = anchorIdx + offset;

    const dLA = steps[idxA].deltaL;
    const dLB = steps[idxB].deltaL;
    const dCA = steps[idxA].deltaC;
    const dCB = steps[idxB].deltaC;

    if (dLA === null || dLB === null || dCA === null || dCB === null) continue;

    pairs.push({
      stepA: String(steps[idxA].name),
      stepB: String(steps[idxB].name),
      deltaLDiff: Math.abs(Math.abs(dLA) - Math.abs(dLB)),
      deltaCDiff: Math.abs(Math.abs(dCA) - Math.abs(dCB)),
    });
  }

  const isSymmetric =
    pairs.length > 0 && pairs.every((p) => p.deltaLDiff < 0.02 && p.deltaCDiff < 0.01);

  // Bell-curve test: exactly one interior peak, non-decreasing before it,
  // non-increasing after it.
  const chromas = steps.map((s) => s.oklch.c);
  const maxC = Math.max(...chromas);
  const peakIdx = chromas.indexOf(maxC);

  const risingTowardPeak = chromas
    .slice(0, peakIdx + 1)
    .every((c, i, arr) => i === 0 || c >= arr[i - 1]);

  const fallingAfterPeak = chromas
    .slice(peakIdx)
    .every((c, i, arr) => i === 0 || c <= arr[i - 1]);

  const chromaIsBellCurve =
    n >= 3 && peakIdx > 0 && peakIdx < n - 1 && risingTowardPeak && fallingAfterPeak;

  return { isSymmetric, pairs, chromaIsBellCurve };
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Generate a full OKLCH color palette from the supplied configuration.
 *
 * @param config  Palette parameters — anchor color, step names, lightness
 *                range, chroma curve, and easing strength.
 * @returns       All resolved steps (OKLCH + hex), the original config, and
 *                a symmetry/balance report.
 *
 * @throws        When `anchorStepName` is not found in `config.steps`.
 */
export function generatePalette(config: PaletteConfig): PaletteResult {
  const {
    anchor,
    anchorStepName,
    steps,
    lightnessRange: { lightest, darkest },
    chromaCurve: { peakMultiplier, edgeFactor },
    easingStrength,
  } = config;

  if (steps.length === 0) throw new Error("steps must contain at least one entry");

  const anchorIdx = steps.findIndex((s) => String(s) === String(anchorStepName));
  if (anchorIdx === -1) {
    throw new Error(
      `Anchor step "${anchorStepName}" not found in steps: [${steps.join(", ")}]`,
    );
  }

  const n = steps.length;

  const lightnessValues = buildLightnessValues(
    n,
    anchorIdx,
    anchor.l,
    lightest,
    darkest,
    easingStrength,
  );

  const chromaValues = buildChromaValues(n, anchorIdx, anchor.c, peakMultiplier, edgeFactor);

  // Assemble steps (hue is constant — no hue shifting)
  const paletteSteps: PaletteStep[] = steps.map((name, i) => {
    const oklch: OKLCHColor = {
      l: lightnessValues[i],
      c: chromaValues[i],
      h: anchor.h,
    };
    return { name, oklch, hex: oklchToHex(oklch), deltaL: null, deltaC: null };
  });

  // Fill deltas: step[i] vs step[i-1]
  for (let i = 1; i < paletteSteps.length; i++) {
    paletteSteps[i].deltaL = paletteSteps[i].oklch.l - paletteSteps[i - 1].oklch.l;
    paletteSteps[i].deltaC = paletteSteps[i].oklch.c - paletteSteps[i - 1].oklch.c;
  }

  return {
    steps: paletteSteps,
    config,
    symmetryReport: buildSymmetryReport(paletteSteps, anchorIdx),
  };
}

// ─── Convenience helpers ──────────────────────────────────────────────────────

/**
 * Build a `PaletteConfig` filled with sensible defaults.
 * Override any field after calling this.
 *
 *   lightest       0.97   (near-white)
 *   darkest        0.12   (near-black)
 *   peakMultiplier 1.0    (peak chroma equals anchor chroma)
 *   edgeFactor     0.15   (edges at 15 % of peak chroma)
 *   easingStrength 0.3    (mild cubic compression at extremes)
 */
export function createDefaultConfig(
  anchor: OKLCHColor,
  anchorStepName: string,
  steps: (string | number)[],
): PaletteConfig {
  return {
    anchor,
    anchorStepName,
    steps,
    lightnessRange: { lightest: 0.97, darkest: 0.12 },
    chromaCurve: { peakMultiplier: 1.0, edgeFactor: 0.15 },
    easingStrength: 0.3,
  };
}
