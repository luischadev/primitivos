// =============================================================================
// src/App.tsx
// Primitive Palette System Builder — main application shell.
// =============================================================================

import { useState, useMemo } from "react";
import { Provider } from "@react-spectrum/s2/Provider";
import { Button } from "@react-spectrum/s2/Button";
import { ActionButton } from "@react-spectrum/s2/ActionButton";
import {
  Disclosure,
  DisclosureTitle,
  DisclosurePanel,
} from "@react-spectrum/s2/Disclosure";
import { useSystem } from "./hooks/useSystem";
import { PaletteMatrix } from "./components/PaletteMatrix";
import { GlobalControls } from "./components/GlobalControls";
import { PaletteEditor } from "./components/PaletteEditor";
import { CrossStepAudit } from "./components/CrossStepAudit";
import { SystemInsights } from "./components/SystemInsights";
import { exportSystem } from "./engines/exportEngine";
import { hexToOklch } from "./engines/colorConversions";
import { generateSystemInsights } from "./engines/insightEngine";
import type { ExportFormat } from "./engines/types";

// ─── Add palette dialog (inline, simple) ─────────────────────────────────────

function AddPaletteBar({
  onAdd,
  onClose,
}: {
  onAdd: (hue: number) => void;
  onClose: () => void;
}) {
  const [hue, setHue] = useState(180);
  const [hexInput, setHexInput] = useState("");
  const [hexError, setHexError] = useState(false);

  const handleAddFromHue = () => {
    onAdd(hue);
    onClose();
  };

  const handleAddFromHex = () => {
    const h = hexInput.trim();
    const isValid = /^#[0-9a-fA-F]{6}$/.test(h);
    if (!isValid) {
      setHexError(true);
      setTimeout(() => setHexError(false), 2000);
      return;
    }
    const { h: hueVal } = hexToOklch(h);
    onAdd(Math.round(hueVal));
    onClose();
  };

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: 12,
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 20,
        flexWrap: "wrap",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      {/* From hue */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <label style={{ fontSize: 12, fontWeight: 600, opacity: 0.7 }}>
          Desde hue
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: `hsl(${hue}, 70%, 50%)`,
              border: "1px solid rgba(0,0,0,0.12)",
            }}
          />
          <input
            type="range"
            min={0}
            max={359}
            value={hue}
            onChange={(e) => setHue(Number(e.target.value))}
            style={{ width: 120 }}
            aria-label="Hue"
          />
          <span style={{ fontSize: 12, fontFamily: "monospace", opacity: 0.7, width: 30 }}>
            {hue}°
          </span>
        </div>
        <Button variant="accent" onPress={handleAddFromHue}>
          Agregar
        </Button>
      </div>

      {/* Divider */}
      <div style={{ fontSize: 11, opacity: 0.35 }}>ó</div>

      {/* From HEX */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <label style={{ fontSize: 12, fontWeight: 600, opacity: 0.7 }}>
          Desde HEX
        </label>
        <input
          type="text"
          placeholder="#ff5500"
          value={hexInput}
          onChange={(e) => setHexInput(e.target.value)}
          maxLength={7}
          style={{
            fontFamily: "monospace",
            fontSize: 13,
            padding: "4px 10px",
            border: `1px solid ${hexError ? "#dc3545" : "rgba(0,0,0,0.2)"}`,
            borderRadius: 6,
            width: 100,
            outline: "none",
          }}
          aria-label="HEX color"
        />
        <Button variant="secondary" fillStyle="outline" onPress={handleAddFromHex}>
          Agregar
        </Button>
      </div>

      {/* Neutral */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Button
          variant="secondary"
          fillStyle="outline"
          onPress={() => {
            onAdd(-1); // signal neutral
            onClose();
          }}
        >
          + Neutral
        </Button>
      </div>

      {/* Cancel */}
      <ActionButton aria-label="Cancelar" onPress={onClose} isQuiet>
        ✕
      </ActionButton>
    </div>
  );
}

// ─── Export menu ─────────────────────────────────────────────────────────────

