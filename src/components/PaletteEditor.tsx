// =============================================================================
// src/components/PaletteEditor.tsx
// Compact right-panel editor for a single selected palette.
// Progressive disclosure: drift + type change are collapsed by default.
// =============================================================================

import { ColorWheel } from "@react-spectrum/s2/ColorWheel";
import { ColorSwatch } from "@react-spectrum/s2/ColorSwatch";
import { Slider } from "@react-spectrum/s2/Slider";
import { TextField } from "@react-spectrum/s2/TextField";
import { Button } from "@react-spectrum/s2/Button";
import { Switch } from "@react-spectrum/s2/Switch";
import DeleteIcon from "@react-spectrum/s2/icons/Delete";
import type { PaletteConfig, GeneratedPalette } from "../engines/types";
import { HUE_ANCHOR_STEP, CHROMATIC_STEPS } from "../engines/types";
import { suggestPaletteNameFromHue } from "../engines/namingEngine";
import { getChromaPeakIndexByHue } from "../engines/scaleEngine";
import { hexToOklch, hslToHex } from "../engines/colorConversions";
import { PalettePreview } from "./PalettePreview";

/**
 * Approximate the HSL hue that visually corresponds to a given OKLCH hue.
 * We sample a ring of HSL hues and find the one whose OKLCH hue is closest.
 */
function oklchHueToHslHue(oklchH: number): number {
  let best = 0;
  let bestDiff = 360;
  for (let hsl = 0; hsl < 360; hsl += 1) {
    const { h } = hexToOklch(hslToHex(hsl, 80, 50));
    const diff = Math.abs(((h - oklchH + 540) % 360) - 180);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = hsl;
    }
  }
  return best;
}

// ─── Hue zone ─────────────────────────────────────────────────────────────────

