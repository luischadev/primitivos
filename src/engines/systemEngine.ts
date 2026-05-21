// =============================================================================
// src/engines/systemEngine.ts
// =============================================================================

import type { PaletteSystemConfig, GeneratedPaletteSystem } from "./types";
import { CHROMATIC_STEPS, NEUTRAL_STEPS } from "./types";
import { buildGlobalStepValues } from "./scaleEngine";
import { generatePalette } from "./paletteEngine";
import type { ChromaEngineConfig } from "./paletteEngine";
import { buildCrossStepAudit } from "./auditEngine";

export function generateSystem(config: PaletteSystemConfig): GeneratedPaletteSystem {
  const { globalScale, palettes } = config;

  const chromaticStepValues = buildGlobalStepValues(globalScale, CHROMATIC_STEPS, "chromatic");
  const neutralStepValues = buildGlobalStepValues(globalScale, NEUTRAL_STEPS, "neutral");

  // Chroma config passed to each chromatic palette for hue-aware peak positioning
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

  const chromaticPalettes = generatedPalettes.filter((p) => p.config.type === "chromatic");
  const neutralPalettes = generatedPalettes.filter((p) => p.config.type === "neutral");

  // Tiered thresholds: strict at extremes (0.020), lenient in middle (0.100)
  // C threshold raised to 0.08 — mixed-hue systems naturally have high C variation per step
  const thresholds = { l: 0.020, c: 0.08, lMid: 0.100 };

  return {
    palettes: generatedPalettes,
    chromaticStepValues,
    neutralStepValues,
    chromaticAudit: buildCrossStepAudit(chromaticPalettes, thresholds),
    neutralAudit: buildCrossStepAudit(neutralPalettes, thresholds),
  };
}
