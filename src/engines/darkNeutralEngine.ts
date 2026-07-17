// =============================================================================
// src/engines/darkNeutralEngine.ts
// Derives dark neutral from the light neutral ramp (unchanged source).
//
// Neutral light-end spacing is ~uniform in sRGB distance from white (~7 per step).
// Dark neutral mirrors those deltas from an elevated floor (not absolute black),
// then re-spreads 800–1200 toward white.
// =============================================================================

import type { StepName } from "./types";
import { ATLASSIAN_NEUTRAL_HEX, DARK_NEUTRAL_FLOOR_HEX } from "./types";
import { hexToOklch, liftedInvertNeutralHex, neutralLToHex } from "./colorConversions";

const HIGH_END_EVEN_BLEND = 0.85;

function spreadLightEndHexes(hexes: string[], steps: StepName[], fromStep: StepName): void {
  const from = steps.indexOf(fromStep);
  const n = steps.length;
  if (from < 0 || from >= n - 1) return;

  const startL = hexToOklch(hexes[from]).l;
  const shapeL = steps.map((_, i) => hexToOklch(hexes[i]).l);
  const len = n - 1 - from;

  for (let j = 0; j <= len; j++) {
    const i = from + j;
    const evenT = j / len;
    const shapeStart = shapeL[from];
    const shapeEnd = 1;
    const shapeT = (shapeL[i] - shapeStart) / (shapeEnd - shapeStart || 1);
    const t = shapeT * (1 - HIGH_END_EVEN_BLEND) + evenT * HIGH_END_EVEN_BLEND;
    const l = startL + (1 - startL) * t;
    hexes[i] = neutralLToHex(l);
  }

  hexes[n - 1] = "#ffffff";
}

/**
 * Build dark neutral hex per step from the light neutral ramp.
 * Low/mid: lifted sRGB mirror (same deltas as neutral, floor at DARK_NEUTRAL_FLOOR_HEX).
 * High end (800+): OKLCH re-spread to avoid compression before white.
 */
export function buildDarkNeutralTargetHex(steps: StepName[]): Record<StepName, string> {
  const n = steps.length;
  const hexes = steps.map((step) =>
    liftedInvertNeutralHex(DARK_NEUTRAL_FLOOR_HEX, ATLASSIAN_NEUTRAL_HEX[step]),
  );
  hexes[n - 1] = "#ffffff";

  spreadLightEndHexes(hexes, steps, "800");

  const out: Record<StepName, string> = {};
  steps.forEach((step, i) => {
    out[step] = hexes[i];
  });
  return out;
}

/** OKLCH L curve derived from the final dark neutral hex targets. */
export function buildDarkNeutralLCurve(steps: StepName[]): number[] {
  const hex = buildDarkNeutralTargetHex(steps);
  return steps.map((step) => hexToOklch(hex[step]).l);
}
