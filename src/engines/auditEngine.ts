// =============================================================================
// src/engines/auditEngine.ts
// =============================================================================

import type { GeneratedPalette, CrossStepAudit, CrossStepAuditRow } from "./types";

/**
 * Tiered L threshold strategy (from Atlassian analysis):
 * - Extreme steps (first 2 + last 2): strict ≤ lStrict (≈0.020)
 *   These steps anchor backgrounds and text — must be consistent.
 * - Middle steps: lenient ≤ lMid (≈0.100)
 *   Middle colors vary naturally by hue; only flag extreme deviations.
 */
export function buildCrossStepAudit(
  palettes: GeneratedPalette[],
  thresholds: { l: number; c: number; lMid?: number },
): CrossStepAudit {
  if (palettes.length === 0) {
    return {
      rows: [],
      lThreshold: thresholds.l,
      cThreshold: thresholds.c,
      totalLWarnings: 0,
      totalCWarnings: 0,
    };
  }

  const stepCount = palettes[0].colors.length;
  const rows: CrossStepAuditRow[] = [];
  const isChromaticGroup = palettes[0].config.type === "chromatic";
  // Lenient threshold for middle steps (default: no warning in middle zone)
  const lMid = thresholds.lMid ?? thresholds.l;

  for (let stepIdx = 0; stepIdx < stepCount; stepIdx++) {
    const stepName = palettes[0].colors[stepIdx].step;

    // Extreme steps: first 2 and last 2 use strict threshold
    const isExtreme = stepIdx <= 1 || stepIdx >= stepCount - 2;
    const lThreshForStep = isExtreme ? thresholds.l : lMid;

    const lValues = palettes.map((p) => ({
      paletteId: p.config.id,
      paletteName: p.config.name,
      l: p.colors[stepIdx].oklch.l,
    }));

    const cValues = isChromaticGroup
      ? palettes.map((p) => ({
          paletteId: p.config.id,
          paletteName: p.config.name,
          c: p.colors[stepIdx].oklch.c,
        }))
      : [];

    const lMin = Math.min(...lValues.map((v) => v.l));
    const lMax = Math.max(...lValues.map((v) => v.l));
    const lRange = lMax - lMin;

    const cMin = cValues.length > 0 ? Math.min(...cValues.map((v) => v.c)) : 0;
    const cMax = cValues.length > 0 ? Math.max(...cValues.map((v) => v.c)) : 0;
    const cRange = cMax - cMin;

    rows.push({
      step: stepName,
      lValues,
      lRange,
      lWarning: lRange > lThreshForStep,
      cValues,
      cRange,
      cWarning: cValues.length > 1 && cRange > thresholds.c,
    });
  }

  return {
    rows,
    lThreshold: thresholds.l,
    cThreshold: thresholds.c,
    totalLWarnings: rows.filter((r) => r.lWarning).length,
    totalCWarnings: rows.filter((r) => r.cWarning).length,
  };
}
