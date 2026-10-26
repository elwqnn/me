import { readFileSync } from "node:fs"
import { getCollection, type CollectionEntry } from "astro:content"
import { getImage } from "astro:assets"

export type Project = CollectionEntry<"projects">

export interface Shot {
  src: string
  thumb: string
  srcset?: string
  width: number
  height: number
  wide: boolean
  small: boolean
  kind: string
}

const files = import.meta.glob<{ default: ImageMetadata }>(
  "/public/images/projects/**/*.{png,jpg,jpeg,webp}",
  { eager: true }
)

const kinds: [RegExp, string][] = [
  [/\.gif$/, "Trailer"],
  [/poster/, "Poster"],
  [/logomark/, "Logomark"],
  [/typeface/, "Typeface"],
  [/accent-colors|palette/, "Palette"],
  [/combinations/, "Lockups"],
  [/brand-cover|all-v\d/, "Identity"],
  [/pattern/, "Patterns"],
  [/cover-/, "Editorial"],
  [/cover/, "Cover"],
]

export async function getProjects() {
  return (await getCollection("projects")).sort(
    (a, b) => a.data.order - b.data.order
  )
}

export const pad = (n: number) => String(n).padStart(2, "0")

export function host(url: string) {
  const u = new URL(url)
  return u.host.replace(/^www\./, "") + u.pathname.replace(/\/$/, "")
}

export function projectLinks({ data }: Project) {
  return [
    ...data.links,
    ...(data.liveUrl ? [{ label: "Live", url: data.liveUrl }] : []),
    ...(data.githubUrl ? [{ label: "Source code", url: data.githubUrl }] : []),
  ]
}

function gifSize(src: string) {
  const head = readFileSync(`public${src}`)
  return { width: head.readUInt16LE(6), height: head.readUInt16LE(8) }
}

export function shots(project: Project): Promise<Shot[]> {
  return Promise.all(
    project.data.images.map(async (raw) => {
      const src = raw.replace(/#wide$/, "")
      const meta = files[`/public${src}`]?.default
      const kind = kinds.find(([re]) => re.test(src))?.[1] ?? "Interface"
      const size = meta ?? gifSize(src)
      const base = {
        src,
        thumb: src,
        width: size.width,
        height: size.height,
        wide: raw.endsWith("#wide"),
        small: size.width <= 640,
        kind,
      }
      if (!meta) return base
      const widths = [480, 960, 1600].filter((w) => w < meta.width)
      if (meta.width < 1600) widths.push(meta.width)
      const img = await getImage({ src: meta, widths, format: "webp" })
      return { ...base, thumb: img.src, srcset: img.srcSet.attribute }
    })
  )
}
