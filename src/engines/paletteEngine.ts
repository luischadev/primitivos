// =============================================================================
// src/engines/paletteEngine.ts
// Generates a single palette. Gamut mapping runs silently (no UI alerts).
// =============================================================================

import type {
  PaletteConfig,
  GlobalStepValues,
  GeneratedColor,
  GeneratedPalette,
  PaletteSymmetryReport,
  PaletteType,
  GlobalScaleConfig,
  StepName,
} from "./types";
import { HUE_ANCHOR_STEP } from "./types";
import { easeInOutCubic } from "./colorConversions";
import { reduceChromaToGamut } from "./gamutEngine";
import { getChromaPeakIndexByHue, buildHueAwareChromaticChromaBase } from "./scaleEngine";

// ─── Chroma config passed from systemEngine ───────────────────────────────────

export type ChromaEngineConfig = Pick<GlobalScaleConfig["chromaCurve"], "peak" | "edgeFactor" | "peakMode"> & {
  steps: StepName[];
};

// ─── Hue drift ────────────────────────────────────────────────────────────────

function computeHue(
  i: number,
  anchorIdx: number,
  anchorH: number,
  hueDriftLight: number,
  hueDriftDark: number,
  n: number,
): number {
  if (i === anchorIdx) return anchorH;

  if (i < anchorIdx) {
    const t = anchorIdx > 0 ? (anchorIdx - i) / anchorIdx : 0;
    return anchorH + hueDriftLight * easeInOutCubic(t);
  }

  const t = n - 1 - anchorIdx > 0 ? (i - anchorIdx) / (n - 1 - anchorIdx) : 0;
  return anchorH + hueDriftDark * easeInOutCubic(t);
}

// ─── Symmetry (Atlassian mirror pairs) ───────────────────────────────────────

/**
 * Mirror pairs: step[i] ↔ step[n-1-i] (e.g. 100↔1000, 500↔600).
 * Symmetry is L-only: each pair should be equidistant from the tonal midpoint.
 * C asymmetry is intentional in hue-aware palettes (blue peaks at 700, yellow at 300).
 */
function buildSymmetryReport(colors: GeneratedColor[], type: PaletteType): PaletteSymmetryReport {
  const n = colors.length;
  const pairs: PaletteSymmetryReport["pairs"] = [];

  const lLight = colors[0].oklch.l;
  const lDark = colors[n - 1].oklch.l;
  const lMid = (lLight + lDark) / 2;

  for (let i = 0; i < Math.floor(n / 2); i++) {
    const j = n - 1 - i;
    const li = colors[i].oklch.l;
    const lj = colors[j].oklch.l;
    const ci = colors[i].oklch.c;
    const cj = colors[j].oklch.c;

    const deltaLDiff = Math.abs(Math.abs(li - lMid) - Math.abs(lj - lMid));
    const deltaCDiff = Math.abs(ci - cj);

    pairs.push({
      stepA: colors[i].step,
      stepB: colors[j].step,
      deltaLDiff,
      deltaCDiff,
    });
  }

  // Symmetry is purely about L balance — C asymmetry is expected for hue-aware palettes
  const isSymmetric =
    pairs.length > 0 &&
    pairs.every((p) => p.deltaLDiff < 0.02);

  const chromas = colors.map((c) => c.oklch.c);
  const maxC = Math.max(...chromas);
  const peakIdx = chromas.indexOf(maxC);

  const risingTowardPeak = chromas
    .slice(0, peakIdx + 1)
    .every((c, idx, arr) => idx === 0 || c >= arr[idx - 1]);

  const fallingAfterPeak = chromas
    .slice(peakIdx)
    .every((c, idx, arr) => idx === 0 || c <= arr[idx - 1]);

  // Bell curve: rises then falls from any peak position (not necessarily centered)
  const chromaIsBellCurve =
    type === "chromatic" &&
    n >= 3 &&
    risingTowardPeak &&
    fallingAfterPeak;

  const chromaPeakStep = type === "chromatic" ? (colors[peakIdx]?.step ?? null) : null;

  return { isSymmetric, pairs, chromaIsBellCurve, chromaPeakStep };
}

// ─── Main generator ───────────────────────────────────────────────────────────

export function generatePalette(
  globalSteps: GlobalStepValues[],
  config: PaletteConfig,
  chromaConfig?: ChromaEngineConfig,
): GeneratedPalette {
  const n = globalSteps.length;

  const hueAnchorStep =
    config.type === "chromatic" ? HUE_ANCHOR_STEP : globalSteps[Math.floor(n / 2)]?.step ?? "500";

  const anchorIdx = globalSteps.findIndex((s) => s.step === hueAnchorStep);
  if (anchorIdx === -1) {
    throw new Error(`Hue anchor step "${hueAnchorStep}" not found in scale`);
  }

  // Build per-palette chroma values for chromatic palettes
  let chromaValues: number[] | null = null;
  if (config.type === "chromatic" && chromaConfig) {
    const effectivePeak = chromaConfig.peak * config.chromaMultiplier;
    if (chromaConfig.peakMode === "auto-by-hue") {
      const peakIdx = getChromaPeakIndexByHue(config.anchor.h, chromaConfig.steps);
      chromaValues = buildHueAwareChromaticChromaBase(
        n, peakIdx, effectivePeak, chromaConfig.edgeFactor,
      );
    } else {
      // center mode: use the symmetric base from globalSteps, scaled by multiplier
      chromaValues = globalSteps.map((sv) => sv.cBase * config.chromaMultiplier);
    }
  }

  const colors: GeneratedColor[] = globalSteps.map(({ step, index, l, cBase }) => {
    let requestedC: number;
    if (config.type === "neutral") {
      requestedC = config.neutralChroma ?? 0;
    } else if (chromaValues) {
      requestedC = chromaValues[index];
    } else {
      requestedC = cBase * config.chromaMultiplier;
    }

    const h = computeHue(
      index,
      anchorIdx,
      config.anchor.h,
      config.hueDriftLight,
      config.hueDriftDark,
      n,
    );

    const gamut = reduceChromaToGamut(l, requestedC, h);

    return {
      familyId: config.id,
      familyName: config.name,
      step,
      index,
      oklch: gamut.oklch,
      hex: gamut.hex,
      originalC: gamut.originalC,
      resolvedC: gamut.resolvedC,
      wasChromaReduced: gamut.wasChromaReduced,
      isInGamut: gamut.isInGamut,
      deltaL: null,
      deltaC: null,
      deltaH: null,
    };
  });

  for (let i = 1; i < colors.length; i++) {
    colors[i].deltaL = colors[i].oklch.l - colors[i - 1].oklch.l;
    colors[i].deltaC = colors[i].oklch.c - colors[i - 1].oklch.c;
    const dH = colors[i].oklch.h - colors[i - 1].oklch.h;
    colors[i].deltaH = dH > 180 ? dH - 360 : dH < -180 ? dH + 360 : dH;
  }

  return {
    config,
    colors,
    symmetryReport: buildSymmetryReport(colors, config.type),
  };
}
