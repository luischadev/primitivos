// =============================================================================
// src/components/SystemInsights.tsx
// Minimal system status legend. Details open in a modal.
// =============================================================================

import { useState } from "react";
import { Button } from "@react-spectrum/s2/Button";
import { Dialog, DialogContainer, Heading, Content, Footer } from "@react-spectrum/s2/Dialog";
import type { SystemInsight, SystemInsights, InsightSeverity } from "../engines/insightEngine";

// ─── Severity styling ─────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<
  InsightSeverity,
  { icon: string; labelColor: string; labelBg: string; label: string }
> = {
  ok: {
    icon: "✓",
    labelColor: "#15803d",
    labelBg: "#dcfce7",
    label: "OK",
  },
  warning: {
    icon: "!",
    labelColor: "#92400e",
    labelBg: "#fef3c7",
    label: "Atención",
  },
  critical: {
    icon: "✕",
    labelColor: "#991b1b",
    labelBg: "#fee2e2",
    label: "Crítico",
  },
};

// ─── Single status button ─────────────────────────────────────────────────────

function InsightButton({
  insight,
  onPress,
}: {
  insight: SystemInsight;
  onPress: () => void;
}) {
  const sev = SEVERITY_CONFIG[insight.severity];

  return (
    <Button variant="secondary" fillStyle="outline" onPress={onPress}>
      <span style={{ color: sev.labelColor, fontWeight: 700 }}>{sev.icon}</span>
      <span>{insight.title}</span>
    </Button>
  );
}

// ─── Panel with all 4 cards ───────────────────────────────────────────────────

interface Props {
  insights: SystemInsights;
  onFixChromaShape: () => void;
  onFixLightnessRange: () => void;
}

export function SystemInsights({ insights, onFixChromaShape, onFixLightnessRange }: Props) {
  const [selectedInsight, setSelectedInsight] = useState<SystemInsight | null>(null);

  const cards = [
    { insight: insights.lightnessRange, fix: onFixLightnessRange },
    { insight: insights.lSymmetry, fix: undefined },
    { insight: insights.chromaShape, fix: onFixChromaShape },
  ];

  const selectedFix = cards.find((card) => card.insight.id === selectedInsight?.id)?.fix;
  const selectedSeverity = selectedInsight ? SEVERITY_CONFIG[selectedInsight.severity] : null;

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        {cards.map(({ insight }) => (
          <InsightButton
            key={insight.id}
            insight={insight}
            onPress={() => setSelectedInsight(insight)}
          />
        ))}
      </div>

      <DialogContainer onDismiss={() => setSelectedInsight(null)}>
        {selectedInsight && selectedSeverity && (
          <Dialog size="M" isDismissible>
            <Heading>{selectedInsight.title}</Heading>
            <Content>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <span
                  style={{
                    width: "fit-content",
                    fontSize: 12,
                    padding: "3px 9px",
                    borderRadius: 99,
                    backgroundColor: selectedSeverity.labelBg,
                    color: selectedSeverity.labelColor,
                    fontWeight: 700,
                  }}
                >
                  {selectedSeverity.icon} {selectedSeverity.label}
                </span>

                <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4 }}>
                  {selectedInsight.summary}
                </div>

                <div style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(0,0,0,0.68)" }}>
                  {selectedInsight.detail}
                </div>

                {selectedInsight.severity !== "ok" && (
                  <div
                    style={{
                      fontSize: 13,
                      lineHeight: 1.55,
                      padding: "10px 12px",
                      borderRadius: 8,
                      backgroundColor: "#f7f7f7",
                      color: "rgba(0,0,0,0.75)",
                      fontWeight: 600,
                    }}
                  >
                    {selectedInsight.recommendation}
                  </div>
                )}

                {selectedInsight.affectedPalettes.length > 0 && (
                  <div style={{ fontSize: 12, opacity: 0.55 }}>
                    {selectedInsight.affectedPalettes.length} paleta
                    {selectedInsight.affectedPalettes.length > 1 ? "s" : ""} afectada
                    {selectedInsight.affectedPalettes.length > 1 ? "s" : ""}
                  </div>
                )}
              </div>
            </Content>
            <Footer>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                {selectedInsight.canFix && selectedFix && selectedInsight.severity !== "ok" && (
                  <Button
                    variant="accent"
                    onPress={() => {
                      selectedFix();
                      setSelectedInsight(null);
                    }}
                  >
                    Corregir
                  </Button>
                )}
                <Button
                  variant="secondary"
                  fillStyle="outline"
                  onPress={() => setSelectedInsight(null)}
                >
                  Cerrar
                </Button>
              </div>
            </Footer>
          </Dialog>
        )}
      </DialogContainer>
    </>
  );
}
