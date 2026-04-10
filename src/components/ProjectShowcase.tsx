import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
} from "react"
import { cn } from "@/lib/utils"

const CYCLE_MS = 8000
const BAR_HEIGHT = 20

export interface ProjectItem {
  slug: string
  title: string
  description: string
  tags: string[]
  images: string[]
  accentColor: string
  year: string
}

export function ProjectShowcase({ projects }: { projects: ProjectItem[] }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const active = projects[activeIndex]
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [barTop, setBarTop] = useState(0)
  const [barGrowing, setBarGrowing] = useState(false)
  const timerRef = useRef<number | undefined>(undefined)

  useLayoutEffect(() => {
    const btn = buttonRefs.current[activeIndex]
    if (!btn) return
    setBarTop(btn.offsetTop + (btn.offsetHeight - BAR_HEIGHT) / 2)
    setBarGrowing(false)
  }, [activeIndex])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setBarGrowing(true))
    })
    return () => cancelAnimationFrame(frame)
  }, [activeIndex])

  const advance = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % projects.length)
  }, [projects.length])

  useEffect(() => {
    timerRef.current = window.setInterval(advance, CYCLE_MS)
    return () => clearInterval(timerRef.current)
  }, [advance])

  const switchTo = (index: number) => {
    setActiveIndex(index)
    clearInterval(timerRef.current)
    timerRef.current = window.setInterval(advance, CYCLE_MS)
  }

  return (
    <div className="flex flex-col-reverse gap-6 sm:flex-row sm:gap-8">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-[4]">
        <a
          href={`/projects/${active.slug}`}
          className="group relative block aspect-video overflow-hidden rounded-lg"
        >
          {projects.map((project, i) =>
            project.images.length > 0 ? (
              <img
                key={project.slug}
                src={project.images[0]}
                alt={`${project.title} preview`}
                className={cn(
                  "absolute inset-0 h-full w-full object-cover transition-all duration-500 ease-in-out",
                  i === activeIndex
                    ? "scale-100 opacity-100 group-hover:scale-[1.02]"
                    : "pointer-events-none scale-[1.02] opacity-0"
                )}
              />
            ) : null
          )}
          {active.images.length === 0 && (
            <div className="h-full w-full bg-muted" />
          )}
        </a>

        <div className="relative">
          {projects.map((project, i) => (
            <div
              key={project.slug}
              className={cn(
                "transition-opacity duration-500 ease-in-out",
                i === activeIndex
                  ? "opacity-100"
                  : "pointer-events-none absolute inset-x-0 top-0 opacity-0"
              )}
            >
              <div className="flex items-baseline gap-2">
                <a
                  href={`/projects/${project.slug}`}
                  className="text-sm font-medium transition-opacity duration-200 hover:opacity-80"
                  style={{ color: project.accentColor }}
                >
                  {project.title}
                </a>
                <span className="text-xs text-muted-foreground/40">
                  {project.year}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {project.description}
              </p>
              <p className="mt-2 text-xs text-muted-foreground/40">
                {project.tags.join(" · ")}
              </p>
            </div>
          ))}
        </div>
      </div>

      <nav className="relative flex flex-row flex-wrap gap-3 overflow-hidden sm:flex-[1] sm:flex-col sm:gap-0">
        <div
          className="pointer-events-none absolute left-0 hidden w-0.5 rounded-full sm:block"
          style={{
            top: barTop,
            height: barGrowing ? BAR_HEIGHT : 0,
            transition: barGrowing ? `height ${CYCLE_MS}ms linear` : "none",
            backgroundColor: active.accentColor,
          }}
        />

        {projects.map((project, i) => {
          const isActive = i === activeIndex

          return (
            <button
              key={project.slug}
              ref={(el) => {
                buttonRefs.current[i] = el
              }}
              onClick={() => switchTo(i)}
              className={cn(
                "text-left text-sm transition-all duration-200 sm:py-2 sm:pl-4",
                isActive
                  ? "font-medium"
                  : "text-muted-foreground hover:translate-x-0.5 hover:text-foreground"
              )}
              style={isActive ? { color: project.accentColor } : undefined}
            >
              {project.title}
              {isActive && (
                <div className="mt-0.5 hidden text-xs font-normal text-muted-foreground/50 animate-in fade-in slide-in-from-top-1 sm:block">
                  {project.year} · {project.tags[0]}
                </div>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
