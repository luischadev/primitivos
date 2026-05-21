// =============================================================================
// src/components/PaletteEditor.tsx
// Sidebar panel for editing a single selected palette.
// Only palette-specific parameters are editable here.
// =============================================================================

import { ColorWheel } from "@react-spectrum/s2/ColorWheel";
import { ColorSwatch } from "@react-spectrum/s2/ColorSwatch";
import { Slider } from "@react-spectrum/s2/Slider";
import { TextField } from "@react-spectrum/s2/TextField";
import { Button } from "@react-spectrum/s2/Button";
import { Switch } from "@react-spectrum/s2/Switch";
import type { PaletteConfig, GeneratedPalette } from "../engines/types";
import { HUE_ANCHOR_STEP, CHROMATIC_STEPS } from "../engines/types";
import { suggestPaletteNameFromHue } from "../engines/namingEngine";
import { getChromaPeakIndexByHue } from "../engines/scaleEngine";

// ─── Hue zone helpers ─────────────────────────────────────────────────────────

function getHueZoneLabel(hue: number): { zone: string; peakStep: string; driftNote: string } {
  const h = ((hue % 360) + 360) % 360;
  if (h >= 60 && h < 110)   return { zone: "Amarillo", peakStep: "300", driftNote: "Drift ≤ 10° recomendado" };
  if (h >= 110 && h < 155)  return { zone: "Lima / Verde-amarillo", peakStep: "400", driftNote: "Drift ≤ 5°" };
  if (h >= 155 && h < 215)  return { zone: "Verde / Cyan", peakStep: "500", driftNote: "Drift ≤ 5°" };
  if (h >= 215 && h < 265)  return { zone: "Azul", peakStep: "700", driftNote: "Drift ≤ 5°" };
  if (h >= 265 && h < 320)  return { zone: "Violeta / Púrpura", peakStep: "500", driftNote: "Drift ≤ 5°" };
  if (h >= 320 || h < 10)   return { zone: "Magenta / Rojo-rosa", peakStep: "600", driftNote: "Drift ≤ 5°" };
  if (h >= 10 && h < 45)    return { zone: "Rojo / Coral", peakStep: "600", driftNote: "Drift ≤ 5°" };
  return { zone: "Naranja", peakStep: "500", driftNote: "Drift luz ~20° es natural" };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  paletteConfig: PaletteConfig;
  generatedPalette: GeneratedPalette | null;
  onUpdate: (patch: Partial<PaletteConfig>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p
      style={{
        margin: "0 0 8px",
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.09em",
        opacity: 0.45,
      }}
    >
      {children}
    </p>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PaletteEditor({
  paletteConfig,
  generatedPalette,
  onUpdate,
  onDuplicate,
  onDelete,
}: Props) {
  const hueStep =
    paletteConfig.type === "chromatic"
      ? HUE_ANCHOR_STEP
      : generatedPalette?.colors[Math.floor((generatedPalette?.colors.length ?? 1) / 2)]?.step ?? "500";

  const anchorColor = generatedPalette?.colors.find((c) => c.step === hueStep);

  const suggestedName = suggestPaletteNameFromHue(paletteConfig.anchor.h);
  const hueZone = paletteConfig.type === "chromatic"
    ? getHueZoneLabel(paletteConfig.anchor.h)
    : null;

  const actualPeakStep = generatedPalette?.symmetryReport.chromaPeakStep ?? null;
  const expectedPeakIdx = paletteConfig.type === "chromatic"
    ? getChromaPeakIndexByHue(paletteConfig.anchor.h, CHROMATIC_STEPS)
    : null;
  const expectedPeakStep = expectedPeakIdx !== null ? CHROMATIC_STEPS[expectedPeakIdx] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── Palette identity ── */}
      <div>
        <SectionLabel>Identidad</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <TextField
            label="Nombre de paleta"
            value={paletteConfig.name}
            onChange={(v) => onUpdate({ name: v })}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 0",
            }}
          >
            <Switch
              isSelected={paletteConfig.type === "neutral"}
              onChange={(checked) =>
                onUpdate({
                  type: checked ? "neutral" : "chromatic",
                  ...(checked ? { neutralChroma: 0.005 } : {}),
                })
              }
            >
              Paleta neutral
            </Switch>
          </div>
          {paletteConfig.type === "neutral" && (
            <Slider
              label="Neutral chroma"
              value={paletteConfig.neutralChroma ?? 0}
              onChange={(v) => onUpdate({ neutralChroma: v })}
              minValue={0}
              maxValue={0.05}
              step={0.001}
              formatOptions={{ minimumFractionDigits: 3, maximumFractionDigits: 3 }}
            />
          )}
        </div>
      </div>

      {/* ── Anchor color ── */}
      <div>
        <SectionLabel>Color ancla</SectionLabel>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <ColorWheel
            value={`hsl(${paletteConfig.anchor.h}, 70%, 50%)`}
            onChange={(color) => {
              const h = Math.round(
                (color as { getChannelValue: (ch: string) => number }).getChannelValue("hue"),
              );
              onUpdate({ anchor: { ...paletteConfig.anchor, h } });
            }}
            size={148}
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
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "monospace",
                  }}
                >
                  {anchorColor.hex}
                </p>
                <p style={{ margin: 0, fontSize: 10, opacity: 0.55 }}>
                  oklch({paletteConfig.anchor.l.toFixed(2)}{" "}
                  {paletteConfig.anchor.c.toFixed(3)}{" "}
                  {Math.round(paletteConfig.anchor.h)}°)
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 9, opacity: 0.4 }}>
                  Sugerido: {suggestedName}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── L and C reference sliders ── */}
      <div>
        <SectionLabel>Referencia del ancla</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Slider
            label="Lightness (L)"
            value={paletteConfig.anchor.l}
            onChange={(v) => onUpdate({ anchor: { ...paletteConfig.anchor, l: v } })}
            minValue={0}
            maxValue={1}
            step={0.01}
            formatOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
          />
          <Slider
            label="Chroma (C)"
            value={paletteConfig.anchor.c}
            onChange={(v) => onUpdate({ anchor: { ...paletteConfig.anchor, c: v } })}
            minValue={0}
            maxValue={0.4}
            step={0.005}
            formatOptions={{ minimumFractionDigits: 3, maximumFractionDigits: 3 }}
          />
        </div>
      </div>

      {/* ── Hue zone info ── */}
      {paletteConfig.type === "chromatic" && hueZone && (
        <div
          style={{
            padding: "8px 12px",
            backgroundColor: "#f0f7ff",
            borderRadius: 8,
            fontSize: 11,
            lineHeight: 1.5,
            color: "#0050a0",
          }}
        >
          <strong>{hueZone.zone}</strong>
          <div style={{ opacity: 0.8, marginTop: 2 }}>
            Peak C esperado: paso <strong>{hueZone.peakStep}</strong>
            {actualPeakStep && actualPeakStep !== expectedPeakStep && (
              <span style={{ marginLeft: 6, color: "#e06800" }}>
                · actual: {actualPeakStep}
              </span>
            )}
          </div>
          <div style={{ opacity: 0.65, marginTop: 1 }}>{hueZone.driftNote}</div>
        </div>
      )}

      {/* ── Intensidad de color (chromaMultiplier) ── */}
      {paletteConfig.type === "chromatic" && (
        <div>
          <SectionLabel>Intensidad de color</SectionLabel>
          <Slider
            label="Intensidad (× amplitud global)"
            value={paletteConfig.chromaMultiplier}
            onChange={(v) => onUpdate({ chromaMultiplier: v })}
            minValue={0.2}
            maxValue={1.8}
            step={0.05}
            formatOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
            isEmphasized
          />
          <p style={{ margin: "4px 0 0", fontSize: 10, opacity: 0.45, lineHeight: 1.4 }}>
            {paletteConfig.chromaMultiplier < 0.6
              ? "⚪ Paleta muy desaturada"
              : paletteConfig.chromaMultiplier <= 1.3
              ? "✓ Rango óptimo (0.60 – 1.30)"
              : "⚠ Alta intensidad · puede reducir chroma por límite de gamut"}
          </p>
        </div>
      )}

      {/* ── Hue drift ── */}
      {paletteConfig.type === "chromatic" && (
        <div>
          <SectionLabel>Hue drift</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Slider
              label="Hacia claros (°)"
              value={paletteConfig.hueDriftLight}
              onChange={(v) => onUpdate({ hueDriftLight: v })}
              minValue={-30}
              maxValue={30}
              step={1}
              formatOptions={{ signDisplay: "always", maximumFractionDigits: 0 }}
            />
            <p style={{ margin: "-4px 0 4px", fontSize: 10, opacity: 0.45, lineHeight: 1.3 }}>
              {Math.abs(paletteConfig.hueDriftLight) <= 10
                ? "✓ Sutil (≤10°)"
                : Math.abs(paletteConfig.hueDriftLight) <= 20
                ? "Moderado · revisa tonos claros"
                : "⚠ Pronunciado · puede cambiar identidad del color"}
            </p>
            <Slider
              label="Hacia oscuros (°)"
              value={paletteConfig.hueDriftDark}
              onChange={(v) => onUpdate({ hueDriftDark: v })}
              minValue={-30}
              maxValue={30}
              step={1}
              formatOptions={{ signDisplay: "always", maximumFractionDigits: 0 }}
            />
            <p style={{ margin: "-4px 0 0", fontSize: 10, opacity: 0.45, lineHeight: 1.3 }}>
              {Math.abs(paletteConfig.hueDriftDark) <= 10
                ? "✓ Sutil (≤10°)"
                : Math.abs(paletteConfig.hueDriftDark) <= 20
                ? "Moderado"
                : "⚠ Pronunciado"}
            </p>
          </div>
        </div>
      )}

      {/* ── Symmetry summary ── */}
      {generatedPalette && (
        <div>
          <SectionLabel>Balance interno</SectionLabel>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 11,
                padding: "3px 8px",
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
                fontSize: 11,
                padding: "3px 8px",
                borderRadius: 99,
                backgroundColor: generatedPalette.symmetryReport.chromaIsBellCurve
                  ? "#d4edda"
                  : "#f8d7da",
                color: generatedPalette.symmetryReport.chromaIsBellCurve
                  ? "#155724"
                  : "#721c24",
              }}
            >
              {generatedPalette.symmetryReport.chromaIsBellCurve
                ? "✓ C bell curve"
                : "✗ C irregular"}
            </span>
            {generatedPalette.symmetryReport.chromaPeakStep && (
              <span
                style={{
                  fontSize: 11,
                  padding: "3px 8px",
                  borderRadius: 99,
                  backgroundColor: "rgba(0,0,0,0.05)",
                  color: "rgba(0,0,0,0.55)",
                }}
              >
                C peak → {generatedPalette.symmetryReport.chromaPeakStep}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Actions ── */}
      <div
        style={{
          display: "flex",
          gap: 8,
          paddingTop: 4,
          borderTop: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ flex: 1 }}>
          <Button variant="secondary" fillStyle="outline" onPress={onDuplicate}>
            Duplicar
          </Button>
        </div>
        <div style={{ flex: 1 }}>
          <Button variant="negative" fillStyle="outline" onPress={onDelete}>
            Eliminar
          </Button>
        </div>
      </div>
    </div>
  );
}
