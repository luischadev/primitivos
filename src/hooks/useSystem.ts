// =============================================================================
// src/hooks/useSystem.ts
// Central React state for the multi-palette color system.
// Single source of truth for all configuration and generated output.
// =============================================================================

import { useState, useMemo, useCallback } from "react";
import {
  createDefaultSystem,
  type PaletteSystemConfig,
  type PaletteConfig,
  type GlobalScaleConfig,
  type OKLCHColor,
  type PaletteType,
} from "../engines/types";
import { generateSystem } from "../engines/systemEngine";
import { suggestPaletteNameFromHue, uniquePaletteName } from "../engines/namingEngine";
import { getChromaPeakIndexByHue } from "../engines/scaleEngine";

/** Suggested hue drift for orange-zone hues that naturally shift toward yellow in light tones. */
function suggestHueDrift(hue: number): { hueDriftLight: number; hueDriftDark: number } {
  const h = ((hue % 360) + 360) % 360;
  // Orange/amber zone: drift toward yellow in lights, stable in darks
  if (h >= 40 && h < 75) return { hueDriftLight: 20, hueDriftDark: 0 };
  // All other hues: minimal drift (Atlassian data shows ≤5° for non-orange hues)
  return { hueDriftLight: 0, hueDriftDark: 0 };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSystem() {
  const [config, setConfig] = useState<PaletteSystemConfig>(createDefaultSystem);

  // UI state — does not affect engine computation
  const [selectedPaletteId, setSelectedPaletteId] = useState<string | null>(null);

  // Engine runs synchronously; useMemo re-runs whenever config changes
  const system = useMemo(() => {
    try {
      return generateSystem(config);
    } catch (err) {
      console.error("[useSystem] generateSystem failed:", err);
      return null;
    }
  }, [config]);

  // ─── Palette operations ────────────────────────────────────────────────────

  const addPalette = useCallback(
    (anchor: OKLCHColor, type: PaletteType = "chromatic") => {
      setConfig((prev) => {
        const existingNames = prev.palettes.map((p) => p.name);
        const suggested = type === "neutral" ? "neutral" : suggestPaletteNameFromHue(anchor.h);
        const name = uniquePaletteName(suggested, existingNames);

        // Auto-suggest hue drift based on hue zone (orange gets natural light drift)
        const drift = type === "chromatic" ? suggestHueDrift(anchor.h) : { hueDriftLight: 0, hueDriftDark: 0 };

        const newPalette: PaletteConfig = {
          id: crypto.randomUUID(),
          name,
          type,
          anchor,
          chromaMultiplier: 1.0,
          ...drift,
          ...(type === "neutral" ? { neutralChroma: 0.005 } : {}),
        };

        return { ...prev, palettes: [...prev.palettes, newPalette] };
      });
    },
    [],
  );

  const duplicatePalette = useCallback((id: string) => {
    setConfig((prev) => {
      const source = prev.palettes.find((p) => p.id === id);
      if (!source) return prev;

      const existingNames = prev.palettes.map((p) => p.name);
      const name = uniquePaletteName(source.name, existingNames);

      const copy: PaletteConfig = {
        ...source,
        id: crypto.randomUUID(),
        name,
        locked: false,
      };

      const sourceIdx = prev.palettes.findIndex((p) => p.id === id);
      const palettes = [...prev.palettes];
      palettes.splice(sourceIdx + 1, 0, copy);

      return { ...prev, palettes };
    });
  }, []);

  const removePalette = useCallback((id: string) => {
    setConfig((prev) => ({
      ...prev,
      palettes: prev.palettes.filter((p) => p.id !== id),
    }));
    setSelectedPaletteId((current) => (current === id ? null : current));
  }, []);

  const updatePalette = useCallback((id: string, patch: Partial<PaletteConfig>) => {
    setConfig((prev) => ({
      ...prev,
      palettes: prev.palettes.map((p) =>
        p.id === id ? { ...p, ...patch } : p,
      ),
    }));
  }, []);

  const renamePalette = useCallback((id: string, name: string) => {
    updatePalette(id, { name: name.trim() || "sin nombre" });
  }, [updatePalette]);

  const movePalette = useCallback((id: string, direction: "up" | "down") => {
    setConfig((prev) => {
      const idx = prev.palettes.findIndex((p) => p.id === id);
      if (idx === -1) return prev;
      const next = direction === "up" ? idx - 1 : idx + 1;
      if (next < 0 || next >= prev.palettes.length) return prev;

      const palettes = [...prev.palettes];
      [palettes[idx], palettes[next]] = [palettes[next], palettes[idx]];
      return { ...prev, palettes };
    });
  }, []);

  // ─── Global scale operations ───────────────────────────────────────────────

  const updateGlobalScale = useCallback((patch: Partial<GlobalScaleConfig>) => {
    setConfig((prev) => ({
      ...prev,
      globalScale: { ...prev.globalScale, ...patch },
    }));
  }, []);

  const updateLightnessRange = useCallback(
    (patch: Partial<GlobalScaleConfig["lightnessRange"]>) => {
      setConfig((prev) => ({
        ...prev,
        globalScale: {
          ...prev.globalScale,
          lightnessRange: { ...prev.globalScale.lightnessRange, ...patch },
        },
      }));
    },
    [],
  );

  const updateChromaCurve = useCallback(
    (patch: Partial<GlobalScaleConfig["chromaCurve"]>) => {
      setConfig((prev) => ({
        ...prev,
        globalScale: {
          ...prev.globalScale,
          chromaCurve: { ...prev.globalScale.chromaCurve, ...patch },
        },
      }));
    },
    [],
  );

  const updateLightnessCurve = useCallback(
    (patch: Partial<GlobalScaleConfig["lightnessCurve"]>) => {
      setConfig((prev) => ({
        ...prev,
        globalScale: {
          ...prev.globalScale,
          lightnessCurve: { ...prev.globalScale.lightnessCurve, ...patch },
        },
      }));
    },
    [],
  );

  // ─── Insight fix actions ───────────────────────────────────────────────────

  /** Fix: reset chromaMultiplier to 1.0 for the given palette IDs (irregular C shape). */
  const fixChromaShape = useCallback((affectedIds: string[]) => {
    setConfig((prev) => ({
      ...prev,
      palettes: prev.palettes.map((p) =>
        affectedIds.includes(p.id) ? { ...p, chromaMultiplier: 1.0 } : p,
      ),
    }));
  }, []);

  /** Fix: switch peak mode to auto-by-hue. */
  const fixChromaPeak = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      globalScale: {
        ...prev.globalScale,
        chromaCurve: { ...prev.globalScale.chromaCurve, peakMode: "auto-by-hue" },
      },
    }));
  }, []);

  /** Fix: calibrate lightness range to Atlassian reference values. */
  const fixLightnessRange = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      globalScale: {
        ...prev.globalScale,
        lightnessRange: { lightest: 0.966, darkest: 0.296 },
      },
    }));
  }, []);

  /**
   * Applies the "Atlassian reference" preset:
   * - L targets calibrated to Atlassian mean values
   * - Peak C auto-by-hue enabled
   * - Easing: edges mode, strength 0.15
   * - Resets per-palette multipliers and drift to safe defaults
   */
  const applyAtlassianPreset = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      globalScale: {
        lightnessRange: { lightest: 0.966, darkest: 0.296 },
        chromaCurve: { peak: 0.185, edgeFactor: 0.20, peakMode: "auto-by-hue" },
        lightnessCurve: { mode: "edges", easingStrength: 0.15 },
      },
      palettes: prev.palettes.map((p) => ({
        ...p,
        chromaMultiplier: 1.0,
        ...suggestHueDrift(p.anchor.h),
      })),
    }));
  }, []);

  // ─── Derived helpers ───────────────────────────────────────────────────────

  const selectedPalette = config.palettes.find((p) => p.id === selectedPaletteId) ?? null;
  const selectedGenerated =
    system?.palettes.find((p) => p.config.id === selectedPaletteId) ?? null;

  return {
    config,
    system,
    selectedPaletteId,
    setSelectedPaletteId,
    selectedPalette,
    selectedGenerated,
    addPalette,
    duplicatePalette,
    removePalette,
    updatePalette,
    renamePalette,
    movePalette,
    updateGlobalScale,
    updateLightnessRange,
    updateChromaCurve,
    updateLightnessCurve,
    applyAtlassianPreset,
    getChromaPeakIndexByHue,
    fixChromaShape,
    fixChromaPeak,
    fixLightnessRange,
  };
}

export type SystemHook = ReturnType<typeof useSystem>;
