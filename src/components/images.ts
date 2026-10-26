export const clean = (src: string) => src.replace(/#wide$/, "")

export const isWide = (src: string) => src.endsWith("#wide")

export const pad = (n: number) => String(n).padStart(2, "0")

export function describe(src: string, title: string, slug: string) {
  const name = clean(src)
    .split("/")
    .pop()!
    .replace(/\.\w+$/, "")
    .replace(new RegExp(`^${slug}[-_]`), "")
    .replace(/[-_]+/g, " ")
  return `${title}, ${name}`
}

export function host(url: string) {
  const { hostname, pathname } = new URL(url)
  return (hostname + pathname).replace(/^www\./, "").replace(/\/$/, "")
}
