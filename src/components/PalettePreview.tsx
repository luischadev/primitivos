// =============================================================================
// src/components/PalettePreview.tsx
// Compact full-palette preview with hue labels at light/mid/dark positions.
// =============================================================================

import type { GeneratedPalette } from "../engines/types";
import { HUE_ANCHOR_STEP } from "../engines/types";

function hueLabel(hue: number) {
  return `${Math.round(((hue % 360) + 360) % 360)}°`;
}

export function PalettePreview({ palette }: { palette: GeneratedPalette | null }) {
  if (!palette || palette.colors.length === 0) return null;

  const first = palette.colors[0];
  const middle =
    palette.colors.find((color) => color.step === HUE_ANCHOR_STEP) ??
    palette.colors[Math.floor(palette.colors.length / 2)];
  const last = palette.colors[palette.colors.length - 1];

  const markers = [
    { label: first.step, hue: first.oklch.h, align: "flex-start" as const },
    { label: middle.step, hue: middle.oklch.h, align: "center" as const },
    { label: last.step, hue: last.oklch.h, align: "flex-end" as const },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        marginBottom: 18,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${palette.colors.length}, minmax(0, 1fr))`,
          height: 28,
          overflow: "hidden",
          borderRadius: 7,
          border: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        {palette.colors.map((color) => (
          <div key={color.step} style={{ backgroundColor: color.hex }} title={`${color.step} · ${color.hex}`} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        {markers.map((marker) => (
          <div
            key={marker.label}
            style={{
              flex: 1,
              textAlign: marker.align === "center" ? "center" : marker.align === "flex-end" ? "right" : "left",
              fontSize: 10,
              fontFamily: "monospace",
              color: "rgba(0,0,0,0.48)",
            }}
          >
            {marker.label} · H {hueLabel(marker.hue)}
          </div>
        ))}
      </div>
    </div>
  );
}
