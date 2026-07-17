// =============================================================================
// src/engines/systemEngine.ts
// =============================================================================

import type { PaletteConfig, PaletteSystemConfig, GeneratedPaletteSystem } from "./types";
import {
  CHROMATIC_STEPS,
  NEUTRAL_STEPS,
  DARK_NEUTRAL_STEPS,
  DARK_NEUTRAL_PALETTE_ID,
  ALPHA_BASE_STEP,
  ATLASSIAN_NEUTRAL_HEX,
  DARK_NEUTRAL_FLOOR_HEX,
} from "./types";
import { buildGlobalStepValues } from "./scaleEngine";
import { generatePalette } from "./paletteEngine";
import type { ChromaEngineConfig } from "./paletteEngine";
import { buildCrossStepAudit } from "./auditEngine";
import { buildAlphaPalette } from "./alphaEngine";
import { liftedInvertNeutralHex } from "./colorConversions";

function buildDarkNeutralConfig(source: PaletteConfig): PaletteConfig {
  return {
    id: DARK_NEUTRAL_PALETTE_ID,
    name: "dark-neutral",
    type: "neutral",
    anchor: { ...source.anchor },
    chromaMultiplier: 1,
    hueDriftLight: 0,
    hueDriftDark: 0,
    neutralChroma: source.neutralChroma ?? 0,
    locked: true,
  };
}

export function generateSystem(config: PaletteSystemConfig): GeneratedPaletteSystem {
  const { globalScale, palettes } = config;

  const chromaticStepValues = buildGlobalStepValues(globalScale, CHROMATIC_STEPS, "chromatic");
  const neutralStepValues = buildGlobalStepValues(globalScale, NEUTRAL_STEPS, "neutral");
  const darkNeutralStepValues = buildGlobalStepValues(
    globalScale,
    DARK_NEUTRAL_STEPS,
    "dark-neutral",
  );

  const chromaConfig: ChromaEngineConfig = {
    peak: globalScale.chromaCurve.peak,
    edgeFactor: globalScale.chromaCurve.edgeFactor,
    peakMode: globalScale.chromaCurve.peakMode,
    steps: CHROMATIC_STEPS,
  };

  const generatedPalettes = palettes.map((paletteConfig) => {
    const steps =
      paletteConfig.type === "neutral" ? neutralStepValues : chromaticStepValues;
    return generatePalette(steps, paletteConfig, chromaConfig);
  });

  const sourceNeutral = palettes.find((p) => p.type === "neutral");
  const darkNeutral = sourceNeutral
    ? generatePalette(
        darkNeutralStepValues,
        buildDarkNeutralConfig(sourceNeutral),
        chromaConfig,
      )
    : null;

  const chromaticPalettes = generatedPalettes.filter((p) => p.config.type === "chromatic");
  const neutralPalettes = generatedPalettes.filter((p) => p.config.type === "neutral");

  const generatedNeutral = generatedPalettes.find((p) => p.config.type === "neutral") ?? null;
  const neutralAlpha = generatedNeutral
    ? buildAlphaPalette(generatedNeutral, `${generatedNeutral.config.name}-alpha`)
    : null;

  // Opción 2: dark alpha base = clean sRGB mirror of neutral 1100 (no OKLCH high-end
  // respread), so the base↔canvas distance matches light and the mode difference is
  // purely perceptual, not an artifact of the dark-neutral high-end respacing.
  const darkAlphaBaseHex = liftedInvertNeutralHex(
    DARK_NEUTRAL_FLOOR_HEX,
    ATLASSIAN_NEUTRAL_HEX[ALPHA_BASE_STEP],
  );
  const darkNeutralAlpha = darkNeutral
    ? buildAlphaPalette(darkNeutral, "dark-neutral-alpha", darkAlphaBaseHex)
    : null;

  const thresholds = { l: 0.020, c: 0.08, lMid: 0.100 };

  return {
    palettes: generatedPalettes,
    darkNeutral,
    chromaticStepValues,
    neutralStepValues,
    darkNeutralStepValues,
    chromaticAudit: buildCrossStepAudit(chromaticPalettes, thresholds),
    neutralAudit: buildCrossStepAudit(neutralPalettes, thresholds),
    neutralAlpha,
    darkNeutralAlpha,
  };
}
