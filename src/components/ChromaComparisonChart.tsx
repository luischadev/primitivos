// =============================================================================
// src/components/ChromaComparisonChart.tsx
// SVG overlay of all chromatic palettes' C curves — shows shapes and peaks.
// =============================================================================

import type { GeneratedPalette } from "../engines/types";
import { CHROMATIC_STEPS } from "../engines/types";
import { getChromaPeakIndexByHue } from "../engines/scaleEngine";

interface Props {
  palettes: GeneratedPalette[];
  selectedPaletteId: string | null;
}

const W = 600;
const H = 88;
const PX = 20;
const PY = 10;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Derive a readable line color from the palette's mid-step hex. */
function paletteLineColor(palette: GeneratedPalette, selected: boolean): string {
  const midColor = palette.colors[Math.floor(palette.colors.length / 2)];
  return selected
    ? (midColor?.hex ?? "#0066cc")
    : (midColor?.hex ?? "#aaa");
}

export function ChromaComparisonChart({ palettes, selectedPaletteId }: Props) {
  if (palettes.length === 0) return null;

  const n = palettes[0].colors.length;
  const allC = palettes.flatMap((p) => p.colors.map((c) => c.oklch.c));
  const maxC = Math.max(...allC, 0.05);

  const cx = (i: number) => PX + (i / Math.max(1, n - 1)) * (W - 2 * PX);
  const cy = (c: number) => H - PY - (c / maxC) * (H - 2 * PY);

  // Draw non-selected palettes first, selected on top
  const sorted = [...palettes].sort((a, b) => {
    const aSelected = a.config.id === selectedPaletteId;
    const bSelected = b.config.id === selectedPaletteId;
    return aSelected ? 1 : bSelected ? -1 : 0;
  });

  return (
    <div style={{ marginTop: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.45, textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Comparación de curvas C
        </span>
        <span style={{ fontSize: 10, opacity: 0.35 }}>
          ● = peak real · ◇ = peak esperado por hue
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H + 24}`}
        width="100%"
        style={{
          display: "block",
          backgroundColor: "#f9f9f9",
          borderRadius: 8,
          border: "1px solid rgba(0,0,0,0.06)",
          overflow: "visible",
        }}
        aria-label="Curvas de chroma de todas las paletas cromáticas"
      >
        {/* Horizontal grid lines */}
        {[0.05, 0.10, 0.15, 0.20].map((v) => {
          if (v > maxC * 1.05) return null;
          const y = cy(v);
          return (
            <g key={v}>
              <line
                x1={PX}
                y1={y}
                x2={W - PX}
                y2={y}
                stroke="rgba(0,0,0,0.06)"
                strokeWidth="1"
              />
              <text
                x={PX - 4}
                y={y + 3}
                fontSize="7"
                fill="rgba(0,0,0,0.3)"
                textAnchor="end"
                fontFamily="monospace"
              >
                {v.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Step labels on X axis */}
        {CHROMATIC_STEPS.map((step, i) => (
          <text
            key={step}
            x={cx(i)}
            y={H + 20}
            fontSize="8"
            fill="rgba(0,0,0,0.35)"
            textAnchor="middle"
            fontFamily="monospace"
          >
            {step}
          </text>
        ))}

        {/* Palette curves */}
        {sorted.map((palette) => {
          const isSelected = palette.config.id === selectedPaletteId;
          const color = paletteLineColor(palette, isSelected);
          const opacity = isSelected ? 1 : palettes.length === 1 ? 1 : 0.35;
          const strokeW = isSelected ? 2.5 : 1.5;

          const points = palette.colors.map((c, i) => ({
            x: cx(i),
            y: cy(c.oklch.c),
            c: c.oklch.c,
          }));

          const polyline = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

          // Actual peak position
          const actualPeakIdx = palette.symmetryReport.chromaPeakStep
            ? CHROMATIC_STEPS.indexOf(palette.symmetryReport.chromaPeakStep)
            : -1;

          // Expected peak position (hue-aware)
          const expectedPeakIdx = getChromaPeakIndexByHue(palette.config.anchor.h, CHROMATIC_STEPS);

          return (
            <g key={palette.config.id} opacity={opacity}>
              {/* Area fill under curve (only for selected or solo) */}
              {(isSelected || palettes.length === 1) && (
                <polyline
                  points={`${cx(0).toFixed(1)},${cy(0).toFixed(1)} ${polyline} ${cx(n - 1).toFixed(1)},${cy(0).toFixed(1)}`}
                  fill={color}
                  fillOpacity={0.06}
                  stroke="none"
                />
              )}

              {/* Main curve */}
              <polyline
                points={polyline}
                fill="none"
                stroke={color}
                strokeWidth={strokeW}
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {/* Actual peak marker — filled circle */}
              {actualPeakIdx >= 0 && (
                <circle
                  cx={cx(actualPeakIdx)}
                  cy={cy(points[actualPeakIdx].c)}
                  r={isSelected ? 4 : 3}
                  fill={color}
                  stroke="white"
                  strokeWidth="1.5"
                />
              )}

              {/* Expected peak marker — diamond */}
              {(() => {
                const x = cx(expectedPeakIdx);
                const y = cy(maxC * 0.92);
                const s = isSelected ? 4.5 : 3;
                return (
                  <polygon
                    points={`${x},${y - s} ${x + s},${y} ${x},${y + s} ${x - s},${y}`}
                    fill="none"
                    stroke={color}
                    strokeWidth={isSelected ? 1.5 : 1}
                    opacity={0.6}
                  />
                );
              })()}

              {/* Palette name label at peak (selected only) */}
              {isSelected && actualPeakIdx >= 0 && (
                <text
                  x={cx(actualPeakIdx)}
                  y={cy(points[actualPeakIdx].c) - 7}
                  fontSize="9"
                  fill={color}
                  textAnchor="middle"
                  fontFamily="system-ui, sans-serif"
                  fontWeight="700"
                >
                  {palette.config.name}
                </text>
              )}
            </g>
          );
        })}

        {/* Baseline */}
        <line
          x1={PX}
          y1={cy(0)}
          x2={W - PX}
          y2={cy(0)}
          stroke="rgba(0,0,0,0.10)"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}
