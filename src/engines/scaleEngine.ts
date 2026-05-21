// =============================================================================
// src/engines/scaleEngine.ts
// Computes global L and cBase curves shared by palettes of the same step scale.
// =============================================================================

import type { GlobalScaleConfig, GlobalStepValues, StepName } from "./types";
import { easeInOutCubic, lerp } from "./colorConversions";

// ─── Hue-aware chroma peak positioning ───────────────────────────────────────

/**
 * Returns the step index where chroma should peak for a given hue.
 * Based on Atlassian palette analysis: hues with high perceptual lightness
 * (yellow, lime) peak at light steps; hues with low perceptual lightness
 * (blue) peak at dark steps. This reflects the Helmholtz-Kohlrausch effect.
 *
 * Reference steps per hue zone (12-step scale):
 *   Yellow (60-110°) → step 300  (index 3, L≈0.86)
 *   Lime  (110-155°) → step 400  (index 4, L≈0.77)
 *   Blue  (220-290°) → step 700  (index 7, L≈0.54)
 *   Red/Magenta (0-45° or 320-360°) → step 600 (index 6, L≈0.62)
 *   All others (orange, green, purple) → step 500 (index 5, L≈0.70)
 */
export function getChromaPeakIndexByHue(hue: number, steps: StepName[]): number {
  const h = ((hue % 360) + 360) % 360;
  let peakStep: string;
  if (h >= 60 && h < 110)        peakStep = "300";  // yellow
  else if (h >= 110 && h < 155)  peakStep = "400";  // lime / chartreuse
  else if (h >= 220 && h < 290)  peakStep = "700";  // blue
  else if (h < 45 || h >= 320)   peakStep = "600";  // red / magenta
  else                            peakStep = "500";  // orange / green / purple

  const idx = steps.indexOf(peakStep);
  return idx >= 0 ? idx : Math.floor((steps.length - 1) / 2);
}

/**
 * Builds a chroma bell with peak at an arbitrary index (not necessarily centered).
 * The bell rises from edge → peak on the left wing and falls peak → edge on the right.
 * Each wing is shaped as cos²(t·π/2) for a smooth S-curve feel.
 */
export function buildHueAwareChromaticChromaBase(
  n: number,
  peakIdx: number,
  peak: number,
  edgeFactor: number,
): number[] {
  if (n === 1) return [peak];
  const edge = peak * edgeFactor;
  const leftLen = peakIdx;
  const rightLen = n - 1 - peakIdx;
  return Array.from({ length: n }, (_, i) => {
    let t: number;
    if (i <= peakIdx) {
      t = leftLen > 0 ? (peakIdx - i) / leftLen : 0;
    } else {
      t = rightLen > 0 ? (i - peakIdx) / rightLen : 0;
    }
    const cos = Math.cos((Math.PI / 2) * t);
    return edge + (peak - edge) * cos * cos;
  });
}

// ─── Lightness curve ──────────────────────────────────────────────────────────

function buildGlobalLightness(
  n: number,
  lightest: number,
  darkest: number,
  lightnessCurve: GlobalScaleConfig["lightnessCurve"],
): number[] {
  if (n === 1) return [(lightest + darkest) / 2];

  const { mode, easingStrength } = lightnessCurve;

  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const linear = lightest + (darkest - lightest) * t;

    if (mode === "linear" || easingStrength === 0) return linear;
    if (mode === "edges" && i > 1 && i < n - 2) return linear;

    const eased = lightest + (darkest - lightest) * easeInOutCubic(t);
    return lerp(linear, eased, easingStrength);
  });
}

// ─── Chroma-base curve (chromatic) ───────────────────────────────────────────

/**
 * Symmetric chroma bell (peak at center). Used for GlobalControls chart visualization
 * and when peakMode = "center".
 */
function buildChromaticChromaBase(n: number, peak: number, edgeFactor: number): number[] {
  if (n === 1) return [peak];

  const edge = peak * edgeFactor;
  const center = (n - 1) / 2;
  const maxDist = center;

  return Array.from({ length: n }, (_, i) => {
    const dist = Math.abs(i - center);
    const t = maxDist > 0 ? dist / maxDist : 0;
    const cos = Math.cos((Math.PI / 2) * t);
    return edge + (peak - edge) * cos * cos;
  });
}

/** Neutrals use zero chroma base; actual C comes from palette.neutralChroma. */
function buildNeutralChromaBase(n: number): number[] {
  return Array.from({ length: n }, () => 0);
}

// ─── Public entry point ───────────────────────────────────────────────────────

export function buildGlobalStepValues(
  config: GlobalScaleConfig,
  steps: StepName[],
  paletteKind: "chromatic" | "neutral",
): GlobalStepValues[] {
  const n = steps.length;
  if (n === 0) return [];

  const { lightnessRange, chromaCurve, lightnessCurve } = config;
  const lValues = buildGlobalLightness(
    n,
    lightnessRange.lightest,
    lightnessRange.darkest,
    lightnessCurve,
  );

  const cBaseValues =
    paletteKind === "chromatic"
      ? buildChromaticChromaBase(n, chromaCurve.peak, chromaCurve.edgeFactor)
      : buildNeutralChromaBase(n);

  return steps.map((step, index) => ({
    step,
    index,
    l: lValues[index],
    cBase: cBaseValues[index],
  }));
}
