// =============================================================================
// src/components/PaletteMatrix.tsx
// =============================================================================

import { useState } from "react";
import { TooltipTrigger, Tooltip } from "@react-spectrum/s2/Tooltip";
import { ActionButton } from "@react-spectrum/s2/ActionButton";
import { Button } from "@react-spectrum/s2/Button";
import type {
  GeneratedPaletteSystem,
  GeneratedPalette,
  GeneratedColor,
  GlobalStepValues,
  CrossStepAudit,
} from "../engines/types";
import { HUE_ANCHOR_STEP } from "../engines/types";

interface Props {
  system: GeneratedPaletteSystem;
  selectedPaletteId: string | null;
  onSelectPalette: (id: string) => void;
  onAddChromatic?: () => void;
  onAddNeutral?: () => void;
}

function getStepMarker(
  step: string,
  kind: "chromatic" | "neutral",
): "hue" | "axis" | undefined {
  if (kind === "chromatic") {
    if (step === HUE_ANCHOR_STEP) return "hue";
    if (step === "600") return "axis";
  }
  if (kind === "neutral" && step === "500") return "axis";
  return undefined;
}

// SwatchCell: clicking only copies hex. Selection is via palette name row.
function SwatchCell({
  color,
  marker,
  isSelected,
  isChromaPeak,
}: {
  color: GeneratedColor;
  marker?: "hue" | "axis";
  isSelected: boolean;
  isChromaPeak: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const labelColor =
    color.oklch.l > 0.55 ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.85)";

  return (
    <TooltipTrigger delay={500} placement="bottom">
      <ActionButton
        aria-label={`${color.step}: ${color.hex}`}
        onPress={() => {
          navigator.clipboard.writeText(color.hex).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 1100);
        }}
        UNSAFE_style={{
          backgroundColor: color.hex,
          width: "100%",
          height: 64,
          minWidth: 0,
          borderRadius: 4,
          boxShadow: isSelected
            ? `0 0 0 2px white, 0 0 0 3.5px #0066cc`
            : marker === "axis"
              ? `0 0 0 2px white, 0 0 0 2.5px rgba(0,0,0,0.30)`
              : marker === "hue"
                ? `0 0 0 2px white, 0 0 0 2.5px ${color.hex}`
                : undefined,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          padding: "0 2px 5px",
          cursor: "pointer",
          position: "relative",
          border: "none",
        }}
      >
        {isChromaPeak && (
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              fontSize: 8,
              lineHeight: 1,
              fontWeight: 800,
              color: labelColor,
              backgroundColor:
                color.oklch.l > 0.55 ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.22)",
              borderRadius: 999,
              padding: "2px 4px",
            }}
          >
            C
          </span>
        )}
        {marker === "hue" && (
          <span style={{ position: "absolute", top: 4, fontSize: 7, color: labelColor }}>
            ★
          </span>
        )}
        {marker === "axis" && (
          <span style={{ position: "absolute", top: 4, fontSize: 7, color: labelColor }}>
            ⟺
          </span>
        )}
        <span
          style={{ color: labelColor, fontSize: 8.5, fontWeight: 600, fontFamily: "monospace" }}
        >
          {copied ? "✓" : color.hex}
        </span>
      </ActionButton>
      <Tooltip>
        <div style={{ fontFamily: "monospace", fontSize: 11, lineHeight: 1.6 }}>
          <strong>{color.step}</strong>
          <br />
          {color.hex}
          <br />
          oklch({color.oklch.l.toFixed(3)} {color.oklch.c.toFixed(3)} {color.oklch.h.toFixed(1)}°)
          {isChromaPeak && (
            <>
              <br />
              Peak C de esta paleta
            </>
          )}
          {color.deltaL !== null && (
            <>
              <br />
              ΔL {color.deltaL > 0 ? "+" : ""}
              {color.deltaL.toFixed(3)} · ΔC {color.deltaC! > 0 ? "+" : ""}
              {color.deltaC!.toFixed(3)}
            </>
          )}
        </div>
      </Tooltip>
    </TooltipTrigger>
  );
}

function PaletteRow({
  palette,
  kind,
  isSelected,
  onSelect,
}: {
  palette: GeneratedPalette;
  kind: "chromatic" | "neutral";
  isSelected: boolean;
  onSelect: () => void;
}) {
  const mid = palette.colors[Math.floor(palette.colors.length / 2)];
  const chromaPeakStep = palette.symmetryReport.chromaPeakStep;
  return (
    <>
      {/* Name cell — clicking here selects the palette */}
      <div
        onClick={onSelect}
        title="Clic para editar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "0 8px",
          cursor: "pointer",
          borderRadius: 6,
          backgroundColor: isSelected ? "rgba(0, 102, 204, 0.07)" : "transparent",
          userSelect: "none",
          transition: "background 0.1s",
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            backgroundColor: mid?.hex ?? "#ccc",
            flexShrink: 0,
          }}
        />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: isSelected ? "#0066cc" : "inherit",
            }}
          >
            {palette.config.name}
          </div>
          <div style={{ fontSize: 9, opacity: 0.4, textTransform: "uppercase", lineHeight: 1.2 }}>
            {palette.config.type}
          </div>
        </div>
      </div>

      {/* Swatches — clicking copies hex only */}
      {palette.colors.map((color) => (
        <SwatchCell
          key={color.step}
          color={color}
          marker={getStepMarker(color.step, kind)}
          isSelected={isSelected}
          isChromaPeak={kind === "chromatic" && color.step === chromaPeakStep}
        />
      ))}
    </>
  );
}

