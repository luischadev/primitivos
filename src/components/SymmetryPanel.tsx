import { StatusLight } from "@react-spectrum/s2/StatusLight";
import {
  Disclosure,
  DisclosureTitle,
  DisclosurePanel,
} from "@react-spectrum/s2/Disclosure";
import type { SymmetryReport } from "../../paletteEngine";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  report: SymmetryReport;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ flex: 1, height: 4, backgroundColor: "#f0f0f0", borderRadius: 2, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", backgroundColor: color, borderRadius: 2, transition: "width 0.3s" }} />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SymmetryPanel({ report }: Props) {
  return (
    <div style={{ backgroundColor: "white", borderRadius: 12, overflow: "hidden" }}>
      <Disclosure defaultExpanded={false}>
        <DisclosureTitle level={3}>Balance Report</DisclosureTitle>
        <DisclosurePanel>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 4 }}>

            {/* ── Status lights ── */}
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <StatusLight
                variant={report.isSymmetric ? "positive" : "notice"}
                role="status"
              >
                {report.isSymmetric ? "Symmetric steps" : "Asymmetric steps"}
              </StatusLight>
              <StatusLight
                variant={report.chromaIsBellCurve ? "positive" : "negative"}
                role="status"
              >
                {report.chromaIsBellCurve ? "Chroma bell curve ✓" : "Chroma bell curve ✗"}
              </StatusLight>
            </div>

            {/* ── Pairs table ── */}
            {report.pairs.length > 0 && (
              <div>
                <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", opacity: 0.5 }}>
                  Symmetric Pairs
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {/* Header */}
                  <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr", gap: 8, fontSize: 10, opacity: 0.5, fontWeight: 600 }}>
                    <span>Pair</span>
                    <span>ΔL diff</span>
                    <span>ΔC diff</span>
                  </div>
                  {/* Rows */}
                  {report.pairs.map((pair) => {
                    const lOk = pair.deltaLDiff < 0.02;
                    const cOk = pair.deltaCDiff < 0.01;
                    return (
                      <div
                        key={`${pair.stepA}-${pair.stepB}`}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "80px 1fr 1fr",
                          gap: 8,
                          alignItems: "center",
                          fontSize: 12,
                        }}
                      >
                        <span style={{ fontFamily: "monospace", fontWeight: 600, opacity: 0.7 }}>
                          {pair.stepA} ↔ {pair.stepB}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Bar value={pair.deltaLDiff} max={0.05} color={lOk ? "#28a745" : "#fd7e14"} />
                          <span style={{ fontSize: 10, fontFamily: "monospace", width: 44, textAlign: "right", color: lOk ? "#28a745" : "#fd7e14" }}>
                            {pair.deltaLDiff.toFixed(4)}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Bar value={pair.deltaCDiff} max={0.03} color={cOk ? "#28a745" : "#fd7e14"} />
                          <span style={{ fontSize: 10, fontFamily: "monospace", width: 44, textAlign: "right", color: cOk ? "#28a745" : "#fd7e14" }}>
                            {pair.deltaCDiff.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <p style={{ margin: "10px 0 0", fontSize: 10, opacity: 0.4 }}>
                  Thresholds: ΔL diff &lt; 0.02, ΔC diff &lt; 0.01
                </p>
              </div>
            )}
          </div>
        </DisclosurePanel>
      </Disclosure>
    </div>
  );
}
