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

/**
 * Atlassian-style light neutral ramp (Neutral0 → Neutral1200).
 * Step 0 is pure white; step 1200 is pure black.
 * Steps 250 and 350 are interpolated companions so light/dark ramps share 15 steps.
 */
export const NEUTRAL_STEPS: StepName[] = [
  "0", "100", "200", "250", "300", "350", "400", "500", "600", "700", "800", "900", "1000",
  "1100", "1200",
];

/**
 * Dark neutral ramp (DarkNeutral0 → DarkNeutral1200).
 * Shares step labels with the light neutral ramp; colors are derived at runtime
 * from inverted OKLCH L of the light neutral curve (0=#000, 1200=#FFF).
 * Low/mid mirrors neutral's sRGB distance-from-white as distance-from-black.
 */
export const DARK_NEUTRAL_STEPS: StepName[] = [
  "0", "100", "200", "250", "300", "350", "400", "500", "600", "700", "800", "900",
  "1000", "1100", "1200",
];

/** System id for the auto-generated dark neutral palette (not user-editable). */
export const DARK_NEUTRAL_PALETTE_ID = "system-dark-neutral";

/** Official Atlassian light neutral primitive hex targets, plus derived 250/350 midpoints. */
export const ATLASSIAN_NEUTRAL_HEX: Record<StepName, string> = {
  "0": "#FFFFFF",
  "100": "#F8F8F8",
  "200": "#F0F1F2",
  "250": "#E7E8EA",
  "300": "#DDDEE1",
  "350": "#CACCD0",
  "400": "#B7B9BE",
  "500": "#8C8F97",
  "600": "#7D818A",
  "700": "#6B6E76",
  "800": "#505258",
  "900": "#3B3D42",
  "1000": "#292A2E",
  "1100": "#1E1F21",
  "1200": "#000000",
};

/** Dark neutral floor — slightly above midpoint black ↔ #18191A. */
export const DARK_NEUTRAL_FLOOR_HEX = "#121213";

/**
 * Alpha (opacity) ramp steps — shared by neutral and dark-neutral alpha sets.
 * Covers the subtle overlay range (states, translucent surfaces, hairline borders).
 */
export const ALPHA_STEPS: StepName[] = [
  "100", "200", "250", "300", "350", "400", "500", "600", "700", "800",
];

/**
 * Solid step used as the alpha base color (not pure black/white).
 * Light alpha uses neutral 1100 (darkest non-black); dark alpha uses
 * dark-neutral 1100 (lightest non-white). Maximizes usable opacity range.
 */
export const ALPHA_BASE_STEP: StepName = "1100";

/** Solid step used as the compositing canvas (mode background). */
export const ALPHA_CANVAS_STEP: StepName = "0";

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
  /** For type = "neutral": subtle tint chroma applied on top of the Atlassian ramp. */
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
  /** Exact primitive target used by neutral ramps. */
  targetHex?: string;
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

// ─── Alpha (opacity) types ──────────────────────────────────────────────────

export type AlphaColor = {
  step: StepName;
  /** Translucent base color (sRGB 0–255) with computed opacity. */
  alpha: number;
  /** #RRGGBBAA — base color + alpha byte. */
  hex8: string;
  /** rgba() channels 0–1 plus alpha 0–1. */
  rgba: { r: number; g: number; b: number; a: number };
  /** Solid hex obtained by compositing this alpha over the canvas (preview). */
  compositeHex: string;
};

export type GeneratedAlphaPalette = {
  name: string;
  baseStep: StepName;
  /** Solid base color (#rrggbb) the opacity is applied to. */
  baseHex: string;
  /** Canvas color (#rrggbb) used to derive the per-step opacity. */
  canvasHex: string;
  colors: AlphaColor[];
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
  /** Auto-generated from the first neutral palette; null when no neutral exists. */
  darkNeutral: GeneratedPalette | null;
  chromaticStepValues: GlobalStepValues[];
  neutralStepValues: GlobalStepValues[];
  darkNeutralStepValues: GlobalStepValues[];
  chromaticAudit: CrossStepAudit;
  neutralAudit: CrossStepAudit;
  /** Opacity set derived from the neutral ramp; null when no neutral exists. */
  neutralAlpha: GeneratedAlphaPalette | null;
  /** Opacity set derived from the dark-neutral ramp; null when no neutral exists. */
  darkNeutralAlpha: GeneratedAlphaPalette | null;
};

// ─── Export types ─────────────────────────────────────────────────────────────

export type ExportFormat =
  | "json-simple"
  | "json-full"
  | "css-vars"
  | "figma-variables"
  | "figma-json";

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
        neutralChroma: 0,
      },
    ],
  };
}
