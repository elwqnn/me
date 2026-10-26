import { closeSync, openSync, readSync } from "node:fs"
import { join } from "node:path"

export const cleanSrc = (src: string) => src.replace(/#wide$/, "")
export const isWide = (src: string) => src.endsWith("#wide")

export function imageSize(src: string) {
  const file = openSync(join(process.cwd(), "public", cleanSrc(src)), "r")
  const head = Buffer.alloc(24)
  readSync(file, head, 0, 24, 0)
  closeSync(file)
  if (head.toString("ascii", 1, 4) === "PNG")
    return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) }
  if (head.toString("ascii", 0, 3) === "GIF")
    return { width: head.readUInt16LE(6), height: head.readUInt16LE(8) }
  return undefined
}
