// =============================================================================
// src/engines/insightEngine.ts
// Converts technical audit data into natural-language system insights.
// =============================================================================

import type { GeneratedPaletteSystem, GlobalScaleConfig } from "./types";
import { CHROMATIC_STEPS } from "./types";
import { getChromaPeakIndexByHue } from "./scaleEngine";

// ─── Types ────────────────────────────────────────────────────────────────────

export type InsightSeverity = "ok" | "warning" | "critical";

export type SystemInsight = {
  id: string;
  title: string;
  severity: InsightSeverity;
  /** One-liner headline shown on the card. */
  summary: string;
  /** Longer technical context shown behind "Ver detalle". */
  detail: string;
  /** IDs of the palettes that are affected (for future highlighting). */
  affectedPalettes: string[];
  /** Actionable recommendation for the user. */
  recommendation: string;
  /** Whether a one-click fix is available. */
  canFix: boolean;
  /** Machine-readable fix action identifier. */
  fixAction?: "reset-intensity" | "enable-auto-peak" | "fix-lightness-range";
};

export type SystemInsights = {
  chromaShape: SystemInsight;
  chromaPeak: SystemInsight;
  lSymmetry: SystemInsight;
  lightnessRange: SystemInsight;
};

// ─── Generator ────────────────────────────────────────────────────────────────

