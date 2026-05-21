// =============================================================================
// src/components/CrossStepAudit.tsx
// =============================================================================

import { StatusLight } from "@react-spectrum/s2/StatusLight";
import {
  Disclosure,
  DisclosureTitle,
  DisclosurePanel,
} from "@react-spectrum/s2/Disclosure";
import type { CrossStepAudit } from "../engines/types";

interface Props {
  title: string;
  audit: CrossStepAudit;
  showChroma?: boolean;
}

function ProgressBar({ value, max, warn }: { value: number; max: number; warn: boolean }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div
      style={{
        flex: 1,
        height: 4,
        backgroundColor: "#f0f0f0",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          backgroundColor: warn ? "#e06800" : "#28a745",
          borderRadius: 2,
        }}
      />
    </div>
  );
}

export function CrossStepAudit({ title, audit, showChroma = true }: Props) {
  const hasWarnings = audit.totalLWarnings > 0 || audit.totalCWarnings > 0;

  if (audit.rows.length === 0) return null;

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <Disclosure defaultExpanded={hasWarnings}>
        <DisclosureTitle level={3}>
          {title}
          {hasWarnings && (
            <span
              style={{
                marginLeft: 10,
                fontSize: 11,
                padding: "2px 7px",
                borderRadius: 99,
                backgroundColor: "#fff3cd",
                color: "#856404",
              }}
            >
              {audit.totalLWarnings + audit.totalCWarnings} advertencias
            </span>
          )}
        </DisclosureTitle>
        <DisclosurePanel>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 4 }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <StatusLight variant={audit.totalLWarnings === 0 ? "positive" : "notice"} role="status">
                {audit.totalLWarnings === 0
                  ? "Lightness consistente"
                  : `${audit.totalLWarnings} paso(s) con ΔL > ${audit.lThreshold}`}
              </StatusLight>
              {showChroma && (
                <StatusLight variant={audit.totalCWarnings === 0 ? "positive" : "notice"} role="status">
                  {audit.totalCWarnings === 0
                    ? "Chroma consistente"
                    : `${audit.totalCWarnings} paso(s) con ΔC > ${audit.cThreshold}`}
                </StatusLight>
              )}
            </div>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 11,
                  fontFamily: "monospace",
                }}
              >
                <thead>
                  <tr style={{ opacity: 0.5, fontSize: 10, textTransform: "uppercase" }}>
                    <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: 700 }}>Paso</th>
                    <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: 700, minWidth: 140 }}>
                      Rango L
                    </th>
                    {showChroma && (
                      <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: 700, minWidth: 140 }}>
                        Rango C
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {audit.rows.map((row) => (
                    <tr
                      key={row.step}
                      style={{
                        backgroundColor:
                          row.lWarning || row.cWarning ? "rgba(224,104,0,0.04)" : "transparent",
                      }}
                    >
                      <td
                        style={{
                          padding: "4px 8px",
                          fontWeight: 700,
                          color: row.lWarning || row.cWarning ? "#e06800" : "rgba(0,0,0,0.7)",
                        }}
                      >
                        {row.step}
                      </td>
                      <td style={{ padding: "4px 8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <ProgressBar value={row.lRange} max={0.05} warn={row.lWarning} />
                          <span
                            style={{
                              width: 54,
                              textAlign: "right",
                              color: row.lWarning ? "#e06800" : "rgba(0,0,0,0.5)",
                            }}
                          >
                            {row.lRange.toFixed(4)}
                          </span>
                        </div>
                      </td>
                      {showChroma && (
                        <td style={{ padding: "4px 8px" }}>
                          {row.cValues.length > 1 ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <ProgressBar value={row.cRange} max={0.04} warn={row.cWarning} />
                              <span
                                style={{
                                  width: 54,
                                  textAlign: "right",
                                  color: row.cWarning ? "#e06800" : "rgba(0,0,0,0.5)",
                                }}
                              >
                                {row.cRange.toFixed(4)}
                              </span>
                            </div>
                          ) : (
                            <span style={{ opacity: 0.3 }}>—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DisclosurePanel>
      </Disclosure>
    </div>
  );
}