function getHueZone(hue: number): { zone: string; peakStep: string } {
  const h = ((hue % 360) + 360) % 360;
  if (h >= 60 && h < 110) return { zone: "Amarillo", peakStep: "300" };
  if (h >= 110 && h < 155) return { zone: "Lima", peakStep: "400" };
  if (h >= 155 && h < 215) return { zone: "Verde / Cyan", peakStep: "500" };
  if (h >= 215 && h < 265) return { zone: "Azul", peakStep: "700" };
  if (h >= 265 && h < 320) return { zone: "Violeta", peakStep: "500" };
  if (h >= 320 || h < 10) return { zone: "Magenta / Rosa", peakStep: "600" };
  if (h >= 10 && h < 45) return { zone: "Rojo / Coral", peakStep: "600" };
  return { zone: "Naranja", peakStep: "500" };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  paletteConfig: PaletteConfig;
  generatedPalette: GeneratedPalette | null;
  onUpdate: (patch: Partial<PaletteConfig>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
  showHeader?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PaletteEditor({
  paletteConfig,
  generatedPalette,
  onUpdate,
  onDuplicate,
  onDelete,
  onClose,
  showHeader = true,
}: Props) {
  const hueStep =
    paletteConfig.type === "chromatic"
      ? HUE_ANCHOR_STEP
      : (generatedPalette?.colors[Math.floor((generatedPalette?.colors.length ?? 1) / 2)]
          ?.step ?? "500");

  const anchorColor = generatedPalette?.colors.find((c) => c.step === hueStep);
  const suggestedName = suggestPaletteNameFromHue(paletteConfig.anchor.h);

  const hueZone =
    paletteConfig.type === "chromatic" ? getHueZone(paletteConfig.anchor.h) : null;

  const actualPeakStep = generatedPalette?.symmetryReport.chromaPeakStep ?? null;
  const expectedPeakStep =
    paletteConfig.type === "chromatic"
      ? CHROMATIC_STEPS[getChromaPeakIndexByHue(paletteConfig.anchor.h, CHROMATIC_STEPS)]
      : null;

  const peakMismatch =
    actualPeakStep && expectedPeakStep && actualPeakStep !== expectedPeakStep;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {showHeader && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
          }}
        >
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              opacity: 0.35,
            }}
          >
            Editar paleta
          </span>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 20,
              opacity: 0.3,
              padding: "0 4px",
              lineHeight: 1,
              fontFamily: "inherit",
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* ── Name ── */}
      <div style={{ marginBottom: 18 }}>
        <TextField
          label="Nombre"
          value={paletteConfig.name}
          onChange={(v) => onUpdate({ name: v })}
        />
        {paletteConfig.type === "chromatic" && (
          <p style={{ margin: "4px 0 0", fontSize: 10, opacity: 0.35, lineHeight: 1.3 }}>
            Sugerido: {suggestedName}
          </p>
        )}
      </div>

      {/* ── Hue wheel ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          marginBottom: 18,
        }}
      >
        {/* Display wheel using approximate HSL hue so the wheel position matches user perception */}
        <ColorWheel
          value={`hsl(${oklchHueToHslHue(paletteConfig.anchor.h)}, 80%, 50%)`}
          onChange={(color) => {
            const hsl = Math.round(
              (color as { getChannelValue: (ch: string) => number }).getChannelValue("hue"),
            );
            const hex = hslToHex(hsl, 80, 50);
            const { h: oklch } = hexToOklch(hex);
            onUpdate({ anchor: { ...paletteConfig.anchor, h: Math.round(oklch) } });
          }}
          size={162}
        />

        {anchorColor && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ColorSwatch
              color={anchorColor.hex}
              aria-label={`Anchor: ${anchorColor.hex}`}
              size="L"
              rounding="default"
            />
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, fontFamily: "monospace" }}>
                {anchorColor.hex}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 10, opacity: 0.45, fontFamily: "monospace" }}>
                HSL {oklchHueToHslHue(paletteConfig.anchor.h)}° → OKLCH {Math.round(paletteConfig.anchor.h)}° · paso {hueStep}
              </p>
            </div>
          </div>
        )}

        {/* Hue zone info */}
        {hueZone && (
          <div
            style={{
              fontSize: 10.5,
              color: peakMismatch ? "#9a4000" : "#004c8a",
              backgroundColor: peakMismatch ? "#fff3e0" : "#e8f3ff",
              borderRadius: 6,
              padding: "5px 10px",
              textAlign: "center",
              lineHeight: 1.5,
              width: "100%",
            }}
          >
            {hueZone.zone} · peak C: <strong>paso {hueZone.peakStep}</strong>
            {peakMismatch && (
              <span style={{ opacity: 0.75 }}> · actual: {actualPeakStep}</span>
            )}
          </div>
        )}
      </div>

      <PalettePreview palette={generatedPalette} />

      {/* ── Intensidad (chromatic only) ── */}
      {paletteConfig.type === "chromatic" && (
        <div style={{ marginBottom: 18 }}>
          <Slider
            label="Intensidad de color"
            value={paletteConfig.chromaMultiplier}
            onChange={(v) => onUpdate({ chromaMultiplier: v })}
            minValue={0.2}
            maxValue={1.8}
            step={0.05}
            formatOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
            isEmphasized
          />
          <p style={{ margin: "4px 0 0", fontSize: 10, opacity: 0.45, lineHeight: 1.3 }}>
            {paletteConfig.chromaMultiplier < 0.6
              ? "⚪ Muy desaturado"
              : paletteConfig.chromaMultiplier <= 1.3
                ? "✓ Rango óptimo"
                : "⚠ Alta intensidad · puede recortarse por gamut"}
          </p>
        </div>
      )}

      {paletteConfig.type === "neutral" && (
        <div style={{ marginBottom: 18 }}>
          <Slider
            label="Saturación"
            value={paletteConfig.neutralChroma ?? 0}
            onChange={(v) => onUpdate({ neutralChroma: v })}
            minValue={0}
            maxValue={0.025}
            step={0.001}
            formatOptions={{ minimumFractionDigits: 3, maximumFractionDigits: 3 }}
            isEmphasized
          />
          <p style={{ margin: "4px 0 0", fontSize: 10, opacity: 0.45, lineHeight: 1.3 }}>
            Tinte sutil sobre la rampa neutral. Usa la rueda de hue para elegir el color.
          </p>
        </div>
      )}

      {/* ── Balance ── */}
      {generatedPalette && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 10.5,
                padding: "3px 9px",
                borderRadius: 99,
                backgroundColor: generatedPalette.symmetryReport.isSymmetric
                  ? "#d4edda"
                  : "#fff3cd",
                color: generatedPalette.symmetryReport.isSymmetric ? "#155724" : "#856404",
              }}
            >
              {generatedPalette.symmetryReport.isSymmetric ? "✓ L simétrica" : "L asimétrica"}
            </span>
            <span
              style={{
                fontSize: 10.5,
                padding: "3px 9px",
                borderRadius: 99,
                backgroundColor: generatedPalette.symmetryReport.chromaIsBellCurve
                  ? "#d4edda"
                  : "#f8d7da",
                color: generatedPalette.symmetryReport.chromaIsBellCurve
                  ? "#155724"
                  : "#721c24",
              }}
            >
              {generatedPalette.symmetryReport.chromaIsBellCurve ? "✓ C campana" : "✗ C irregular"}
            </span>
            {actualPeakStep && (
              <span
                style={{
                  fontSize: 10.5,
                  padding: "3px 9px",
                  borderRadius: 99,
                  backgroundColor: "rgba(0,0,0,0.05)",
                  color: "rgba(0,0,0,0.5)",
                }}
              >
                C peak → {actualPeakStep}
              </span>
            )}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 18 }}>
        <Switch
          isSelected={paletteConfig.type === "neutral"}
          onChange={(checked) =>
            onUpdate({
              type: checked ? "neutral" : "chromatic",
              ...(checked ? { neutralChroma: 0 } : {}),
            })
          }
        >
          Paleta neutral
        </Switch>

        {paletteConfig.type === "chromatic" && (
          <>
            <Slider
              label="Hue drift → claros (°)"
              value={paletteConfig.hueDriftLight}
              onChange={(v) => onUpdate({ hueDriftLight: v })}
              minValue={-30}
              maxValue={30}
              step={1}
              formatOptions={{ signDisplay: "always", maximumFractionDigits: 0 }}
            />
            <Slider
              label="Hue drift → oscuros (°)"
              value={paletteConfig.hueDriftDark}
              onChange={(v) => onUpdate({ hueDriftDark: v })}
              minValue={-30}
              maxValue={30}
              step={1}
              formatOptions={{ signDisplay: "always", maximumFractionDigits: 0 }}
            />
          </>
        )}
      </div>

      {/* ── Actions ── */}
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
        <Button variant="secondary" fillStyle="outline" onPress={onDuplicate}>
          Duplicar
        </Button>
        <Button variant="secondary" fillStyle="outline" onPress={onDelete}>
          <DeleteIcon />
          Eliminar
        </Button>
      </div>
    </div>
  );
}
