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

/**
 * Figma Variables JSON — compatible with community import plugins
 * that support the W3C Design Token format (DTCG).
 */
function toFigmaVariables(palettes: GeneratedPalette[]): string {
  const variables: Record<string, unknown>[] = [];

  for (const p of palettes) {
    for (const c of p.colors) {
      const { r, g, b } = toSRGBChannels(c.hex);
      variables.push({
        name: `${p.config.name}/${p.config.name} ${c.step}`,
        type: "COLOR",
        valuesByMode: {
          "1:1": { r, g, b, a: 1 },
        },
        resolvedValuesByMode: {
          "1:1": { resolvedValue: { r, g, b, a: 1 }, alias: null },
        },
      });
    }
  }

  const result = {
    name: "Primitive Colors",
    modes: [{ modeId: "1:1", name: "Value" }],
    variables,
  };

  return JSON.stringify(result, null, 2);
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
