// =============================================================================
// src/components/GlobalControls.tsx
// =============================================================================

import { Slider } from "@react-spectrum/s2/Slider";
import { Button } from "@react-spectrum/s2/Button";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@react-spectrum/s2/SegmentedControl";
import type { GlobalScaleConfig, GlobalStepValues, LightnessCurveMode, ChromaPeakMode } from "../engines/types";
import { CHROMATIC_STEPS, NEUTRAL_STEPS, HUE_ANCHOR_STEP } from "../engines/types";
import { buildGlobalStepValues } from "../engines/scaleEngine";

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

const CURVE_COPY: Record<LightnessCurveMode, string> = {
  linear: "Distribución completamente lineal: máxima predictibilidad entre pasos.",
  edges: "Centro lineal con extremos suavizados: buen balance para primitivas de UI.",
  full: "Toda la escala usa easing cúbico: apariencia más expresiva, pasos centrales más separados.",
};

function CurveMiniChart({
  title,
  values,
}: {
  title: string;
  values: GlobalStepValues[];
}) {
  const width = 220;
  const height = 62;
  const paddingX = 10;
  const paddingY = 8;
  const minL = Math.min(...values.map((v) => v.l));
  const maxL = Math.max(...values.map((v) => v.l));
  const span = Math.max(0.001, maxL - minL);

  const points = values.map((v, i) => {
    const x = paddingX + (i / Math.max(1, values.length - 1)) * (width - paddingX * 2);
    const y = paddingY + ((maxL - v.l) / span) * (height - paddingY * 2);
    return { x, y, step: v.step, l: v.l };
  });

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.5 }}>{title}</span>
        <span style={{ fontSize: 10, fontFamily: "monospace", opacity: 0.45 }}>
          {values.length} pasos
        </span>
      </div>
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Curva de Lightness para ${title}`}
        style={{
          display: "block",
          background: "#f7f7f7",
          borderRadius: 8,
          border: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <path d={path} fill="none" stroke="#1473e6" strokeWidth="2" strokeLinecap="round" />
        {points.map((p) => (
          <g key={p.step}>
            <line
              x1={p.x}
              y1={height - paddingY}
              x2={p.x}
              y2={p.y}
              stroke="rgba(20,115,230,0.18)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx={p.x} cy={p.y} r="2.4" fill="#1473e6" />
          </g>
        ))}
      </svg>
    </div>
  );
}

export function GlobalControls({
  globalScale,
  onUpdateLightnessRange,
  onUpdateChromaCurve,
  onUpdateLightnessCurve,
  onApplyAtlassianPreset,
}: Props) {
  const chromaticCurve = buildGlobalStepValues(globalScale, CHROMATIC_STEPS, "chromatic");
  const neutralCurve = buildGlobalStepValues(globalScale, NEUTRAL_STEPS, "neutral");
  const { mode, easingStrength } = globalScale.lightnessCurve;
  const { peakMode } = globalScale.chromaCurve;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <SectionLabel>Estructura global</SectionLabel>

      <div
        style={{
          marginBottom: 12,
          padding: "10px 12px",
          backgroundColor: "#f5f5f5",
          borderRadius: 8,
          fontSize: 11,
          lineHeight: 1.55,
          color: "rgba(0,0,0,0.65)",
        }}
      >
        <strong style={{ display: "block", marginBottom: 6 }}>Escalas fijas</strong>
        <div>
          Cromáticas: {CHROMATIC_STEPS.length} pasos ({CHROMATIC_STEPS[0]}–
          {CHROMATIC_STEPS[CHROMATIC_STEPS.length - 1]})
        </div>
        <div>
          Neutrales: {NEUTRAL_STEPS.length} pasos ({NEUTRAL_STEPS[0]}–
          {NEUTRAL_STEPS[NEUTRAL_STEPS.length - 1]})
        </div>
        <div style={{ marginTop: 8, color: "#16a34a", fontWeight: 600 }}>
          Eje L simétrico: entre 500 y 600 · Hue ref: paso {HUE_ANCHOR_STEP}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Button
          variant="secondary"
          fillStyle="outline"
          onPress={onApplyAtlassianPreset}
        >
          Preset Atlassian
        </Button>
        <p style={{ margin: "6px 0 0", fontSize: 10, opacity: 0.45, lineHeight: 1.4 }}>
          L targets y curva de chroma calibrados a las paletas de referencia de Atlassian.
        </p>
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
          <p style={{ margin: "-4px 0 4px", fontSize: 10, opacity: 0.4, lineHeight: 1.3 }}>
            Rango óptimo: 0.950 – 0.980
          </p>
          <Slider
            label="Paso más oscuro (L)"
            value={globalScale.lightnessRange.darkest}
            onChange={(v) => onUpdateLightnessRange({ darkest: v })}
            minValue={0}
            maxValue={0.40}
            step={0.005}
            formatOptions={{ minimumFractionDigits: 3, maximumFractionDigits: 3 }}
          />
          <p style={{ margin: "-4px 0 0", fontSize: 10, opacity: 0.4, lineHeight: 1.3 }}>
            Rango óptimo: 0.260 – 0.320
          </p>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <SectionLabel>Intensidad de chroma</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SegmentedControl
            aria-label="Modo de peak de chroma"
            selectedKey={peakMode}
            onSelectionChange={(key) =>
              onUpdateChromaCurve({ peakMode: String(key) as ChromaPeakMode })
            }
            isJustified
          >
            <SegmentedControlItem id="auto-by-hue">Auto por hue</SegmentedControlItem>
            <SegmentedControlItem id="center">Centrado</SegmentedControlItem>
          </SegmentedControl>
          <p style={{ margin: 0, fontSize: 10, opacity: 0.5, lineHeight: 1.4 }}>
            {peakMode === "auto-by-hue"
              ? "El pico de C se posiciona según el hue de cada paleta (amarillo → paso 300, azul → paso 700). Recomendado."
              : "Bell curve simétrica centrada. Útil cuando todas las paletas del sistema son de hues similares."}
          </p>
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
          <p style={{ margin: "-4px 0 4px", fontSize: 10, opacity: 0.4, lineHeight: 1.3 }}>
            Rango óptimo: 0.140 – 0.220 · Los colores fuera de gamut se ajustan automáticamente.
          </p>
          <Slider
            label="C en extremos (edge factor)"
            value={globalScale.chromaCurve.edgeFactor}
            onChange={(v) => onUpdateChromaCurve({ edgeFactor: v })}
            minValue={0}
            maxValue={0.60}
            step={0.05}
            formatOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
          />
          <p style={{ margin: "-4px 0 0", fontSize: 10, opacity: 0.4, lineHeight: 1.3 }}>
            C mínima en extremos = peak × factor. Amarillos/limas: 0.25-0.35. Azules/rojos: 0.10-0.20.
          </p>
        </div>
      </div>

      <div>
        <SectionLabel>Curva de Lightness</SectionLabel>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <CurveMiniChart title="Cromáticas" values={chromaticCurve} />
            <CurveMiniChart title="Neutrales" values={neutralCurve} />
          </div>

          <SegmentedControl
            aria-label="Modo de curva de Lightness"
            selectedKey={mode}
            onSelectionChange={(key) =>
              onUpdateLightnessCurve({ mode: String(key) as LightnessCurveMode })
            }
            isJustified
          >
            <SegmentedControlItem id="linear">Lineal</SegmentedControlItem>
            <SegmentedControlItem id="edges">Extremos</SegmentedControlItem>
            <SegmentedControlItem id="full">Completa</SegmentedControlItem>
          </SegmentedControl>

          <p style={{ margin: 0, fontSize: 11, lineHeight: 1.45, opacity: 0.6 }}>
            {CURVE_COPY[mode]}
          </p>

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
