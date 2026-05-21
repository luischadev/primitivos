import { useState, useMemo } from "react";
import {
  generatePalette,
  createDefaultConfig,
  type PaletteConfig,
  type PaletteResult,
  type OKLCHColor,
} from "../../paletteEngine";

// ─── Step presets ─────────────────────────────────────────────────────────────

export const STEP_PRESETS: Record<string, (string | number)[]> = {
  Tailwind: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950],
  Material: [100, 200, 300, 400, 500, 600, 700, 800, 900],
  "Linear 9": [1, 2, 3, 4, 5, 6, 7, 8, 9],
};

const DEFAULT_PRESET = "Tailwind";
const DEFAULT_ANCHOR: OKLCHColor = { l: 0.55, c: 0.18, h: 250 };

function midStep(steps: (string | number)[]): string {
  return String(steps[Math.floor(steps.length / 2)]);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePalette() {
  const [preset, setPreset] = useState(DEFAULT_PRESET);
  const [config, setConfig] = useState<PaletteConfig>(() =>
    createDefaultConfig(DEFAULT_ANCHOR, "500", STEP_PRESETS[DEFAULT_PRESET])
  );

  // Engine is pure + synchronous — safe to call directly in useMemo
  const result = useMemo<PaletteResult | null>(() => {
    try {
      return generatePalette(config);
    } catch {
      return null;
    }
  }, [config]);

  const updateAnchor = (partial: Partial<OKLCHColor>) =>
    setConfig((c) => ({ ...c, anchor: { ...c.anchor, ...partial } }));

  const updateLightnessRange = (partial: Partial<PaletteConfig["lightnessRange"]>) =>
    setConfig((c) => ({ ...c, lightnessRange: { ...c.lightnessRange, ...partial } }));

  const updateChromaCurve = (partial: Partial<PaletteConfig["chromaCurve"]>) =>
    setConfig((c) => ({ ...c, chromaCurve: { ...c.chromaCurve, ...partial } }));

  const updateEasing = (v: number) =>
    setConfig((c) => ({ ...c, easingStrength: v }));

  const setAnchorStep = (name: string) =>
    setConfig((c) => ({ ...c, anchorStepName: name }));

  const changePreset = (name: string) => {
    const steps = STEP_PRESETS[name];
    if (!steps) return;
    setPreset(name);
    setConfig((c) => ({ ...c, steps, anchorStepName: midStep(steps) }));
  };

  return {
    config,
    result,
    preset,
    updateAnchor,
    updateLightnessRange,
    updateChromaCurve,
    updateEasing,
    setAnchorStep,
    changePreset,
  };
}
