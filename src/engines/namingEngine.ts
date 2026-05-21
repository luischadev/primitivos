// =============================================================================
// src/engines/namingEngine.ts
// Suggests a palette name based on the anchor hue in OKLCH space.
// The suggestion is purely a starting point — users can rename freely.
// =============================================================================

type HueRange = { min: number; max: number; name: string };

/**
 * OKLCH perceptual hue ranges → Spanish family name suggestions.
 * Ranges are approximate; the OKLCH hue wheel is not uniformly distributed
 * across color families, so boundaries are tuned perceptually.
 */
const HUE_RANGES: HueRange[] = [
  { min: 0,   max: 20,  name: "rojo" },
  { min: 20,  max: 55,  name: "naranja" },
  { min: 55,  max: 100, name: "amarillo" },
  { min: 100, max: 160, name: "verde" },
  { min: 160, max: 210, name: "cyan" },
  { min: 210, max: 265, name: "azul" },
  { min: 265, max: 295, name: "violeta" },
  { min: 295, max: 330, name: "púrpura" },
  { min: 330, max: 360, name: "magenta" },
];

/**
 * Suggest a palette family name based on the OKLCH hue angle.
 * Returns one of: rojo, naranja, amarillo, verde, cyan, azul, violeta, púrpura, magenta.
 */
export function suggestPaletteNameFromHue(h: number): string {
  // Normalize to [0, 360)
  const hue = ((h % 360) + 360) % 360;

  const match = HUE_RANGES.find((r) => hue >= r.min && hue < r.max);
  return match?.name ?? "azul";
}

/**
 * Generate a unique name if the suggested name conflicts with existing names.
 * Appends a numeric suffix: "azul 2", "azul 3", etc.
 */
export function uniquePaletteName(
  suggested: string,
  existingNames: string[],
): string {
  if (!existingNames.includes(suggested)) return suggested;

  let counter = 2;
  while (existingNames.includes(`${suggested} ${counter}`)) {
    counter++;
  }
  return `${suggested} ${counter}`;
}
