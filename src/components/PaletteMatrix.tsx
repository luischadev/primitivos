// =============================================================================
// src/components/PaletteMatrix.tsx
// =============================================================================

import { useState } from "react";
import { TooltipTrigger, Tooltip } from "@react-spectrum/s2/Tooltip";
import { ActionButton } from "@react-spectrum/s2/ActionButton";
import type {
  GeneratedPaletteSystem,
  GeneratedPalette,
  GeneratedColor,
  GlobalStepValues,
  CrossStepAudit,
} from "../engines/types";
import { HUE_ANCHOR_STEP } from "../engines/types";
import { ChromaComparisonChart } from "./ChromaComparisonChart";

interface Props {
  system: GeneratedPaletteSystem;
  selectedPaletteId: string | null;
  onSelectPalette: (id: string) => void;
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

function SwatchCell({
  color,
  marker,
  isSelected,
  onPress,
}: {
  color: GeneratedColor;
  marker?: "hue" | "axis";
  isSelected: boolean;
  onPress: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const labelColor =
    color.oklch.l > 0.55 ? "rgba(0,0,0,0.80)" : "rgba(255,255,255,0.90)";

  return (
    <TooltipTrigger delay={500} placement="bottom">
      <ActionButton
        aria-label={`${color.step}: ${color.hex}`}
        onPress={() => {
          navigator.clipboard.writeText(color.hex).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
          onPress();
        }}
        UNSAFE_style={{
          backgroundColor: color.hex,
          width: "100%",
          height: 72,
          minWidth: 0,
          borderRadius: 4,
          boxShadow: isSelected
            ? `0 0 0 2px white, 0 0 0 4px #0066cc`
            : marker === "axis"
              ? `0 0 0 2px white, 0 0 0 3px rgba(0,0,0,0.35)`
              : marker === "hue"
                ? `0 0 0 2px white, 0 0 0 3px ${color.hex}`
                : undefined,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          padding: "0 2px 6px",
          cursor: "pointer",
          position: "relative",
          border: "none",
        }}
      >
        {marker === "hue" && (
          <span style={{ position: "absolute", top: 5, fontSize: 8, color: labelColor }}>★</span>
        )}
        {marker === "axis" && (
          <span style={{ position: "absolute", top: 5, fontSize: 8, color: labelColor }}>⟺</span>
        )}
        <span style={{ color: labelColor, fontSize: 9, fontWeight: 600, fontFamily: "monospace" }}>
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
  return (
    <>
      <div
        onClick={onSelect}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "0 8px",
          cursor: "pointer",
          borderRadius: 6,
          backgroundColor: isSelected ? "rgba(0, 102, 204, 0.08)" : "transparent",
          minWidth: 0,
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            backgroundColor: mid?.hex ?? "#ccc",
            flexShrink: 0,
          }}
        />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: isSelected ? "#0066cc" : "inherit",
            }}
          >
            {palette.config.name}
          </div>
          <div style={{ fontSize: 9, opacity: 0.5, textTransform: "uppercase" }}>{palette.config.type}</div>
        </div>
      </div>
      {palette.colors.map((color) => (
        <SwatchCell
          key={color.step}
          color={color}
          marker={getStepMarker(color.step, kind)}
          isSelected={isSelected}
          onPress={onSelect}
        />
      ))}
    </>
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
  showChromaChart,
}: {
  title: string;
  subtitle: string;
  stepValues: GlobalStepValues[];
  palettes: GeneratedPalette[];
  audit: CrossStepAudit;
  kind: "chromatic" | "neutral";
  selectedPaletteId: string | null;
  onSelectPalette: (id: string) => void;
  showChromaChart?: boolean;
}) {
  if (palettes.length === 0) return null;

  const colCount = stepValues.length;
  const gridTemplateColumns = `140px repeat(${colCount}, minmax(52px, 1fr))`;

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{title}</h3>
        <p style={{ margin: "4px 0 0", fontSize: 11, opacity: 0.5 }}>{subtitle}</p>
      </div>
      <div style={{ overflowX: "auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns,
            gap: "6px 4px",
            minWidth: 600,
          }}
        >
          <div style={{ fontSize: 10, opacity: 0.4, display: "flex", alignItems: "flex-end", paddingBottom: 4 }}>
            Paleta
          </div>
          {stepValues.map((sv) => (
            <div
              key={sv.step}
              style={{
                fontSize: 10,
                fontWeight: getStepMarker(sv.step, kind) ? 700 : 500,
                textAlign: "center",
                opacity: getStepMarker(sv.step, kind) ? 1 : 0.5,
                paddingBottom: 4,
                color: getStepMarker(sv.step, kind) === "hue" ? "#0066cc" : "inherit",
              }}
            >
              {sv.step}
              {getStepMarker(sv.step, kind) === "axis" ? " ⟺" : ""}
            </div>
          ))}
          {palettes.map((palette) => (
            <PaletteRow
              key={palette.config.id}
              palette={palette}
              kind={kind}
              isSelected={selectedPaletteId === palette.config.id}
              onSelect={() => onSelectPalette(palette.config.id)}
            />
          ))}
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              opacity: 0.5,
              display: "flex",
              alignItems: "center",
              paddingLeft: 8,
              paddingTop: 4,
            }}
          >
            L global
          </div>
          {stepValues.map((sv) => (
            <div
              key={sv.step}
              style={{
                fontSize: 10,
                textAlign: "center",
                opacity: 0.6,
                fontFamily: "monospace",
                paddingTop: 4,
              }}
            >
              {sv.l.toFixed(3)}
            </div>
          ))}
          {(audit.totalLWarnings > 0 || audit.totalCWarnings > 0) && (
            <>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  opacity: 0.5,
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
                      fontSize: 11,
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
        </div>
      </div>

      {/* Chroma comparison chart (chromatic palettes only) */}
      {showChromaChart && palettes.length > 0 && (
        <ChromaComparisonChart
          palettes={palettes}
          selectedPaletteId={selectedPaletteId}
        />
      )}
    </div>
  );
}

export function PaletteMatrix({ system, selectedPaletteId, onSelectPalette }: Props) {
  const chromaticPalettes = system.palettes.filter((p) => p.config.type === "chromatic");
  const neutralPalettes = system.palettes.filter((p) => p.config.type === "neutral");

  if (system.palettes.length === 0) {
    return (
      <div style={{ padding: 48, textAlign: "center", opacity: 0.4, fontSize: 14 }}>
        No hay paletas. Agrega una con el botón &quot;Agregar paleta&quot;.
      </div>
    );
  }

  return (
    <div>
      <MatrixSection
        title="Paletas de color"
        subtitle="12 pasos · eje L simétrico 500↔600 · peak C automático por hue · ★ = referencia de hue"
        stepValues={system.chromaticStepValues}
        palettes={chromaticPalettes}
        audit={system.chromaticAudit}
        kind="chromatic"
        selectedPaletteId={selectedPaletteId}
        onSelectPalette={onSelectPalette}
        showChromaChart
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
      />
    </div>
  );
}
