// =============================================================================
// src/App.tsx
// Primitive Palette System Builder.
// Left sidebar: controls. Main area: palettes.
// =============================================================================

import { useState, useMemo, type PointerEvent } from "react";
import { Provider } from "@react-spectrum/s2/Provider";
import { Button } from "@react-spectrum/s2/Button";
import { ColorWheel } from "@react-spectrum/s2/ColorWheel";
import { Slider } from "@react-spectrum/s2/Slider";
import { TextField } from "@react-spectrum/s2/TextField";
import { Dialog, DialogContainer, Heading, Content } from "@react-spectrum/s2/Dialog";
import { useSystem } from "./hooks/useSystem";
import { PaletteMatrix } from "./components/PaletteMatrix";
import { GlobalControls } from "./components/GlobalControls";
import { PaletteEditor } from "./components/PaletteEditor";
import { PalettePreview } from "./components/PalettePreview";
import { SystemInsights } from "./components/SystemInsights";
import { SystemCurveOverview } from "./components/SystemCurveOverview";
import { ProjectSelector } from "./components/ProjectSelector";
import { exportSystem } from "./engines/exportEngine";
import { FigmaImportError } from "./engines/importEngine";
import { generateSystemInsights } from "./engines/insightEngine";
import { suggestPaletteNameFromHue } from "./engines/namingEngine";
import { hexToOklch, hslToHex } from "./engines/colorConversions";
import { buildGlobalStepValues } from "./engines/scaleEngine";
import { generatePalette } from "./engines/paletteEngine";
import { CHROMATIC_STEPS, NEUTRAL_STEPS, DARK_NEUTRAL_PALETTE_ID } from "./engines/types";
import type { ExportFormat, GlobalScaleConfig, PaletteConfig, PaletteType } from "./engines/types";

// ─── Panel mode ───────────────────────────────────────────────────────────────

type PanelMode =
  | { kind: "none" }
  | { kind: "edit" };

// ─── Add palette form ─────────────────────────────────────────────────────────

