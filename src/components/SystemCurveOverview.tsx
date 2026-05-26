// =============================================================================
// src/components/SystemCurveOverview.tsx
// Always-visible curve overview shown above the palette matrix.
// =============================================================================

import type { GeneratedPalette, GlobalScaleConfig, GlobalStepValues } from "../engines/types";
import { CHROMATIC_STEPS, NEUTRAL_STEPS } from "../engines/types";
import { buildGlobalStepValues } from "../engines/scaleEngine";
import { ChromaComparisonChart } from "./ChromaComparisonChart";

function LightnessMiniChart({
  title,
  values,
}: {
  title: string;
  values: GlobalStepValues[];
}) {
  const width = 260;
  const height = 78;
  const paddingX = 10;
  const paddingY = 10;
  const minL = Math.min(...values.map((v) => v.l));
  const maxL = Math.max(...values.map((v) => v.l));
  const span = Math.max(0.001, maxL - minL);

  const points = values.map((v, i) => {
    const x = paddingX + (i / Math.max(1, values.length - 1)) * (width - paddingX * 2);
    const y = paddingY + ((maxL - v.l) / span) * (height - paddingY * 2);
    return { x, y, step: v.step };
  });

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.48 }}>{title}</span>
        <span style={{ fontSize: 10, fontFamily: "monospace", opacity: 0.38 }}>
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
          backgroundColor: "#f7f7f7",
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

export function SystemCurveOverview({
  globalScale,
  chromaticPalettes,
  selectedPaletteId,
}: {
  globalScale: GlobalScaleConfig;
  chromaticPalettes: GeneratedPalette[];
  selectedPaletteId: string | null;
}) {
  const chromaticCurve = buildGlobalStepValues(globalScale, CHROMATIC_STEPS, "chromatic");
  const neutralCurve = buildGlobalStepValues(globalScale, NEUTRAL_STEPS, "neutral");

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(240px, 1.2fr) minmax(180px, 0.8fr) minmax(180px, 0.8fr)",
        gap: 12,
        alignItems: "end",
      }}
    >
      <ChromaComparisonChart
        palettes={chromaticPalettes}
        selectedPaletteId={selectedPaletteId}
        compact
      />
      <LightnessMiniChart title="L cromáticas" values={chromaticCurve} />
      <LightnessMiniChart title="L neutrales" values={neutralCurve} />
    </div>
  );
}
