// =============================================================================
// src/components/SystemInsights.tsx
// Compact insight cards shown above the palette matrix.
// =============================================================================

import { useState } from "react";
import { Button } from "@react-spectrum/s2/Button";
import type { SystemInsight, SystemInsights, InsightSeverity } from "../engines/insightEngine";

// ─── Severity styling ─────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<
  InsightSeverity,
  { borderColor: string; iconBg: string; icon: string; labelColor: string; labelBg: string }
> = {
  ok: {
    borderColor: "#16a34a",
    iconBg: "#dcfce7",
    icon: "✓",
    labelColor: "#15803d",
    labelBg: "#dcfce7",
  },
  warning: {
    borderColor: "#d97706",
    iconBg: "#fef3c7",
    icon: "!",
    labelColor: "#92400e",
    labelBg: "#fef3c7",
  },
  critical: {
    borderColor: "#dc2626",
    iconBg: "#fee2e2",
    icon: "✕",
    labelColor: "#991b1b",
    labelBg: "#fee2e2",
  },
};

// ─── Single insight card ──────────────────────────────────────────────────────

function InsightCard({
  insight,
  onFix,
}: {
  insight: SystemInsight;
  onFix?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEVERITY_CONFIG[insight.severity];

  return (
    <div
      style={{
        flex: "1 1 200px",
        minWidth: 180,
        maxWidth: 320,
        backgroundColor: "white",
        borderRadius: 10,
        borderLeft: `3px solid ${sev.borderColor}`,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            backgroundColor: sev.iconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 800,
            color: sev.labelColor,
            flexShrink: 0,
          }}
        >
          {sev.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              opacity: 0.5,
              lineHeight: 1,
              marginBottom: 3,
            }}
          >
            {insight.title}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.35 }}>
            {insight.summary}
          </div>
        </div>
      </div>

      {/* Expandable detail */}
      {expanded && (
        <div
          style={{
            fontSize: 11,
            lineHeight: 1.55,
            color: "rgba(0,0,0,0.6)",
            backgroundColor: "#f9f9f9",
            borderRadius: 6,
            padding: "8px 10px",
          }}
        >
          <div>{insight.detail}</div>
          {insight.severity !== "ok" && (
            <div style={{ marginTop: 6, fontWeight: 600, color: "rgba(0,0,0,0.75)" }}>
              → {insight.recommendation}
            </div>
          )}
          {insight.affectedPalettes.length > 0 && (
            <div style={{ marginTop: 4, opacity: 0.5, fontSize: 10 }}>
              {insight.affectedPalettes.length} paleta{insight.affectedPalettes.length > 1 ? "s" : ""} afectada{insight.affectedPalettes.length > 1 ? "s" : ""}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: "auto" }}>
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 11,
            color: "rgba(0,0,0,0.45)",
            padding: 0,
            fontFamily: "inherit",
            textDecoration: "underline",
          }}
        >
          {expanded ? "Ocultar" : "Ver detalle"}
        </button>
        {insight.canFix && onFix && insight.severity !== "ok" && (
          <div style={{ marginLeft: "auto" }}>
            <Button variant="accent" fillStyle="outline" onPress={onFix}>
              Corregir
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Panel with all 4 cards ───────────────────────────────────────────────────

interface Props {
  insights: SystemInsights;
  onFixChromaShape: () => void;
  onFixChromaPeak: () => void;
  onFixLightnessRange: () => void;
}

export function SystemInsights({ insights, onFixChromaShape, onFixChromaPeak, onFixLightnessRange }: Props) {
  const cards = [
    { insight: insights.lightnessRange, fix: onFixLightnessRange },
    { insight: insights.lSymmetry, fix: undefined },
    { insight: insights.chromaShape, fix: onFixChromaShape },
    { insight: insights.chromaPeak, fix: onFixChromaPeak },
  ];

  const totalIssues =
    (insights.lightnessRange.severity !== "ok" ? 1 : 0) +
    (insights.lSymmetry.severity !== "ok" ? 1 : 0) +
    (insights.chromaShape.severity !== "ok" ? 1 : 0) +
    (insights.chromaPeak.severity !== "ok" ? 1 : 0);

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: 14,
        padding: "16px 20px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      {/* Section header */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>
          Estado del sistema
        </h2>
        {totalIssues === 0 ? (
          <span
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 99,
              backgroundColor: "#dcfce7",
              color: "#15803d",
              fontWeight: 600,
            }}
          >
            ✓ Todo en orden
          </span>
        ) : (
          <span
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 99,
              backgroundColor: "#fef3c7",
              color: "#92400e",
              fontWeight: 600,
            }}
          >
            {totalIssues} aspecto{totalIssues > 1 ? "s" : ""} a revisar
          </span>
        )}
      </div>

      {/* Cards row */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        {cards.map(({ insight, fix }) => (
          <InsightCard key={insight.id} insight={insight} onFix={fix} />
        ))}
      </div>
    </div>
  );
}