function AddPaletteRow({ label, onClick }: { label: string; onClick?: () => void }) {
  if (!onClick) return null;
  return (
    <div
      style={{
        gridColumn: "1 / -1",
        marginTop: 8,
        display: "flex",
        justifyContent: "flex-start",
      }}
    >
      <Button variant="secondary" fillStyle="outline" onPress={onClick}>
        + {label}
      </Button>
    </div>
  );
}

function MatrixSection({
  title,
  subtitle,
  stepValues,
  palettes,
  audit,
  kind,
  selectedPaletteId,
  onSelectPalette,
  onAdd,
  addLabel,
}: {
  title: string;
  subtitle: string;
  stepValues: GlobalStepValues[];
  palettes: GeneratedPalette[];
  audit: CrossStepAudit;
  kind: "chromatic" | "neutral";
  selectedPaletteId: string | null;
  onSelectPalette: (id: string) => void;
  onAdd?: () => void;
  addLabel?: string;
}) {
  const colCount = stepValues.length;
  const gridTemplateColumns = `130px repeat(${colCount}, minmax(48px, 1fr))`;
  const isEmpty = palettes.length === 0;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{title}</h3>
        <p style={{ margin: "3px 0 0", fontSize: 10.5, opacity: 0.45 }}>{subtitle}</p>
      </div>

      <div style={{ overflowX: "auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns,
            gap: "5px 3px",
            minWidth: 560,
          }}
        >
          {/* Column headers */}
          <div
            style={{
              fontSize: 9.5,
              opacity: 0.35,
              display: "flex",
              alignItems: "flex-end",
              paddingBottom: 3,
            }}
          >
            Paleta
          </div>
          {stepValues.map((sv) => (
            <div
              key={sv.step}
              style={{
                fontSize: 9.5,
                fontWeight: getStepMarker(sv.step, kind) ? 700 : 500,
                textAlign: "center",
                opacity: getStepMarker(sv.step, kind) ? 1 : 0.4,
                paddingBottom: 3,
                color: getStepMarker(sv.step, kind) === "hue" ? "#0066cc" : "inherit",
              }}
            >
              {sv.step}
            </div>
          ))}

          {/* Empty state inside grid */}
          {isEmpty && (
            <div
              style={{
                gridColumn: "1 / -1",
                padding: "20px 0",
                textAlign: "center",
                fontSize: 12,
                opacity: 0.3,
              }}
            >
              Sin paletas
            </div>
          )}

          {/* Palette rows */}
          {palettes.map((palette) => (
            <PaletteRow
              key={palette.config.id}
              palette={palette}
              kind={kind}
              isSelected={selectedPaletteId === palette.config.id}
              onSelect={() => onSelectPalette(palette.config.id)}
            />
          ))}

          {/* L global row */}
          {!isEmpty && (
            <>
              <div
                style={{
                  fontSize: 9.5,
                  fontWeight: 600,
                  opacity: 0.4,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 8,
                  paddingTop: 3,
                }}
              >
                L global
              </div>
              {stepValues.map((sv) => (
                <div
                  key={sv.step}
                  style={{
                    fontSize: 9.5,
                    textAlign: "center",
                    opacity: 0.5,
                    fontFamily: "monospace",
                    paddingTop: 3,
                  }}
                >
                  {sv.l.toFixed(3)}
                </div>
              ))}
            </>
          )}

          {/* Audit row (only if there are warnings) */}
          {!isEmpty && (audit.totalLWarnings > 0 || audit.totalCWarnings > 0) && (
            <>
              <div
                style={{
                  fontSize: 9.5,
                  fontWeight: 600,
                  opacity: 0.4,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 8,
                }}
              >
                Audit
              </div>
              {audit.rows.map((row) => {
                const hasWarning = row.lWarning || row.cWarning;
                return (
                  <div
                    key={row.step}
                    style={{
                      fontSize: 10,
                      textAlign: "center",
                      color: hasWarning ? "#e06800" : "#28a745",
                      paddingTop: 2,
                    }}
                  >
                    {hasWarning ? "⚠" : "✓"}
                  </div>
                );
              })}
            </>
          )}

          {/* Add button spanning full width */}
          <AddPaletteRow label={addLabel ?? "Agregar"} onClick={onAdd} />
        </div>
      </div>
    </div>
  );
}

export function PaletteMatrix({
  system,
  selectedPaletteId,
  onSelectPalette,
  onAddChromatic,
  onAddNeutral,
}: Props) {
  const chromaticPalettes = system.palettes.filter((p) => p.config.type === "chromatic");
  const neutralPalettes = system.palettes.filter((p) => p.config.type === "neutral");

  return (
    <div>
      <MatrixSection
        title="Paletas de color"
        subtitle="12 pasos · eje L simétrico 500↔600 · ★ = hue ancla"
        stepValues={system.chromaticStepValues}
        palettes={chromaticPalettes}
        audit={system.chromaticAudit}
        kind="chromatic"
        selectedPaletteId={selectedPaletteId}
        onSelectPalette={onSelectPalette}
        onAdd={onAddChromatic}
        addLabel="Agregar paleta de color"
      />
      <MatrixSection
        title="Paletas neutrales"
        subtitle="15 pasos · croma muy bajo · misma curva L global"
        stepValues={system.neutralStepValues}
        palettes={neutralPalettes}
        audit={system.neutralAudit}
        kind="neutral"
        selectedPaletteId={selectedPaletteId}
        onSelectPalette={onSelectPalette}
        onAdd={onAddNeutral}
        addLabel="Agregar paleta neutral"
      />
    </div>
  );
}
