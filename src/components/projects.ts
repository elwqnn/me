import { getCollection } from "astro:content"

export const HOME_BG = "#FABD2F"

export async function getProjects() {
  const projects = await getCollection("projects")
  return projects.sort((a, b) => a.data.order - b.data.order)
}

export const cleanSrc = (src: string) => src.replace(/#wide$/, "")

export const isWide = (src: string) => src.endsWith("#wide")

export const pad = (n: number) => String(n).padStart(2, "0")

export function titleLines(title: string) {
  const words = title.split(" ")
  if (title.length <= 12 || words.length < 2) return [title]
  let best = [title]
  let bestScore = Infinity
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ")
    const b = words.slice(i).join(" ")
    const score = Math.abs(a.length - b.length)
    if (score < bestScore) {
      bestScore = score
      best = [a, b]
    }
  }
  return best
}
