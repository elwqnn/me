import { readFileSync } from "node:fs"

export const clean = (src: string) => src.replace(/#wide$/, "")

export const pad = (n: number) => String(n).padStart(2, "0")

export function shot(src: string) {
  const path = clean(src)
  const b = readFileSync(`public${path}`)
  const png = b[0] === 0x89
  const name = path
    .split("/")
    .pop()!
    .replace(/\.\w+$/, "")
    .replace(/[-_]+/g, " ")
  return {
    src: path,
    name,
    wide: src.endsWith("#wide"),
    width: png ? b.readUInt32BE(16) : b.readUInt16LE(6),
    height: png ? b.readUInt32BE(20) : b.readUInt16LE(8),
  }
}
