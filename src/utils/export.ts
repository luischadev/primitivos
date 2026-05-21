import type { PaletteResult } from "../../paletteEngine";

export function toCSSVars(result: PaletteResult, name = "color"): string {
  const lines = result.steps.map(
    (s) =>
      `  --${name}-${s.name}: ${s.hex}; /* oklch(${s.oklch.l.toFixed(3)} ${s.oklch.c.toFixed(3)} ${s.oklch.h.toFixed(1)}) */`
  );
  return `:root {\n${lines.join("\n")}\n}`;
}

export function toJSON(result: PaletteResult, name = "color"): string {
  const obj: Record<string, string> = {};
  result.steps.forEach((s) => {
    obj[String(s.name)] = s.hex;
  });
  return JSON.stringify({ [name]: obj }, null, 2);
}
