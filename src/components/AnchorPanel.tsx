import { ColorWheel } from "@react-spectrum/s2/ColorWheel";
import { ColorSwatch } from "@react-spectrum/s2/ColorSwatch";
import { Slider } from "@react-spectrum/s2/Slider";
import { Picker, PickerItem } from "@react-spectrum/s2/Picker";
import type { PaletteConfig, PaletteResult, OKLCHColor } from "../../paletteEngine";
import { STEP_PRESETS } from "../hooks/usePalette";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  config: PaletteConfig;
  result: PaletteResult;
  updateAnchor: (partial: Partial<OKLCHColor>) => void;
  setAnchorStep: (name: string) => void;
  preset: string;
  changePreset: (name: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AnchorPanel({ config, result, updateAnchor, setAnchorStep, preset, changePreset }: Props) {
  const anchorStep = result.steps.find(
    (s) => String(s.name) === config.anchorStepName
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Section label ── */}
      <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.5, margin: 0 }}>
        Anchor Color
      </p>

      {/* ── Hue wheel + swatch preview ── */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <ColorWheel
          value={`hsl(${config.anchor.h}, 80%, 50%)`}
          onChange={(color) => {
            // color is Color from @react-stately/color — hue is 0–360
            updateAnchor({ h: Math.round((color as { getChannelValue: (ch: string) => number }).getChannelValue("hue")) });
          }}
          size={164}
        />
        {anchorStep && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ColorSwatch
              color={anchorStep.hex}
              aria-label={`Anchor: ${anchorStep.hex}`}
              size="L"
              rounding="default"
            />
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, fontFamily: "monospace" }}>
                {anchorStep.hex}
              </p>
              <p style={{ margin: 0, fontSize: 11, opacity: 0.6 }}>
                oklch({config.anchor.l.toFixed(2)} {config.anchor.c.toFixed(3)} {Math.round(config.anchor.h)}°)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── L slider ── */}
      <Slider
        label="Lightness (L)"
        value={config.anchor.l}
        onChange={(v) => updateAnchor({ l: v })}
        minValue={0}
        maxValue={1}
        step={0.01}
        formatOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
        isEmphasized
      />

      {/* ── C slider ── */}
      <Slider
        label="Chroma (C)"
        value={config.anchor.c}
        onChange={(v) => updateAnchor({ c: v })}
        minValue={0}
        maxValue={0.4}
        step={0.005}
        formatOptions={{ minimumFractionDigits: 3, maximumFractionDigits: 3 }}
      />

      {/* ── Step preset selector ── */}
      <Picker
        label="Step preset"
        selectedKey={preset}
        onSelectionChange={(key) => changePreset(String(key))}
      >
        {Object.keys(STEP_PRESETS).map((name) => (
          <PickerItem key={name} id={name}>
            {name} ({STEP_PRESETS[name].length} steps)
          </PickerItem>
        ))}
      </Picker>

      {/* ── Anchor step selector ── */}
      <Picker
        label="Anchor step"
        selectedKey={config.anchorStepName}
        onSelectionChange={(key) => setAnchorStep(String(key))}
      >
        {config.steps.map((s) => (
          <PickerItem key={String(s)} id={String(s)}>
            {String(s)}
          </PickerItem>
        ))}
      </Picker>
    </div>
  );
}
