export type Palette = [string, string, string, string]

export const BG = "#e3e1ea"
export const BASE: Palette = ["#c6b3f7", "#f4c1d7", "#aecaf6", "#f6d4ba"]

const HEX = /^#[0-9a-f]{6}$/i

export const toRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const mix = (a: string, b: string, t: number) =>
  "#" +
  toRgb(a)
    .map((v, i) => Math.round(v + (toRgb(b)[i] - v) * t))
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")

export const tint = (accent?: string): Palette =>
  accent && HEX.test(accent)
    ? [
        mix(accent, "#ffffff", 0.36),
        mix(accent, BASE[1], 0.55),
        mix(accent, "#ffffff", 0.62),
        mix(accent, BASE[0], 0.48),
      ]
    : BASE
