// =============================================================================
// src/engines/exportEngine.ts
// Export a GeneratedPaletteSystem to various formats.
// =============================================================================

import type {
  GeneratedPaletteSystem,
  GeneratedPalette,
  GeneratedAlphaPalette,
  ExportFormat,
} from "./types";

function palettesForExport(system: GeneratedPaletteSystem): GeneratedPalette[] {
  return system.darkNeutral
    ? [...system.palettes, system.darkNeutral]
    : system.palettes;
}

function alphaPalettesForExport(system: GeneratedPaletteSystem): GeneratedAlphaPalette[] {
  return [system.neutralAlpha, system.darkNeutralAlpha].filter(
    (p): p is GeneratedAlphaPalette => p !== null,
  );
}

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

function toJsonSimple(
  palettes: GeneratedPalette[],
  alphaPalettes: GeneratedAlphaPalette[],
): string {
  const out: Record<string, Record<string, string>> = {};
  for (const p of palettes) {
    out[p.config.name] = {};
    for (const c of p.colors) {
      out[p.config.name][c.step] = c.hex;
    }
  }
  for (const p of alphaPalettes) {
    out[p.name] = {};
    for (const c of p.colors) {
      out[p.name][`${c.step}A`] = c.hex8;
    }
  }
  return JSON.stringify(out, null, 2);
}

function toJsonFull(
  palettes: GeneratedPalette[],
  alphaPalettes: GeneratedAlphaPalette[],
): string {
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
  for (const p of alphaPalettes) {
    out[p.name] = {};
    for (const c of p.colors) {
      out[p.name][`${c.step}A`] = {
        hex8: c.hex8,
        baseHex: p.baseHex,
        alpha: c.alpha,
        rgba: c.rgba,
        compositeHex: c.compositeHex,
      };
    }
  }
  return JSON.stringify(out, null, 2);
}

function toCSSVars(
  palettes: GeneratedPalette[],
  alphaPalettes: GeneratedAlphaPalette[],
): string {
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
  for (const p of alphaPalettes) {
    lines.push(`  /* ${p.name} — base ${p.baseHex} */`);
    for (const c of p.colors) {
      const { r, g, b, a } = c.rgba;
      lines.push(
        `  --${p.name}-${c.step}A: ${c.hex8}; /* rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a}) */`,
      );
    }
  }
  lines.push("}");
  return lines.join("\n");
}

type FigmaColorToken = {
  $type: "color";
  $value: {
    colorSpace: "srgb";
    components: [number, number, number];
    alpha: number;
    hex: string;
  };
};

function toFigmaJson(
  palettes: GeneratedPalette[],
  alphaPalettes: GeneratedAlphaPalette[],
): string {
  const out: Record<string, Record<string, FigmaColorToken>> = {};

  for (const p of palettes) {
    out[p.config.name] = {};
    for (const c of p.colors) {
      const { r, g, b } = toSRGBChannels(c.hex);
      out[p.config.name][`${p.config.name} ${c.step}`] = {
        $type: "color",
        $value: {
          colorSpace: "srgb",
          components: [r, g, b],
          alpha: 1,
          hex: c.hex.toUpperCase(),
        },
      };
    }
  }

  toFigmaJsonAlpha(out, alphaPalettes);

  return JSON.stringify(out, null, 2);
}

function toFigmaJsonAlpha(
  out: Record<string, Record<string, FigmaColorToken>>,
  alphaPalettes: GeneratedAlphaPalette[],
): void {
  for (const p of alphaPalettes) {
    out[p.name] = {};
    for (const c of p.colors) {
      out[p.name][`${p.name} ${c.step}A`] = {
        $type: "color",
        $value: {
          colorSpace: "srgb",
          components: [c.rgba.r, c.rgba.g, c.rgba.b],
          alpha: c.rgba.a,
          hex: c.hex8,
        },
      };
    }
  }
}

/** Slug for stable Figma-style IDs from palette id + step. */
function figmaVariableSlug(paletteId: string, step: string): string {
  return `${paletteId}-${step}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Figma Variables collection JSON — structure expected by Figma variable import plugins.
 */
function toFigmaVariables(
  palettes: GeneratedPalette[],
  alphaPalettes: GeneratedAlphaPalette[],
): string {
  const modeId = "1:1";
  const variables: Record<string, unknown>[] = [];
  const variableIds: string[] = [];

  const pushVariable = (
    id: string,
    name: string,
    rgba: { r: number; g: number; b: number; a: number },
  ) => {
    variableIds.push(id);
    variables.push({
      id,
      name,
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
  };

  for (const p of palettes) {
    for (const c of p.colors) {
      const { r, g, b } = toSRGBChannels(c.hex);
      pushVariable(
        `VariableID:${figmaVariableSlug(p.config.id, c.step)}`,
        `${p.config.name}/${p.config.name} ${c.step}`,
        { r, g, b, a: 1 },
      );
    }
  }

  for (const p of alphaPalettes) {
    for (const c of p.colors) {
      pushVariable(
        `VariableID:${figmaVariableSlug(p.name, `${c.step}a`)}`,
        `${p.name}/${p.name} ${c.step}A`,
        c.rgba,
      );
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
  const palettes = palettesForExport(system);
  const alphaPalettes = alphaPalettesForExport(system);
  switch (format) {
    case "json-simple":
      return toJsonSimple(palettes, alphaPalettes);
    case "json-full":
      return toJsonFull(palettes, alphaPalettes);
    case "css-vars":
      return toCSSVars(palettes, alphaPalettes);
    case "figma-variables":
      return toFigmaVariables(palettes, alphaPalettes);
    case "figma-json":
      return toFigmaJson(palettes, alphaPalettes);
  }
}
