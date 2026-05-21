// =============================================================================
// src/engines/types.ts
// Shared TypeScript types for the multi-palette color system
// =============================================================================

export type StepName = string;

export type OKLCHColor = {
  l: number;
  c: number;
  h: number;
};

export type PaletteType = "chromatic" | "neutral";

/**
 * Atlassian-style 12-step scale for chromatic palettes.
 * Steps 250 and 850 add resolution at tint/dark-surface zones used heavily
 * in semantic tokens (hover states, dark mode elevated surfaces).
 */
export const CHROMATIC_STEPS: StepName[] = [
  "100", "200", "250", "300", "400", "500", "600", "700", "800", "850", "900", "1000",
];

/** 15-step scale for neutral palettes (finer L granularity, near-zero chroma). */
export const NEUTRAL_STEPS: StepName[] = [
  "0", "50", "100", "150", "200", "250", "300", "400", "500",
  "600", "700", "800", "900", "950", "1000",
];

/** Hue reference step for chromatic palettes (not the chroma peak). */
export const HUE_ANCHOR_STEP: StepName = "500";

// ─── Configuration types ──────────────────────────────────────────────────────

export type LightnessCurveMode = "linear" | "edges" | "full";

export type ChromaPeakMode = "auto-by-hue" | "center";

export type GlobalScaleConfig = {
  lightnessRange: {
    lightest: number;
    darkest: number;
  };
  chromaCurve: {
    /** Maximum peak chroma amplitude across the scale. */
    peak: number;
    /** Edge chroma = peak × edgeFactor. Default 0.20 */
    edgeFactor: number;
    /**
     * auto-by-hue: peak position calculated from anchor hue (matches Atlassian pattern).
     * center: symmetric bell always centered at scale midpoint.
     */
    peakMode: ChromaPeakMode;
  };
  lightnessCurve: {
    /** linear = no easing, edges = first/last two steps, full = entire curve */
    mode: LightnessCurveMode;
    /** 0 = linear, 1 = full cubic ease-in-out effect. Default 0.15 */
    easingStrength: number;
  };
};

export type PaletteConfig = {
  id: string;
  name: string;
  type: PaletteType;
  /** Reference anchor color — h determines hue, c/l are used for reference */
  anchor: OKLCHColor;
  /** Multiplied against the global cBase per step. Default 1.0 */
  chromaMultiplier: number;
  /** Total hue degrees to add from anchor toward lightest step. Default 0 */
  hueDriftLight: number;
  /** Total hue degrees to add from anchor toward darkest step. Default 0 */
  hueDriftDark: number;
  /** For type = "neutral": fixed chroma for all steps. Default 0 */
  neutralChroma?: number;
  locked?: boolean;
};

export type PaletteSystemConfig = {
  globalScale: GlobalScaleConfig;
  palettes: PaletteConfig[];
};

// ─── Generated types ──────────────────────────────────────────────────────────

/** Per-step values from the global scale — shared by all palettes */
export type GlobalStepValues = {
  step: StepName;
  index: number;
  l: number;
  cBase: number;
};

export type GeneratedColor = {
  familyId: string;
  familyName: string;
  step: StepName;
  index: number;
  oklch: OKLCHColor;
  hex: string;
  originalC: number;
  resolvedC: number;
  wasChromaReduced: boolean;
  isInGamut: boolean;
  deltaL: number | null;
  deltaC: number | null;
  deltaH: number | null;
};

export type PaletteSymmetryReport = {
  /** L-only symmetry: each mirror pair has similar distance from the tonal midpoint. */
  isSymmetric: boolean;
  pairs: {
    stepA: string;
    stepB: string;
    deltaLDiff: number;
    deltaCDiff: number;
  }[];
  /** True if chroma rises then falls (any peak position is valid). */
  chromaIsBellCurve: boolean;
  /** Step name where chroma peaks, e.g. "600" for blue palettes. */
  chromaPeakStep: string | null;
};

export type GeneratedPalette = {
  config: PaletteConfig;
  colors: GeneratedColor[];
  symmetryReport: PaletteSymmetryReport;
};

// ─── Audit types ──────────────────────────────────────────────────────────────

export type CrossStepAuditRow = {
  step: StepName;
  lValues: { paletteId: string; paletteName: string; l: number }[];
  lRange: number;
  lWarning: boolean;
  cValues: { paletteId: string; paletteName: string; c: number }[];
  cRange: number;
  cWarning: boolean;
};

export type CrossStepAudit = {
  rows: CrossStepAuditRow[];
  lThreshold: number;
  cThreshold: number;
  totalLWarnings: number;
  totalCWarnings: number;
};

export type GeneratedPaletteSystem = {
  palettes: GeneratedPalette[];
  chromaticStepValues: GlobalStepValues[];
  neutralStepValues: GlobalStepValues[];
  chromaticAudit: CrossStepAudit;
  neutralAudit: CrossStepAudit;
};

// ─── Export types ─────────────────────────────────────────────────────────────

export type ExportFormat = "json-simple" | "json-full" | "css-vars" | "figma-variables";

// ─── Default factory ──────────────────────────────────────────────────────────

export function createDefaultSystem(): PaletteSystemConfig {
  return {
    globalScale: {
      // Defaults calibrated to match Atlassian's L mean targets (L100≈0.966, L1000≈0.296)
      lightnessRange: { lightest: 0.966, darkest: 0.296 },
      chromaCurve: { peak: 0.185, edgeFactor: 0.20, peakMode: "auto-by-hue" },
      // Atlassian L curve is almost linear with ~+0.034 max bulge → edges mode, low strength
      lightnessCurve: { mode: "edges", easingStrength: 0.15 },
    },
    palettes: [
      {
        id: crypto.randomUUID(),
        name: "azul",
        type: "chromatic",
        anchor: { l: 0.55, c: 0.18, h: 250 },
        chromaMultiplier: 1.0,
        hueDriftLight: 0,
        hueDriftDark: 0,
      },
      {
        id: crypto.randomUUID(),
        name: "neutral",
        type: "neutral",
        anchor: { l: 0.55, c: 0.005, h: 250 },
        chromaMultiplier: 1.0,
        hueDriftLight: 0,
        hueDriftDark: 0,
        neutralChroma: 0.005,
      },
    ],
  };
}
