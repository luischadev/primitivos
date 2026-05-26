// =============================================================================
// src/engines/exportEngine.ts
// Export a GeneratedPaletteSystem to various formats.
// =============================================================================

import type { GeneratedPaletteSystem, GeneratedPalette, ExportFormat } from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toLinearRGB(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const fromGamma = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return {
    r: fromGamma(parseInt(h.slice(0, 2), 16) / 255),
    g: fromGamma(parseInt(h.slice(2, 4), 16) / 255),
    b: fromGamma(parseInt(h.slice(4, 6), 16) / 255),
  };
}

function toSRGBChannels(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  };
}

// ─── Format generators ────────────────────────────────────────────────────────

function toJsonSimple(palettes: GeneratedPalette[]): string {
  const out: Record<string, Record<string, string>> = {};
  for (const p of palettes) {
    out[p.config.name] = {};
    for (const c of p.colors) {
      out[p.config.name][c.step] = c.hex;
    }
  }
  return JSON.stringify(out, null, 2);
}

function toJsonFull(palettes: GeneratedPalette[]): string {
  const out: Record<string, Record<string, unknown>> = {};
  for (const p of palettes) {
    out[p.config.name] = {};
    for (const c of p.colors) {
      out[p.config.name][c.step] = {
        hex: c.hex,
        oklch: {
          l: +c.oklch.l.toFixed(4),
          c: +c.oklch.c.toFixed(4),
          h: +c.oklch.h.toFixed(2),
        },
        isInGamut: c.isInGamut,
        wasChromaReduced: c.wasChromaReduced,
        ...(c.wasChromaReduced
          ? { originalC: +c.originalC.toFixed(4), resolvedC: +c.resolvedC.toFixed(4) }
          : {}),
      };
    }
  }
  return JSON.stringify(out, null, 2);
}

function toCSSVars(palettes: GeneratedPalette[]): string {
  const lines: string[] = [":root {"];
  for (const p of palettes) {
    lines.push(`  /* ${p.config.name} */`);
    for (const c of p.colors) {
      const gamutNote = c.wasChromaReduced ? " ⚠ chroma reduced" : "";
      lines.push(
        `  --${p.config.name}-${c.step}: ${c.hex}; /* oklch(${c.oklch.l.toFixed(3)} ${c.oklch.c.toFixed(3)} ${c.oklch.h.toFixed(1)})${gamutNote} */`,
      );
    }
  }
  lines.push("}");
  return lines.join("\n");
}

/** Slug for stable Figma-style IDs from palette id + step. */
function figmaVariableSlug(paletteId: string, step: string): string {
  return `${paletteId}-${step}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Figma Variables collection JSON — structure expected by Figma variable import plugins.
 */
function toFigmaVariables(palettes: GeneratedPalette[]): string {
  const modeId = "1:1";
  const variables: Record<string, unknown>[] = [];
  const variableIds: string[] = [];

  for (const p of palettes) {
    for (const c of p.colors) {
      const { r, g, b } = toSRGBChannels(c.hex);
      const rgba = { r, g, b, a: 1 };
      const id = `VariableID:${figmaVariableSlug(p.config.id, c.step)}`;

      variableIds.push(id);

      variables.push({
        id,
        name: `${p.config.name}/${p.config.name} ${c.step}`,
        description: "",
        type: "COLOR",
        valuesByMode: {
          [modeId]: rgba,
        },
        resolvedValuesByMode: {
          [modeId]: {
            resolvedValue: rgba,
            alias: null,
          },
        },
        scopes: [],
        hiddenFromPublishing: false,
        codeSyntax: {},
      });
    }
  }

  return JSON.stringify(
    {
      id: "VariableCollectionId:primitive-colors",
      name: "Primitive Colors",
      modes: {
        [modeId]: "Value",
      },
      variableIds,
      variables,
    },
    null,
    2,
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function exportSystem(system: GeneratedPaletteSystem, format: ExportFormat): string {
  switch (format) {
    case "json-simple":
      return toJsonSimple(system.palettes);
    case "json-full":
      return toJsonFull(system.palettes);
    case "css-vars":
      return toCSSVars(system.palettes);
    case "figma-variables":
      return toFigmaVariables(system.palettes);
  }
}
