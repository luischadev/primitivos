// =============================================================================
// src/engines/importEngine.ts
// Parse Figma variable collections and adapt them to PaletteConfig.
// =============================================================================

import { hexToOklch, clamp } from "./colorConversions";
import {
  buildHueAwareChromaticChromaBase,
  getChromaPeakIndexByHue,
} from "./scaleEngine";
import type { GlobalScaleConfig, OKLCHColor, PaletteConfig, PaletteType } from "./types";
import { CHROMATIC_STEPS } from "./types";

// ─── Types ────────────────────────────────────────────────────────────────────

type FigmaRgba = { r: number; g: number; b: number; a?: number };

export type ImportedSwatch = {
  stepLabel: string | null;
  sortKey: number;
  oklch: OKLCHColor;
};

export type ImportedPaletteGroup = {
  name: string;
  swatches: ImportedSwatch[];
};

export class FigmaImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FigmaImportError";
  }
}

// ─── Parse helpers ──────────────────────────────────────────────────────────

function rgbaToHex({ r, g, b }: FigmaRgba): string {
  const byte = (x: number) =>
    Math.round(clamp(x, 0, 1) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${byte(r)}${byte(g)}${byte(b)}`;
}

function hueDelta(from: number, to: number): number {
  let d = to - from;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

function parseVariableName(name: string): { group: string; stepLabel: string | null; sortKey: number } {
  const slash = name.indexOf("/");
  const group = slash >= 0 ? name.slice(0, slash) : name;
  const rest = slash >= 0 ? name.slice(slash + 1) : name;
  const match = rest.match(/(\d+)\s*$/);
  const stepLabel = match ? match[1] : null;
  const sortKey = stepLabel !== null ? parseInt(stepLabel, 10) : Number.NaN;
  return { group, stepLabel, sortKey };
}

function resolveModeId(raw: Record<string, unknown>): string {
  const modes = raw.modes;
  if (modes && typeof modes === "object" && !Array.isArray(modes)) {
    const keys = Object.keys(modes as object);
    if (keys.length > 0) return keys[0];
  }
  if (Array.isArray(modes) && modes.length > 0) {
    const first = modes[0] as { modeId?: string };
    if (first.modeId) return first.modeId;
  }
  return "1:1";
}

function readColorValue(
  valuesByMode: Record<string, unknown> | undefined,
  modeId: string,
): FigmaRgba | null {
  if (!valuesByMode) return null;

  const direct = valuesByMode[modeId] as FigmaRgba | undefined;
  if (direct && typeof direct.r === "number") return direct;

  const firstKey = Object.keys(valuesByMode)[0];
  if (!firstKey) return null;
  const fallback = valuesByMode[firstKey] as FigmaRgba | undefined;
  if (fallback && typeof fallback.r === "number") return fallback;

  return null;
}

// ─── Public parse API ───────────────────────────────────────────────────────

/** Parse and group Figma variables JSON into palette groups (any step count). */
export function parseFigmaVariablesJson(json: string): ImportedPaletteGroup[] {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new FigmaImportError("JSON inválido.");
  }

  if (!raw || typeof raw !== "object") {
    throw new FigmaImportError("El JSON debe ser un objeto de colección de variables.");
  }

  const collection = raw as Record<string, unknown>;
  const variables = collection.variables;

  if (!Array.isArray(variables) || variables.length === 0) {
    throw new FigmaImportError("No se encontraron variables de color.");
  }

  const modeId = resolveModeId(collection);
  const groups = new Map<string, ImportedSwatch[]>();

  for (const variable of variables) {
    if (!variable || typeof variable !== "object") continue;
    const v = variable as Record<string, unknown>;
    if (v.type !== "COLOR") continue;

    const name = typeof v.name === "string" ? v.name : "";
    if (!name) continue;

    const rgba = readColorValue(
      v.valuesByMode as Record<string, unknown> | undefined,
      modeId,
    );
    if (!rgba) continue;

    const { group, stepLabel, sortKey } = parseVariableName(name);
    const oklch = hexToOklch(rgbaToHex(rgba));

    const list = groups.get(group) ?? [];
    list.push({
      stepLabel,
      sortKey: Number.isFinite(sortKey) ? sortKey : list.length,
      oklch,
    });
    groups.set(group, list);
  }

  if (groups.size === 0) {
    throw new FigmaImportError("No se encontraron variables de tipo COLOR con valores.");
  }

  const palettes: ImportedPaletteGroup[] = [];

  for (const [name, swatches] of groups) {
    const sorted = [...swatches].sort((a, b) => {
      const aNum = Number.isFinite(a.sortKey);
      const bNum = Number.isFinite(b.sortKey);
      if (aNum && bNum) return a.sortKey - b.sortKey;
      return 0;
    });
    if (sorted.length >= 2) {
      palettes.push({ name, swatches: sorted });
    }
  }

  if (palettes.length === 0) {
    throw new FigmaImportError(
      "Cada paleta necesita al menos 2 colores para adaptarse al sistema.",
    );
  }

  return palettes;
}

// ─── Adaptation heuristics ──────────────────────────────────────────────────

const NEUTRAL_NAME_RE = /neutral|gray|grey|gris|slate|stone/i;

function isNeutralPalette(name: string, swatches: ImportedSwatch[]): boolean {
  if (NEUTRAL_NAME_RE.test(name)) return true;
  const avgC =
    swatches.reduce((sum, s) => sum + s.oklch.c, 0) / swatches.length;
  return avgC < 0.02;
}

function fitChromaticPalette(
  group: ImportedPaletteGroup,
  globalScale: GlobalScaleConfig,
): PaletteConfig {
  const { swatches, name } = group;
  const n = swatches.length;
  const first = swatches[0].oklch;
  const last = swatches[n - 1].oklch;

  let peakIdx = 0;
  let maxC = -1;
  for (let i = 0; i < n; i++) {
    if (swatches[i].oklch.c > maxC) {
      maxC = swatches[i].oklch.c;
      peakIdx = i;
    }
  }

  const anchorHue = swatches[peakIdx].oklch.h;
  const peakStepIdx = getChromaPeakIndexByHue(anchorHue, CHROMATIC_STEPS);
  const expectedChroma = buildHueAwareChromaticChromaBase(
    CHROMATIC_STEPS.length,
    peakStepIdx,
    globalScale.chromaCurve.peak,
    globalScale.chromaCurve.edgeFactor,
  );
  const expectedPeakC = expectedChroma[peakStepIdx] || globalScale.chromaCurve.peak;
  const chromaMultiplier = clamp(maxC / expectedPeakC, 0.2, 2.5);

  const hueDriftLight = hueDelta(anchorHue, first.h);
  const hueDriftDark = hueDelta(anchorHue, last.h);

  return {
    id: crypto.randomUUID(),
    name: name.trim() || "sin nombre",
    type: "chromatic",
    anchor: { l: 0.65, c: 0.17, h: Math.round(anchorHue) },
    chromaMultiplier: +chromaMultiplier.toFixed(2),
    hueDriftLight: Math.round(hueDriftLight),
    hueDriftDark: Math.round(hueDriftDark),
  };
}

function fitNeutralPalette(group: ImportedPaletteGroup): PaletteConfig {
  const { swatches, name } = group;
  const avgC =
    swatches.reduce((sum, s) => sum + s.oklch.c, 0) / swatches.length;
  const avgH =
    swatches.reduce((sum, s) => sum + s.oklch.h, 0) / swatches.length;

  return {
    id: crypto.randomUUID(),
    name: name.trim() || "neutral",
    type: "neutral",
    anchor: { l: 0.65, c: clamp(avgC, 0.002, 0.02), h: Math.round(avgH) },
    chromaMultiplier: 1,
    hueDriftLight: 0,
    hueDriftDark: 0,
    neutralChroma: +clamp(avgC, 0.002, 0.02).toFixed(4),
  };
}

function groupToPaletteConfig(
  group: ImportedPaletteGroup,
  globalScale: GlobalScaleConfig,
): PaletteConfig {
  if (isNeutralPalette(group.name, group.swatches)) {
    return fitNeutralPalette(group);
  }
  return fitChromaticPalette(group, globalScale);
}

// ─── Main entry ─────────────────────────────────────────────────────────────

/**
 * Adapt a Figma variables collection JSON into PaletteConfig[] for our engine.
 * Step counts in Figma do not need to match ours — only the overall curve is used.
 */
export function adaptPalettesFromFigmaJson(
  json: string,
  globalScale: GlobalScaleConfig,
): PaletteConfig[] {
  const groups = parseFigmaVariablesJson(json);
  return groups.map((g) => groupToPaletteConfig(g, globalScale));
}
