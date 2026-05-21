import type { PaletteResult } from "../../paletteEngine";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  result: PaletteResult;
}

interface MiniChartProps {
  label: string;
  color: string;
  points: { x: number; y: number; stepName: string | number }[];
  anchorIdx: number;
  yMin: number;
  yMax: number;
}

// ─── Sub-component: single chart ─────────────────────────────────────────────

const W = 400;
const H = 72;
const PAD = 10;

function MiniChart({ label, color, points, anchorIdx, yMin, yMax }: MiniChartProps) {
  const n = points.length;
  const range = yMax - yMin || 1;

  const cx = (i: number) => PAD + (i / (n - 1)) * (W - 2 * PAD);
  const cy = (v: number) => H - PAD - ((v - yMin) / range) * (H - 2 * PAD);

  const polylinePoints = points.map((p, i) => `${cx(i).toFixed(1)},${cy(p.y).toFixed(1)}`).join(" ");

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: "white",
        borderRadius: 10,
        padding: "12px 16px 8px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600, opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.07em" }}>
        {label}
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: "block", overflow: "visible" }}
        aria-label={label + " curve"}
      >
        {/* Baseline grid */}
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#e5e5e5" strokeWidth="1" />
        <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#e5e5e5" strokeWidth="1" />

        {/* Area fill under the curve */}
        <polyline
          points={`${cx(0).toFixed(1)},${H - PAD} ${polylinePoints} ${cx(n - 1).toFixed(1)},${H - PAD}`}
          fill={color}
          fillOpacity={0.08}
          stroke="none"
        />

        {/* Main curve */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Step dots */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={cx(i)}
            cy={cy(p.y)}
            r={i === anchorIdx ? 5 : 3}
            fill={i === anchorIdx ? "white" : color}
            stroke={color}
            strokeWidth={i === anchorIdx ? 2 : 0}
          />
        ))}

        {/* Step name labels on X axis */}
        {points.map((p, i) => {
          // Only show every other label to avoid crowding
          if (n > 7 && i % 2 !== 0 && i !== anchorIdx) return null;
          return (
            <text
              key={i}
              x={cx(i)}
              y={H + 2}
              textAnchor="middle"
              fontSize="8"
              fill={i === anchorIdx ? color : "#999"}
              fontFamily="monospace"
              fontWeight={i === anchorIdx ? "700" : "400"}
            >
              {p.stepName}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CurveChart({ result }: Props) {
  const anchorIdx = result.steps.findIndex(
    (s) => String(s.name) === result.config.anchorStepName
  );

  const lPoints = result.steps.map((s) => ({ x: 0, y: s.oklch.l, stepName: s.name }));
  const cPoints = result.steps.map((s) => ({ x: 0, y: s.oklch.c, stepName: s.name }));

  const maxC = Math.max(...result.steps.map((s) => s.oklch.c));

  return (
    <div style={{ display: "flex", gap: 12 }}>
      <MiniChart
        label="Lightness (L)"
        color="#0066dd"
        points={lPoints}
        anchorIdx={anchorIdx}
        yMin={0}
        yMax={1}
      />
      <MiniChart
        label="Chroma (C)"
        color="#e06800"
        points={cPoints}
        anchorIdx={anchorIdx}
        yMin={0}
        yMax={Math.max(maxC * 1.1, 0.05)}
      />
    </div>
  );
}