export function generateSystemInsights(
  system: GeneratedPaletteSystem,
  globalScale: GlobalScaleConfig,
): SystemInsights {
  const chromatic = system.palettes.filter((p) => p.config.type === "chromatic");

  // ── 1. Chroma shape — does each palette have a proper bell curve? ────────
  const notBell = chromatic.filter((p) => !p.symmetryReport.chromaIsBellCurve);
  const chromaShape: SystemInsight =
    notBell.length === 0
      ? {
          id: "chromaShape",
          title: "Curva de chroma",
          severity: "ok",
          summary: "Todas las paletas tienen curva de C en campana.",
          detail: `${chromatic.length} paleta${chromatic.length !== 1 ? "s" : ""} cromática${chromatic.length !== 1 ? "s" : ""} con C rising→peak→falling correctamente.`,
          affectedPalettes: [],
          recommendation: "Sin acción necesaria.",
          canFix: false,
        }
      : {
          id: "chromaShape",
          title: "Curva de chroma",
          severity: notBell.length >= chromatic.length / 2 ? "critical" : "warning",
          summary: `${notBell.length} paleta${notBell.length > 1 ? "s" : ""} con curva de C irregular.`,
          detail: `Paletas: ${notBell.map((p) => p.config.name).join(", ")}. Una curva irregular suele indicar que la intensidad supera el límite de gamut en algunos pasos, aplastando la campana.`,
          affectedPalettes: notBell.map((p) => p.config.id),
          recommendation:
            "Reduce la intensidad de las paletas afectadas. Corregir resetea la intensidad a 1.0 en esas paletas.",
          canFix: true,
          fixAction: "reset-intensity",
        };

  // ── 2. Chroma peak — is the peak at the hue-correct step? ───────────────
  const modeIsAuto = globalScale.chromaCurve.peakMode === "auto-by-hue";
  const peakMismatches = chromatic.filter((p) => {
    if (!p.symmetryReport.chromaPeakStep) return false;
    const expectedIdx = getChromaPeakIndexByHue(p.config.anchor.h, CHROMATIC_STEPS);
    const expectedStep = CHROMATIC_STEPS[expectedIdx];
    return p.symmetryReport.chromaPeakStep !== expectedStep;
  });

  const chromaPeak: SystemInsight =
    modeIsAuto && peakMismatches.length === 0
      ? {
          id: "chromaPeak",
          title: "Posición del peak C",
          severity: "ok",
          summary: "Peak C en la posición correcta para cada hue.",
          detail:
            "Auto-by-hue activo: amarillos en paso 300, azules en paso 700, etc. Coincide con el patrón de paletas Atlassian.",
          affectedPalettes: [],
          recommendation: "Sin acción necesaria.",
          canFix: false,
        }
      : !modeIsAuto
        ? {
            id: "chromaPeak",
            title: "Posición del peak C",
            severity: "warning",
            summary: "Modo centrado: peak C igual para todos los hues.",
            detail:
              "Con el modo 'centrado', los amarillos y azules tienen el peak C en la misma posición que cualquier otro hue. Esto no refleja la física del color (efecto Helmholtz-Kohlrausch).",
            affectedPalettes: chromatic.map((p) => p.config.id),
            recommendation:
              "Activa 'Auto por hue' para posicionamiento óptimo según cada familia de color.",
            canFix: true,
            fixAction: "enable-auto-peak",
          }
        : {
            id: "chromaPeak",
            title: "Posición del peak C",
            severity: "warning",
            summary: `${peakMismatches.length} paleta${peakMismatches.length > 1 ? "s" : ""} con peak C desplazado.`,
            detail: `Paletas: ${peakMismatches.map((p) => p.config.name).join(", ")}. El gamut puede estar recortando la chroma antes del paso esperado.`,
            affectedPalettes: peakMismatches.map((p) => p.config.id),
            recommendation:
              "Verifica que la intensidad no supere el límite de gamut en las paletas afectadas.",
            canFix: false,
          };

  // ── 3. L symmetry — is each palette's L distribution symmetric? ─────────
  const asymmetric = chromatic.filter((p) => !p.symmetryReport.isSymmetric);
  const lSymmetry: SystemInsight =
    asymmetric.length === 0
      ? {
          id: "lSymmetry",
          title: "Simetría tonal (L)",
          severity: "ok",
          summary: "Distribución de L simétrica en todas las paletas.",
          detail:
            "Los pares espejo (100↔1000, 200↔900…) son equidistantes del punto tonal central. Esto garantiza que dark y light mode sean predecibles.",
          affectedPalettes: [],
          recommendation: "Sin acción necesaria.",
          canFix: false,
        }
      : {
          id: "lSymmetry",
          title: "Simetría tonal (L)",
          severity: asymmetric.length >= chromatic.length / 2 ? "critical" : "warning",
          summary: `${asymmetric.length} paleta${asymmetric.length > 1 ? "s" : ""} con L asimétrica.`,
          detail: `Paletas: ${asymmetric.map((p) => p.config.name).join(", ")}. La asimetría de L dificulta crear tokens semánticos predecibles para dark/light mode.`,
          affectedPalettes: asymmetric.map((p) => p.config.id),
          recommendation:
            "Usa easing 'Extremos' con fuerza baja (0.10-0.20). Una curva muy pronunciada puede crear asimetrías.",
          canFix: false,
        };

  // ── 4. Lightness range — are lightest/darkest within optimal bounds? ────
  const { lightest, darkest } = globalScale.lightnessRange;
  const lightestOk = lightest >= 0.945 && lightest <= 0.985;
  const darkestOk = darkest >= 0.255 && darkest <= 0.330;
  const issues: string[] = [];
  if (!lightestOk)
    issues.push(`lightest ${lightest.toFixed(3)} (óptimo 0.945–0.985)`);
  if (!darkestOk)
    issues.push(`darkest ${darkest.toFixed(3)} (óptimo 0.255–0.330)`);

  const lightnessRange: SystemInsight =
    issues.length === 0
      ? {
          id: "lightnessRange",
          title: "Rango de Lightness",
          severity: "ok",
          summary: `Rango tonal óptimo (${lightest.toFixed(3)} → ${darkest.toFixed(3)}).`,
          detail:
            "Lightest y darkest calibrados dentro del rango de referencia Atlassian. Los fondos de superficie y textos oscuros tendrán contraste predecible.",
          affectedPalettes: [],
          recommendation: "Sin acción necesaria.",
          canFix: false,
        }
      : {
          id: "lightnessRange",
          title: "Rango de Lightness",
          severity: "warning",
          summary: `Rango fuera de zona óptima.`,
          detail: issues.join(" · "),
          affectedPalettes: [],
          recommendation:
            "Aplica el Preset Atlassian o ajusta manualmente a lightest ~0.966, darkest ~0.296.",
          canFix: true,
          fixAction: "fix-lightness-range",
        };

  return { chromaShape, chromaPeak, lSymmetry, lightnessRange };
}
