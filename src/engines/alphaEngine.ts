// =============================================================================
// src/engines/alphaEngine.ts
// Derives an alpha (opacity) ramp from a solid neutral palette.
//
// Pattern (from Atlassian alpha tokens): a single tinted base color at
// increasing opacity, where each step's opacity is chosen so that compositing
// the base over the mode canvas reproduces the equivalent solid step.
//
//   target = a · base + (1 − a) · canvas   →   a = (canvas − target) / (canvas − base)
//
// Base = solid step 1100 (darkest non-black for light, lightest non-white for
// dark). Canvas = solid step 0 (mode background). Both inherit the palette tint.
// =============================================================================

import type { GeneratedPalette, GeneratedAlphaPalette, AlphaColor, StepName } from "./types";
import { ALPHA_STEPS, ALPHA_BASE_STEP, ALPHA_CANVAS_STEP } from "./types";

type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function byte(n: number): string {
  return Math.round(Math.max(0, Math.min(255, n)))
    .toString(16)
    .padStart(2, "0");
}

function rgbToHex([r, g, b]: Rgb): string {
  return `#${byte(r)}${byte(g)}${byte(b)}`;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * Opacity that makes `base` over `canvas` match `target`, averaged across
 * channels for a single stable alpha. Channels where canvas ≈ base are skipped.
 */
function solveAlpha(canvas: Rgb, base: Rgb, target: Rgb): number {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < 3; i++) {
    const denom = canvas[i] - base[i];
    if (Math.abs(denom) < 1) continue;
    sum += (canvas[i] - target[i]) / denom;
    count += 1;
  }
  const a = count > 0 ? sum / count : 0;
  return clamp01(a);
}

function compositeOver(base: Rgb, alpha: number, canvas: Rgb): Rgb {
  return [
    alpha * base[0] + (1 - alpha) * canvas[0],
    alpha * base[1] + (1 - alpha) * canvas[1],
    alpha * base[2] + (1 - alpha) * canvas[2],
  ];
}

function colorForStep(palette: GeneratedPalette, step: StepName): string | null {
  return palette.colors.find((c) => c.step === step)?.hex ?? null;
}

/**
 * Build an alpha ramp from a generated solid palette.
 * Returns null if the required base/canvas steps are missing.
 *
 * `baseHexOverride` lets callers supply the base color directly instead of
 * reading it from the palette's 1100 swatch. Used for dark-neutral so the base
 * comes from the clean sRGB mirror, not the OKLCH-respread high end — keeping the
 * base↔canvas distance symmetric with light (Opción 2). Differences between
 * modes then reflect only the canvas/curve, not the high-end respacing artifact.
 */
export function buildAlphaPalette(
  palette: GeneratedPalette,
  name: string,
  baseHexOverride?: string,
): GeneratedAlphaPalette | null {
  const baseHex = baseHexOverride ?? colorForStep(palette, ALPHA_BASE_STEP);
  const canvasHex = colorForStep(palette, ALPHA_CANVAS_STEP);
  if (!baseHex || !canvasHex) return null;

  const base = hexToRgb(baseHex);
  const canvas = hexToRgb(canvasHex);

  const colors: AlphaColor[] = [];
  for (const step of ALPHA_STEPS) {
    const targetHex = colorForStep(palette, step);
    if (!targetHex) continue;

    const target = hexToRgb(targetHex);
    const alpha = solveAlpha(canvas, base, target);
    const composite = compositeOver(base, alpha, canvas);

    colors.push({
      step,
      alpha: +alpha.toFixed(4),
      hex8: `${baseHex}${byte(alpha * 255)}`.toUpperCase(),
      rgba: {
        r: +(base[0] / 255).toFixed(4),
        g: +(base[1] / 255).toFixed(4),
        b: +(base[2] / 255).toFixed(4),
        a: +alpha.toFixed(4),
      },
      compositeHex: rgbToHex(composite),
    });
  }

  return {
    name,
    baseStep: ALPHA_BASE_STEP,
    baseHex,
    canvasHex,
    colors,
  };
}
