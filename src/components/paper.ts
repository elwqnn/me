import { readFileSync } from "node:fs"
import { join } from "node:path"

export const clean = (src: string) => src.replace(/#wide$/, "")
export const isWide = (src: string) => src.endsWith("#wide")
export const pad = (n: number) => String(n).padStart(2, "0")

export function size(src: string) {
  const b = readFileSync(join(process.cwd(), "public", clean(src)))
  if (b.toString("ascii", 0, 3) === "GIF")
    return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) }
  if (b.readUInt32BE(0) === 0x89504e47)
    return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) }
  return undefined
}

export function rng(seed: string) {
  let a = [...seed].reduce(
    (h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619),
    2166136261
  )
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Rand = () => number
const f = (n: number) => +n.toFixed(1)

function edge(rand: Rand, torn: boolean, amp: number) {
  if (!torn)
    return [
      [0, rand() * 1.2, 0],
      [100, rand() * 1.2, 0],
    ]
  const pts: number[][] = []
  let w = rand() * amp
  for (let p = 0; p < 100; p += 2 + rand() * 3.5) {
    w = Math.min(amp, Math.max(0, w + (rand() - 0.5) * amp * 0.8))
    pts.push([p, w + rand() * amp * 0.35, 1.2 + rand() * 2.8])
  }
  pts.push([100, rand() * amp, 1.5])
  return pts
}

const sides = [
  ["t", "b"],
  ["l", "r"],
  ["t", "r"],
  ["b", "l"],
  ["t", "r", "b", "l"],
  ["r", "b"],
]

export function tornClips(rand: Rand, amp: number) {
  const torn = sides[Math.floor(rand() * sides.length)]
  const [t, r, b, l] = ["t", "r", "b", "l"].map((s) =>
    edge(rand, torn.includes(s), amp)
  )
  const poly = (rim: boolean) => {
    const j = (p: number[]) => f(p[1] + (rim ? p[2] : 0))
    return `polygon(${[
      ...t.map((p) => `${f(p[0])}% ${j(p)}px`),
      ...r.map((p) => `calc(100% - ${j(p)}px) ${f(p[0])}%`),
      ...b.map((p) => `${f(100 - p[0])}% calc(100% - ${j(p)}px)`),
      ...l.map((p) => `${j(p)}px ${f(100 - p[0])}%`),
    ].join(",")})`
  }
  return { outer: poly(false), inner: poly(true) }
}

export function tearPaths(rand: Rand, w = 1000, h = 24) {
  let solid = `M0 ${h}`
  let fiber = `M0 ${h}`
  let y = h * 0.45
  for (let x = 0; x <= w; x += 2.5 + rand() * 6) {
    y = Math.min(h * 0.8, Math.max(h * 0.12, y + (rand() - 0.5) * h * 0.3))
    const s = y + rand() * h * 0.1
    solid += `L${f(x)} ${f(s)}`
    fiber += `L${f(x)} ${f(s - 1 - rand() * 3)}`
  }
  return { solid: `${solid}L${w} ${h}Z`, fiber: `${fiber}L${w} ${h}Z` }
}
