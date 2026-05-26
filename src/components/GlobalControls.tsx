// =============================================================================
// src/components/GlobalControls.tsx
// =============================================================================

import { Slider } from "@react-spectrum/s2/Slider";
import { Button } from "@react-spectrum/s2/Button";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@react-spectrum/s2/SegmentedControl";
import type { GlobalScaleConfig, LightnessCurveMode, ChromaPeakMode } from "../engines/types";

function SectionLabel({ children }: { children: string }) {
  return (
    <p
      style={{
        margin: "0 0 10px",
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.09em",
        opacity: 0.45,
      }}
    >
      {children}
    </p>
  );
}

interface Props {
  globalScale: GlobalScaleConfig;
  onUpdateLightnessRange: (patch: Partial<GlobalScaleConfig["lightnessRange"]>) => void;
  onUpdateChromaCurve: (patch: Partial<GlobalScaleConfig["chromaCurve"]>) => void;
  onUpdateLightnessCurve: (patch: Partial<GlobalScaleConfig["lightnessCurve"]>) => void;
  onApplyAtlassianPreset: () => void;
}

export function GlobalControls({
  globalScale,
  onUpdateLightnessRange,
  onUpdateChromaCurve,
  onUpdateLightnessCurve,
  onApplyAtlassianPreset,
}: Props) {
  const { mode, easingStrength } = globalScale.lightnessCurve;
  const { peakMode } = globalScale.chromaCurve;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{ marginBottom: 16 }}>
        <Button
          variant="secondary"
          fillStyle="outline"
          onPress={onApplyAtlassianPreset}
        >
          Preset Atlassian
        </Button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <SectionLabel>Rango de Lightness</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Slider
            label="Paso más claro (L)"
            value={globalScale.lightnessRange.lightest}
            onChange={(v) => onUpdateLightnessRange({ lightest: v })}
            minValue={0.75}
            maxValue={1}
            step={0.005}
            formatOptions={{ minimumFractionDigits: 3, maximumFractionDigits: 3 }}
            isEmphasized
          />
          <Slider
            label="Paso más oscuro (L)"
            value={globalScale.lightnessRange.darkest}
            onChange={(v) => onUpdateLightnessRange({ darkest: v })}
            minValue={0}
            maxValue={0.40}
            step={0.005}
            formatOptions={{ minimumFractionDigits: 3, maximumFractionDigits: 3 }}
          />
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <SectionLabel>Intensidad de chroma</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ width: "100%", minWidth: 0 }}>
            <SegmentedControl
              aria-label="Modo de peak de chroma"
              selectedKey={peakMode}
              onSelectionChange={(key) =>
                onUpdateChromaCurve({ peakMode: String(key) as ChromaPeakMode })
              }
              isJustified
              UNSAFE_style={{ width: "100%" }}
            >
              <SegmentedControlItem id="auto-by-hue">Auto por hue</SegmentedControlItem>
              <SegmentedControlItem id="center">Centrado</SegmentedControlItem>
            </SegmentedControl>
          </div>
          <Slider
            label="Amplitud máxima (C peak)"
            value={globalScale.chromaCurve.peak}
            onChange={(v) => onUpdateChromaCurve({ peak: v })}
            minValue={0.05}
            maxValue={0.30}
            step={0.005}
            formatOptions={{ minimumFractionDigits: 3, maximumFractionDigits: 3 }}
            isEmphasized
          />
          <Slider
            label="C en extremos (edge factor)"
            value={globalScale.chromaCurve.edgeFactor}
            onChange={(v) => onUpdateChromaCurve({ edgeFactor: v })}
            minValue={0}
            maxValue={0.60}
            step={0.05}
            formatOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
          />
        </div>
      </div>

      <div>
        <SectionLabel>Curva de Lightness</SectionLabel>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ width: "100%", minWidth: 0 }}>
            <SegmentedControl
              aria-label="Modo de curva de Lightness"
              selectedKey={mode}
              onSelectionChange={(key) =>
                onUpdateLightnessCurve({ mode: String(key) as LightnessCurveMode })
              }
              isJustified
              UNSAFE_style={{ width: "100%" }}
            >
              <SegmentedControlItem id="linear">Lineal</SegmentedControlItem>
              <SegmentedControlItem id="edges">Extremos</SegmentedControlItem>
              <SegmentedControlItem id="full">Completa</SegmentedControlItem>
            </SegmentedControl>
          </div>

          <Slider
            label="Fuerza del easing"
            value={easingStrength}
            onChange={(v) => onUpdateLightnessCurve({ easingStrength: v })}
            minValue={0}
            maxValue={1}
            step={0.05}
            formatOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
            isDisabled={mode === "linear"}
          />
        </div>
      </div>
    </div>
  );
}
