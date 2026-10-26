import { readFileSync } from "node:fs"

export interface Media {
  src: string
  wide: boolean
  width: number
  height: number
  caption: string
}

export function media(path: string, slug = ""): Media {
  const src = path.replace(/#wide$/, "")
  const bytes = readFileSync(`public${src}`)
  const png = bytes.toString("ascii", 1, 4) === "PNG"
  const gif = bytes.toString("ascii", 0, 3) === "GIF"
  if (!png && !gif) throw new Error(`Unsupported image format: ${src}`)
  const width = png ? bytes.readUInt32BE(16) : bytes.readUInt16LE(6)
  const height = png ? bytes.readUInt32BE(20) : bytes.readUInt16LE(8)
  const name = (src.split("/").pop() ?? "")
    .replace(/\.\w+$/, "")
    .replace(new RegExp(`^${slug}[-_]`), "")
    .replace(/[-_]+/g, " ")
  return {
    src,
    wide: path.endsWith("#wide"),
    width,
    height,
    caption: name.charAt(0).toUpperCase() + name.slice(1),
  }
}
