import { useState } from "react";
import { TooltipTrigger, Tooltip } from "@react-spectrum/s2/Tooltip";
import { ActionButton } from "@react-spectrum/s2/ActionButton";
import type { PaletteResult } from "../../paletteEngine";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  result: PaletteResult;
  anchorStepName: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PaletteStrip({ result, anchorStepName }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (stepName: string, hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopied(String(stepName));
    setTimeout(() => setCopied(null), 1400);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* ── Swatch row ── */}
      <div style={{ display: "flex", gap: 4, borderRadius: 12, overflow: "hidden" }}>
        {result.steps.map((step) => {
          const isAnchor = String(step.name) === anchorStepName;
          const isCopied = copied === String(step.name);
          // Use light or dark label text based on perceptual lightness
          const labelColor = step.oklch.l > 0.55 ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.85)";

          return (
            <TooltipTrigger key={step.name} delay={600} placement="bottom">
              <ActionButton
                aria-label={`Step ${step.name}: ${step.hex}. Press to copy.`}
                onPress={() => handleCopy(String(step.name), step.hex)}
                UNSAFE_style={{
                  backgroundColor: step.hex,
                  flex: 1,
                  height: 88,
                  minWidth: 0,
                  borderRadius: isAnchor ? 6 : 2,
                  boxShadow: isAnchor ? "0 0 0 2px white, 0 0 0 4px " + step.hex : undefined,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  padding: "0 4px 8px",
                  cursor: "pointer",
                  transition: "transform 0.1s",
                  position: "relative",
                }}
              >
                {isAnchor && (
                  <span style={{ position: "absolute", top: 6, fontSize: 9, color: labelColor, opacity: 0.7 }}>
                    ★
                  </span>
                )}
                <span style={{ color: labelColor, fontSize: 10, fontWeight: 600, lineHeight: 1.2, fontFamily: "monospace" }}>
                  {isCopied ? "✓" : String(step.name)}
                </span>
                <span style={{ color: labelColor, fontSize: 9, opacity: 0.7, fontFamily: "monospace" }}>
                  {step.hex}
                </span>
              </ActionButton>
              <Tooltip>
                <span style={{ fontFamily: "monospace", fontSize: 12 }}>
                  {step.hex}
                  <br />
                  oklch({step.oklch.l.toFixed(3)} {step.oklch.c.toFixed(3)} {step.oklch.h.toFixed(1)})
                  {step.deltaL !== null && (
                    <>
                      <br />
                      ΔL {step.deltaL > 0 ? "+" : ""}{step.deltaL.toFixed(3)}
                      {"  "}ΔC {step.deltaC! > 0 ? "+" : ""}{step.deltaC!.toFixed(3)}
                    </>
                  )}
                </span>
              </Tooltip>
            </TooltipTrigger>
          );
        })}
      </div>

      {/* ── Step name labels below ── */}
      <div style={{ display: "flex", gap: 4 }}>
        {result.steps.map((step) => (
          <div
            key={step.name}
            style={{ flex: 1, minWidth: 0, textAlign: "center", fontSize: 10, opacity: 0.5 }}
          >
            {step.name}
          </div>
        ))}
      </div>
    </div>
  );
}