function AddPaletteForm({
  paletteType,
  globalScale,
  onConfirm,
  onCancel,
}: {
  paletteType: PaletteType;
  globalScale: GlobalScaleConfig;
  onConfirm: (
    hue: number,
    name: string,
    options: {
      chromaMultiplier: number;
      hueDriftLight: number;
      hueDriftDark: number;
    },
  ) => void;
  onCancel: () => void;
}) {
  // hslHue: visual hue on the wheel (sRGB/HSL space, what the user sees)
  // oklchHue: derived via HEX→OKLCH, what the engine uses
  const [hslHue, setHslHue] = useState(220);
  const [oklchHue, setOklchHue] = useState(() => {
    const { h } = hexToOklch(hslToHex(220, 80, 50));
    return Math.round(h);
  });
  const [name, setName] = useState(() => suggestPaletteNameFromHue(
    Math.round(hexToOklch(hslToHex(220, 80, 50)).h),
  ));
  const [nameEdited, setNameEdited] = useState(false);
  const [hexInput, setHexInput] = useState("");
  const [hexError, setHexError] = useState(false);
  const [chromaMultiplier, setChromaMultiplier] = useState(1);
  const [hueDriftLight, setHueDriftLight] = useState(0);
  const [hueDriftDark, setHueDriftDark] = useState(0);

  const previewPalette = useMemo(() => {
    const steps = buildGlobalStepValues(
      globalScale,
      paletteType === "neutral" ? NEUTRAL_STEPS : CHROMATIC_STEPS,
      paletteType,
    );

    const config: PaletteConfig = {
      id: "preview",
      name: name.trim() || "preview",
      type: paletteType,
      anchor: {
        l: 0.65,
        c: paletteType === "neutral" ? 0.005 : 0.17,
        h: paletteType === "neutral" ? 250 : oklchHue,
      },
      chromaMultiplier,
      hueDriftLight,
      hueDriftDark,
      ...(paletteType === "neutral" ? { neutralChroma: 0 } : {}),
    };

    return generatePalette(steps, config, {
      peak: globalScale.chromaCurve.peak,
      edgeFactor: globalScale.chromaCurve.edgeFactor,
      peakMode: globalScale.chromaCurve.peakMode,
      steps: CHROMATIC_STEPS,
    });
  }, [chromaMultiplier, globalScale, oklchHue, hueDriftDark, hueDriftLight, name, paletteType]);

  /** Called from wheel drag: input is HSL hue, we derive OKLCH hue via hex. */
  const applyHslHue = (hsl: number) => {
    setHslHue(hsl);
    const hex = hslToHex(hsl, 80, 50);
    const { h: oklch } = hexToOklch(hex);
    const rounded = Math.round(oklch);
    setOklchHue(rounded);
    if (!nameEdited) setName(suggestPaletteNameFromHue(rounded));
  };

  const handleHexApply = () => {
    const raw = hexInput.trim();
    const valid = /^#[0-9a-fA-F]{6}$/.test(raw);
    if (!valid) {
      setHexError(true);
      setTimeout(() => setHexError(false), 1400);
      return;
    }
    // Hex input → derive both OKLCH hue (for engine) and HSL hue (for wheel position)
    const { h: oklch } = hexToOklch(raw);
    const rounded = Math.round(oklch);
    setOklchHue(rounded);
    // Find HSL hue whose generated OKLCH hue is closest, to sync the wheel visually
    let bestHsl = 0, bestDiff = 360;
    for (let hsl = 0; hsl < 360; hsl++) {
      const { h } = hexToOklch(hslToHex(hsl, 80, 50));
      const diff = Math.abs(((h - oklch + 540) % 360) - 180);
      if (diff < bestDiff) { bestDiff = diff; bestHsl = hsl; }
    }
    setHslHue(bestHsl);
    if (!nameEdited) setName(suggestPaletteNameFromHue(rounded));
    setHexInput("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Hue wheel (chromatic only) */}
      {paletteType === "chromatic" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <ColorWheel
            value={`hsl(${hslHue}, 80%, 50%)`}
            onChange={(color) => {
              const h = Math.round(
                (color as { getChannelValue: (ch: string) => number }).getChannelValue("hue"),
              );
              applyHslHue(h);
            }}
            size={186}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: hslToHex(hslHue, 70, 50),
                border: "1px solid rgba(0,0,0,0.12)",
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 12, opacity: 0.55, fontFamily: "monospace" }}>
              H {hslHue}° → OKLCH {oklchHue}°
            </span>
          </div>

          {/* Hex import shortcut */}
          <div style={{ display: "flex", gap: 6, width: "100%" }}>
            <input
              type="text"
              placeholder="#ff5500"
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleHexApply()}
              maxLength={7}
              style={{
                flex: 1,
                fontFamily: "monospace",
                fontSize: 12,
                padding: "5px 10px",
                border: `1px solid ${hexError ? "#dc3545" : "rgba(0,0,0,0.18)"}`,
                borderRadius: 6,
                outline: "none",
                backgroundColor: "transparent",
              }}
              aria-label="Importar desde HEX"
            />
            <button
              onClick={handleHexApply}
              style={{
                padding: "5px 10px",
                border: "1px solid rgba(0,0,0,0.18)",
                borderRadius: 6,
                backgroundColor: "transparent",
                cursor: "pointer",
                fontSize: 11,
                fontFamily: "inherit",
                opacity: 0.6,
              }}
            >
              Usar
            </button>
          </div>
        </div>
      )}

      {/* Name */}
      <div style={{ marginBottom: 20 }}>
        <TextField
          label="Nombre de la paleta"
          value={name}
          onChange={(v) => {
            setName(v);
            setNameEdited(true);
          }}
        />
      </div>

      <PalettePreview palette={previewPalette} />

      {paletteType === "chromatic" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            marginBottom: 20,
          }}
        >
          <Slider
            label="Intensidad de color"
            value={chromaMultiplier}
            onChange={setChromaMultiplier}
            minValue={0.2}
            maxValue={1.8}
            step={0.05}
            formatOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
            isEmphasized
          />
          <Slider
            label="Hue drift → claros (°)"
            value={hueDriftLight}
            onChange={setHueDriftLight}
            minValue={-30}
            maxValue={30}
            step={1}
            formatOptions={{ signDisplay: "always", maximumFractionDigits: 0 }}
          />
          <Slider
            label="Hue drift → oscuros (°)"
            value={hueDriftDark}
            onChange={setHueDriftDark}
            minValue={-30}
            maxValue={30}
            step={1}
            formatOptions={{ signDisplay: "always", maximumFractionDigits: 0 }}
          />
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Button
          variant="accent"
          onPress={() =>
            onConfirm(oklchHue, name, {
              chromaMultiplier,
              hueDriftLight,
              hueDriftDark,
            })
          }
        >
          Crear paleta
        </Button>
        <Button variant="secondary" fillStyle="outline" onPress={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

// ─── Import from Figma ─────────────────────────────────────────────────────────

function ImportFigmaForm({
  onImport,
  onCancel,
}: {
  onImport: (json: string) => void;
  onCancel: () => void;
}) {
  const [json, setJson] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleImport = () => {
    const trimmed = json.trim();
    if (!trimmed) {
      setError("Pega el JSON exportado desde Figma.");
      return;
    }
    try {
      onImport(trimmed);
    } catch (err) {
      setError(
        err instanceof FigmaImportError ? err.message : "No se pudo importar el JSON.",
      );
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <textarea
        value={json}
        onChange={(e) => {
          setJson(e.target.value);
          if (error) setError(null);
        }}
        placeholder='Pega aquí el JSON de variables de Figma…'
        rows={12}
        style={{
          width: "100%",
          boxSizing: "border-box",
          fontFamily: "ui-monospace, monospace",
          fontSize: 11,
          lineHeight: 1.45,
          padding: 10,
          borderRadius: 8,
          border: error ? "1px solid #c62828" : "1px solid rgba(0,0,0,0.15)",
          resize: "vertical",
        }}
      />
      {error && (
        <p style={{ margin: 0, fontSize: 12, color: "#c62828" }}>{error}</p>
      )}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Button variant="secondary" fillStyle="outline" onPress={onCancel}>
          Cancelar
        </Button>
        <Button variant="accent" onPress={handleImport}>
          Importar
        </Button>
      </div>
    </div>
  );
}

// ─── Export button ─────────────────────────────────────────────────────────────

function ExportButton({ onExport }: { onExport: (format: ExportFormat) => void }) {
  const [open, setOpen] = useState(false);
  const formats: { key: ExportFormat; label: string }[] = [
    { key: "json-simple", label: "JSON simple" },
    { key: "json-full", label: "JSON completo (OKLCH)" },
    { key: "css-vars", label: "CSS custom properties" },
    { key: "figma-variables", label: "Variables Figma" },
    { key: "figma-json", label: "Figma JSON" },
  ];
  return (
    <div style={{ position: "relative" }}>
      <Button variant="secondary" fillStyle="outline" onPress={() => setOpen((v) => !v)}>
        Exportar ▾
      </Button>
      {open && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 9 }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              zIndex: 10,
              backgroundColor: "white",
              borderRadius: 10,
              boxShadow: "0 4px 20px rgba(0,0,0,0.14)",
              padding: 6,
              minWidth: 220,
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
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f5f5f5")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
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

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const sys = useSystem();
  const [panelMode, setPanelMode] = useState<PanelMode>({ kind: "none" });
  const [addDialogType, setAddDialogType] = useState<PaletteType | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(360);

  if (!sys.system) {
    return (
      <Provider locale="es-ES">
        <div style={{ padding: 40, opacity: 0.5, fontSize: 14 }}>
          Error generando el sistema — revisa la consola.
        </div>
      </Provider>
    );
  }

  const { system, config } = sys;
  const globalScale = config.globalScale;
  const chromaticPalettes = system.palettes.filter((p) => p.config.type === "chromatic");

  const insights = useMemo(
    () =>
      chromaticPalettes.length > 0
        ? generateSystemInsights(system, globalScale)
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [system, globalScale],
  );

  // ── Selection handling ───────────────────────────────────────────────────
  const handleSelectPalette = (id: string) => {
    if (id === DARK_NEUTRAL_PALETTE_ID) return;
    if (panelMode.kind === "edit" && sys.selectedPaletteId === id) {
      // Toggle: click same palette closes the panel
      setPanelMode({ kind: "none" });
      sys.setSelectedPaletteId(null);
    } else {
      setPanelMode({ kind: "edit" });
      sys.setSelectedPaletteId(id);
    }
  };

  const handleStartAdd = (paletteType: PaletteType) => {
    sys.setSelectedPaletteId(null);
    setPanelMode({ kind: "none" });
    setAddDialogType(paletteType);
  };

  const handleConfirmAdd = (
    hue: number,
    name: string,
    options: {
      chromaMultiplier: number;
      hueDriftLight: number;
      hueDriftDark: number;
    },
  ) => {
    const type = addDialogType ?? "chromatic";
    if (type === "neutral") {
      sys.addPalette({ l: 0.65, c: 0.005, h: 250 }, "neutral", name);
    } else {
      sys.addPalette({ l: 0.65, c: 0.17, h: hue }, "chromatic", name, options);
    }
    setAddDialogType(null);
  };

  const handleExport = (format: ExportFormat) => {
    const text = exportSystem(system, format);
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const handleImportFigma = (json: string) => {
    sys.importFromFigma(json);
    setImportDialogOpen(false);
    setPanelMode({ kind: "none" });
  };

  const handleSidebarResizeStart = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = sidebarWidth;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMove = (moveEvent: globalThis.PointerEvent) => {
      const maxWidth = Math.min(560, window.innerWidth * 0.48);
      const nextWidth = startWidth + (moveEvent.clientX - startX);
      setSidebarWidth(Math.max(280, Math.min(maxWidth, nextWidth)));
    };

    const handleUp = () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
  };

  return (
    <Provider locale="es-ES">
      <div
        style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}
      >
        {/* ── Header ── */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            height: 50,
            flexShrink: 0,
            borderBottom: "1px solid rgba(0,0,0,0.08)",
            backgroundColor: "white",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0, flex: 1 }}>
            <span
              style={{
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: "-0.01em",
                color: "#111",
                flexShrink: 0,
              }}
            >
              Primitivos
            </span>
            <ProjectSelector
              projects={sys.projects}
              activeProjectId={sys.activeProjectId}
              onSelectProject={sys.switchProject}
              onCreateProject={sys.createProject}
              onDuplicateProject={sys.duplicateActiveProject}
              onRenameProject={sys.renameActiveProject}
              onDeleteProject={sys.deleteActiveProject}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Button
              variant="secondary"
              fillStyle="outline"
              onPress={() => setImportDialogOpen(true)}
            >
              Importar Figma
            </Button>
            <ExportButton onExport={handleExport} />
          </div>
        </header>

        {/* ── Body ── */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* ── Left controls panel ── */}
          <aside
            style={{
              width: sidebarWidth,
              flexShrink: 0,
              overflowY: "auto",
              padding: "18px",
              backgroundColor: "white",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: "-0.01em",
                }}
              >
                Controles
              </h2>

              <GlobalControls
                globalScale={globalScale}
                onUpdateLightnessRange={sys.updateLightnessRange}
                onUpdateChromaCurve={sys.updateChromaCurve}
                onUpdateLightnessCurve={sys.updateLightnessCurve}
                onApplyAtlassianPreset={sys.applyAtlassianPreset}
              />
            </div>
          </aside>

          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Ajustar ancho de controles"
            title="Arrastra para ajustar el ancho"
            onPointerDown={handleSidebarResizeStart}
            onDoubleClick={() => setSidebarWidth(360)}
            style={{
              width: 8,
              flexShrink: 0,
              cursor: "col-resize",
              backgroundColor: "transparent",
            }}
          />

          {/* ── Main content ── */}
          <main
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              backgroundColor: "#f3f3f3",
            }}
          >
            {chromaticPalettes.length > 0 && (
              <div
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 2,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  paddingBottom: 10,
                  backgroundColor: "#f3f3f3",
                }}
              >
                {insights && (
                  <SystemInsights
                    insights={insights}
                    onFixChromaShape={() =>
                      sys.fixChromaShape(insights.chromaShape.affectedPalettes)
                    }
                    onFixLightnessRange={() => sys.fixLightnessRange()}
                  />
                )}
                <SystemCurveOverview
                  globalScale={globalScale}
                  chromaticPalettes={chromaticPalettes}
                  selectedPaletteId={sys.selectedPaletteId}
                />
              </div>
            )}

            {/* Palette matrix — the primary workspace */}
            <div
              style={{
                backgroundColor: "white",
                borderRadius: 14,
                padding: "18px 18px 14px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <PaletteMatrix
                system={system}
                selectedPaletteId={sys.selectedPaletteId}
                onSelectPalette={handleSelectPalette}
                onAddChromatic={() => handleStartAdd("chromatic")}
                onAddNeutral={() => handleStartAdd("neutral")}
              />
            </div>

            <div style={{ height: 20 }} />
          </main>
        </div>

        <DialogContainer onDismiss={() => setImportDialogOpen(false)}>
          {importDialogOpen && (
            <Dialog size="M" isDismissible>
              <Heading>Importar desde Figma</Heading>
              <Content>
                <ImportFigmaForm
                  onImport={handleImportFigma}
                  onCancel={() => setImportDialogOpen(false)}
                />
              </Content>
            </Dialog>
          )}
        </DialogContainer>

        <DialogContainer onDismiss={() => setAddDialogType(null)}>
          {addDialogType && (
            <Dialog size="S" isDismissible>
              <Heading>
                {addDialogType === "chromatic" ? "Nueva paleta de color" : "Nueva paleta neutral"}
              </Heading>
              <Content>
                <AddPaletteForm
                  paletteType={addDialogType}
                  globalScale={globalScale}
                  onConfirm={handleConfirmAdd}
                  onCancel={() => setAddDialogType(null)}
                />
              </Content>
            </Dialog>
          )}
        </DialogContainer>

        <DialogContainer
          onDismiss={() => {
            setPanelMode({ kind: "none" });
            sys.setSelectedPaletteId(null);
          }}
        >
          {panelMode.kind === "edit" && sys.selectedPalette && (
            <Dialog size="S" isDismissible>
              <Heading>Editar paleta</Heading>
              <Content>
                <PaletteEditor
                  paletteConfig={sys.selectedPalette}
                  generatedPalette={sys.selectedGenerated}
                  onUpdate={(patch) => sys.updatePalette(sys.selectedPalette!.id, patch)}
                  onDuplicate={() => sys.duplicatePalette(sys.selectedPalette!.id)}
                  onDelete={() => {
                    sys.removePalette(sys.selectedPalette!.id);
                    setPanelMode({ kind: "none" });
                    sys.setSelectedPaletteId(null);
                  }}
                  onClose={() => {
                    setPanelMode({ kind: "none" });
                    sys.setSelectedPaletteId(null);
                  }}
                  showHeader={false}
                />
              </Content>
            </Dialog>
          )}
        </DialogContainer>
      </div>
    </Provider>
  );
}
