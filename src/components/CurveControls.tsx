import { Slider } from "@react-spectrum/s2/Slider";
import {
  Disclosure,
  DisclosureTitle,
  DisclosurePanel,
} from "@react-spectrum/s2/Disclosure";
import type { PaletteConfig } from "../../paletteEngine";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  config: PaletteConfig;
  updateLightnessRange: (partial: Partial<PaletteConfig["lightnessRange"]>) => void;
  updateChromaCurve: (partial: Partial<PaletteConfig["chromaCurve"]>) => void;
  updateEasing: (v: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CurveControls({ config, updateLightnessRange, updateChromaCurve, updateEasing }: Props) {
  return (
    <div style={{ backgroundColor: "white", borderRadius: 12, overflow: "hidden" }}>
      <Disclosure defaultExpanded>
        <DisclosureTitle level={3}>Curve Controls</DisclosureTitle>
        <DisclosurePanel>
          <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 4 }}>

            {/* ── Lightness range ── */}
            <div>
              <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.5 }}>
                Lightness Range
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Slider
                  label="Lightest step (L)"
                  value={config.lightnessRange.lightest}
                  onChange={(v) => updateLightnessRange({ lightest: v })}
                  minValue={0.8}
                  maxValue={1}
                  step={0.01}
                  formatOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
                  isEmphasized
                />
                <Slider
                  label="Darkest step (L)"
                  value={config.lightnessRange.darkest}
                  onChange={(v) => updateLightnessRange({ darkest: v })}
                  minValue={0}
                  maxValue={0.3}
                  step={0.01}
                  formatOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
                />
              </div>
            </div>

            {/* ── Chroma curve ── */}
            <div>
              <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.5 }}>
                Chroma Curve
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Slider
                  label="Peak multiplier"
                  value={config.chromaCurve.peakMultiplier}
                  onChange={(v) => updateChromaCurve({ peakMultiplier: v })}
                  minValue={0.5}
                  maxValue={2}
                  step={0.05}
                  formatOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
                  isEmphasized
                />
                <Slider
                  label="Edge factor"
                  value={config.chromaCurve.edgeFactor}
                  onChange={(v) => updateChromaCurve({ edgeFactor: v })}
                  minValue={0}
                  maxValue={1}
                  step={0.05}
                  formatOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
                />
              </div>
            </div>

            {/* ── Easing ── */}
            <div>
              <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.5 }}>
                Lightness Easing
              </p>
              <Slider
                label="Easing strength"
                value={config.easingStrength}
                onChange={updateEasing}
                minValue={0}
                maxValue={1}
                step={0.05}
                formatOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
              />
            </div>

          </div>
        </DisclosurePanel>
      </Disclosure>
    </div>
  );
}