function ExportButton({ onExport }: { onExport: (format: ExportFormat) => void }) {
  const [open, setOpen] = useState(false);

  const formats: { key: ExportFormat; label: string }[] = [
    { key: "json-simple", label: "JSON simple (name.step.hex)" },
    { key: "json-full", label: "JSON completo (OKLCH + gamut)" },
    { key: "css-vars", label: "CSS custom properties" },
    { key: "figma-variables", label: "Variables Figma (JSON)" },
  ];

  return (
    <div style={{ position: "relative" }}>
      <Button variant="secondary" fillStyle="outline" onPress={() => setOpen((v) => !v)}>
        Exportar ▾
      </Button>
      {open && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9,
            }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              backgroundColor: "white",
              borderRadius: 10,
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              padding: 6,
              zIndex: 10,
              minWidth: 240,
            }}
          >
            {formats.map((f) => (
              <button
                key={f.key}
                onClick={() => {
                  onExport(f.key);
                  setOpen(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "8px 14px",
                  textAlign: "left",
                  border: "none",
                  backgroundColor: "transparent",
                  fontSize: 13,
                  cursor: "pointer",
                  borderRadius: 6,
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f5f5f5")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const sys = useSystem();
  const [showAddBar, setShowAddBar] = useState(false);

  if (!sys.system) {
    return (
      <Provider locale="es-ES">
        <div style={{ padding: 40, opacity: 0.5, fontSize: 14 }}>
          Error generando el sistema — revisa la consola.
        </div>
      </Provider>
    );
  }

  const { system, config, selectedPaletteId, setSelectedPaletteId } = sys;
  const globalScale = config.globalScale;

  const insights = useMemo(
    () => generateSystemInsights(system, globalScale),
    [system, globalScale],
  );

  const chromaticPalettes = system.palettes.filter((p) => p.config.type === "chromatic");

  const handleExport = (format: ExportFormat) => {
    const text = exportSystem(system, format);
    navigator.clipboard.writeText(text).catch(() => {});
    // Could show a toast here; for now just clipboard
  };

  const handleAddPalette = (hueOrSignal: number) => {
    if (hueOrSignal === -1) {
      sys.addPalette({ l: 0.55, c: 0.005, h: 250 }, "neutral");
    } else {
      // Use a mid-range anchor L that places the color near step 500
      sys.addPalette({ l: 0.65, c: 0.17, h: hueOrSignal }, "chromatic");
    }
  };

  return (
    <Provider locale="es-ES">
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            height: 52,
            borderBottom: "1px solid rgba(0,0,0,0.09)",
            backgroundColor: "white",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Color System Builder</span>
            <span style={{ fontSize: 11, opacity: 0.4 }}>
              {system.palettes.length} paleta{system.palettes.length !== 1 ? "s" : ""} · 12 pasos cromáticos ·
              15 pasos neutrales
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Audit summary badge */}
            {(system.chromaticAudit.totalLWarnings > 0 ||
              system.chromaticAudit.totalCWarnings > 0 ||
              system.neutralAudit.totalLWarnings > 0) && (
              <span
                style={{
                  fontSize: 11,
                  padding: "3px 9px",
                  borderRadius: 99,
                  backgroundColor: "#fff3cd",
                  color: "#856404",
                  fontWeight: 600,
                }}
              >
                ⚠{" "}
                {system.chromaticAudit.totalLWarnings +
                  system.chromaticAudit.totalCWarnings +
                  system.neutralAudit.totalLWarnings}{" "}
                audit
              </span>
            )}
            <Button
              variant="accent"
              onPress={() => setShowAddBar((v) => !v)}
            >
              + Agregar paleta
            </Button>
            <ExportButton onExport={handleExport} />
          </div>
        </header>

        {/* ── Body ──────────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* ── Sidebar ─────────────────────────────────────────────────────── */}
          <aside
            style={{
              width: 300,
              flexShrink: 0,
              borderRight: "1px solid rgba(0,0,0,0.08)",
              overflowY: "auto",
              padding: "20px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 0,
              backgroundColor: "#fafafa",
            }}
          >
            {/* Global controls */}
            <div
              style={{
                backgroundColor: "white",
                borderRadius: 12,
                padding: "16px",
                marginBottom: 12,
              }}
            >
              <GlobalControls
                globalScale={globalScale}
                onUpdateLightnessRange={sys.updateLightnessRange}
                onUpdateChromaCurve={sys.updateChromaCurve}
                onUpdateLightnessCurve={sys.updateLightnessCurve}
                onApplyAtlassianPreset={sys.applyAtlassianPreset}
              />
            </div>

            {/* Palette list */}
            {system.palettes.length > 0 && (
              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: 12,
                  overflow: "hidden",
                  marginBottom: 12,
                }}
              >
                <Disclosure defaultExpanded>
                  <DisclosureTitle level={3}>Paletas</DisclosureTitle>
                  <DisclosurePanel>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingBottom: 4 }}>
                      {system.palettes.map((p) => {
                        const midColor = p.colors[Math.floor(p.colors.length / 2)];
                        const isSelected = p.config.id === selectedPaletteId;
                        return (
                          <button
                            key={p.config.id}
                            onClick={() =>
                              setSelectedPaletteId(isSelected ? null : p.config.id)
                            }
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              padding: "7px 10px",
                              borderRadius: 8,
                              border: "none",
                              cursor: "pointer",
                              backgroundColor: isSelected
                                ? "rgba(0,102,204,0.08)"
                                : "transparent",
                              fontFamily: "inherit",
                              textAlign: "left",
                            }}
                          >
                            <div
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: "50%",
                                backgroundColor: midColor?.hex ?? "#ccc",
                                flexShrink: 0,
                                border: "1px solid rgba(0,0,0,0.1)",
                              }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: isSelected ? 700 : 500,
                                  color: isSelected ? "#0066cc" : "inherit",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {p.config.name}
                              </div>
                              <div style={{ fontSize: 10, opacity: 0.45 }}>
                                {p.config.type} · H {Math.round(p.config.anchor.h)}°
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </DisclosurePanel>
                </Disclosure>
              </div>
            )}

            {/* Palette editor (selected palette) */}
            {sys.selectedPalette && (
              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <p
                  style={{
                    margin: "0 0 14px",
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.09em",
                    opacity: 0.45,
                  }}
                >
                  Editar paleta
                </p>
                <PaletteEditor
                  paletteConfig={sys.selectedPalette}
                  generatedPalette={sys.selectedGenerated}
                  onUpdate={(patch) => sys.updatePalette(sys.selectedPalette!.id, patch)}
                  onDuplicate={() => {
                    sys.duplicatePalette(sys.selectedPalette!.id);
                  }}
                  onDelete={() => {
                    sys.removePalette(sys.selectedPalette!.id);
                  }}
                />
              </div>
            )}
          </aside>

          {/* ── Main content ─────────────────────────────────────────────────── */}
          <main
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              backgroundColor: "#f4f4f4",
            }}
          >
            {/* Add palette bar */}
            {showAddBar && (
              <AddPaletteBar
                onAdd={handleAddPalette}
                onClose={() => setShowAddBar(false)}
              />
            )}

            {/* System insights */}
            {chromaticPalettes.length > 0 && (
              <SystemInsights
                insights={insights}
                onFixChromaShape={() =>
                  sys.fixChromaShape(insights.chromaShape.affectedPalettes)
                }
                onFixChromaPeak={() => sys.fixChromaPeak()}
                onFixLightnessRange={() => sys.fixLightnessRange()}
              />
            )}

            {/* Palette matrix */}
            <div
              style={{
                backgroundColor: "white",
                borderRadius: 14,
                padding: "20px 20px 16px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}
            >
              <PaletteMatrix
                system={system}
                selectedPaletteId={selectedPaletteId}
                onSelectPalette={(id) =>
                  setSelectedPaletteId(selectedPaletteId === id ? null : id)
                }
              />
            </div>

            <CrossStepAudit
              title="Consistencia — paletas de color"
              audit={system.chromaticAudit}
            />
            <CrossStepAudit
              title="Consistencia — paletas neutrales"
              audit={system.neutralAudit}
              showChroma={false}
            />

            <div style={{ height: 32 }} />
          </main>
        </div>
      </div>
    </Provider>
  );
}
