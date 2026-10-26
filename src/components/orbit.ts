import { navigate } from "astro:transitions/client"

const KEY = "orbit:slug"

const mod = (a: number, n: number) => ((a % n) + n) % n
const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v))

function recall() {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function remember(slug: string) {
  try {
    sessionStorage.setItem(KEY, slug)
  } catch {
    return
  }
}

export function claimCover(media: Element | null | undefined) {
  if (!media) return
  document
    .querySelectorAll(".vt-cover")
    .forEach((el) => el !== media && el.classList.remove("vt-cover"))
  media.classList.add("vt-cover")
}

function paint(orbit: HTMLElement, front: number) {
  const cards = orbit.querySelectorAll<HTMLElement>("[data-card]")
  orbit
    .querySelectorAll(".vt-cover")
    .forEach((el) => el.classList.remove("vt-cover"))
  cards[front].querySelector("[data-media]")?.classList.add("vt-cover")
  for (const list of ["[data-caption]", "[data-dot]"])
    orbit
      .querySelectorAll(list)
      .forEach((el, i) => el.classList.toggle("is-front", i === front))
  const count = orbit.querySelector("[data-count]")
  if (count) count.textContent = String(front + 1).padStart(2, "0")
}

export function preset(doc: Document) {
  const orbit = doc.querySelector<HTMLElement>("[data-orbit]")
  if (!orbit) return false
  const slugs = [...orbit.querySelectorAll<HTMLElement>("[data-card]")].map(
    (c) => c.dataset.slug
  )
  const i = slugs.indexOf(recall() ?? "")
  if (i >= 0) {
    orbit.style.setProperty("--rot", String(i))
    paint(orbit, i)
  }
  return true
}

export function mountOrbit(restore: boolean) {
  const orbit = document.querySelector<HTMLElement>("[data-orbit]")
  if (!orbit || orbit.dataset.ready !== undefined) return
  orbit.dataset.ready = ""

  const stage = orbit.querySelector<HTMLElement>("[data-stage]")!
  const cards = [...orbit.querySelectorAll<HTMLElement>("[data-card]")]
  const links = cards.map((c) => c.querySelector<HTMLAnchorElement>("a")!)
  const n = cards.length
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches
  const ac = new AbortController()
  const { signal } = ac

  const base = () => {
    if (reduce) return 0
    const box = orbit.getBoundingClientRect()
    const span = box.height - innerHeight
    if (span <= 0) return 0
    const u = clamp(-box.top / span, 0, 1) * (n - 1)
    const k = Math.min(Math.floor(u), n - 2)
    const s = clamp((u - k - 0.2) / 0.6, 0, 1)
    return k + s * s * (3 - 2 * s)
  }

  const start = restore
    ? cards.findIndex((c) => c.dataset.slug === recall())
    : -1
  let offset = start < 0 ? 0 : start - Math.round(base())
  let target = base() + offset
  let current = target
  let front = -1
  let raf = 0
  let last = 0
  let pending: string | null = null
  let visible = true
  let wheelTimer = 0

  const render = () => {
    orbit.style.setProperty("--rot", current.toFixed(4))
    const f = mod(Math.round(current), n)
    if (f === front) return
    front = f
    paint(orbit, f)
    remember(cards[f].dataset.slug!)
  }

  const flush = () => {
    if (!pending) return
    const href = pending
    pending = null
    navigate(href)
  }

  const tick = (t: number) => {
    const dt = Math.min(48, t - last)
    last = t
    current += (target - current) * (1 - Math.exp(-dt / 120))
    const settled =
      !drag.active && Math.abs(target - current) < (pending ? 0.02 : 0.002)
    if (settled) current = target
    render()
    if (!settled) {
      raf = requestAnimationFrame(tick)
      return
    }
    raf = 0
    flush()
  }

  const go = () => {
    target = base() + offset
    if (reduce) {
      current = target
      render()
      flush()
      return
    }
    if (raf) return
    last = performance.now()
    raf = requestAnimationFrame(tick)
  }

  const toIndex = (i: number) => {
    const d = mod(i - Math.round(target) + n / 2, n) - n / 2
    offset = Math.round(offset) + d
    go()
  }

  const step = (d: number) => {
    pending = null
    offset = Math.round(offset) + d
    go()
    if (document.activeElement?.closest("[data-card]"))
      links[mod(Math.round(target), n)].focus({ preventScroll: true })
  }

  const drag = {
    active: false,
    moved: false,
    id: -1,
    x0: 0,
    o0: 0,
    x: 0,
    t: 0,
    v: 0,
  }
  const span = () => cards[0].offsetWidth * 0.9

  stage.addEventListener(
    "pointerdown",
    (e) => {
      if (e.button !== 0 || (e.target as Element).closest("button")) return
      if (e.pointerType === "mouse") e.preventDefault()
      Object.assign(drag, {
        active: true,
        moved: false,
        id: e.pointerId,
        x0: e.clientX,
        o0: offset,
        x: e.clientX,
        t: e.timeStamp,
        v: 0,
      })
    },
    { signal }
  )

  addEventListener(
    "pointermove",
    (e) => {
      if (!drag.active || e.pointerId !== drag.id) return
      const dx = e.clientX - drag.x0
      if (!drag.moved && Math.abs(dx) < 6) return
      if (!drag.moved) {
        drag.moved = true
        pending = null
        orbit.classList.add("is-dragging")
      }
      const dt = Math.max(1, e.timeStamp - drag.t)
      drag.v = drag.v * 0.2 + ((drag.x - e.clientX) / span() / dt) * 0.8
      drag.x = e.clientX
      drag.t = e.timeStamp
      offset = drag.o0 - dx / span()
      go()
    },
    { signal }
  )

  const release = (e: PointerEvent) => {
    if (!drag.active || e.pointerId !== drag.id) return
    drag.active = false
    orbit.classList.remove("is-dragging")
    if (!drag.moved) return
    const v = e.timeStamp - drag.t > 90 ? 0 : drag.v
    offset = Math.round(offset + clamp(v * 240, -2, 2))
    go()
  }
  addEventListener("pointerup", release, { signal })
  addEventListener("pointercancel", release, { signal })

  stage.addEventListener(
    "click",
    (e) => {
      if (!drag.moved) return
      drag.moved = false
      e.preventDefault()
      e.stopPropagation()
    },
    { capture: true, signal }
  )

  stage.addEventListener("dragstart", (e) => e.preventDefault(), { signal })

  links.forEach((link, i) =>
    link.addEventListener(
      "click",
      (e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
          return
        const resting =
          front === i &&
          Math.abs(target - current) < 0.05 &&
          Math.abs(target - Math.round(target)) < 0.05
        if (resting) return
        e.preventDefault()
        pending = link.href
        toIndex(i)
      },
      { signal }
    )
  )

  orbit.addEventListener(
    "focusin",
    (e) => {
      if (drag.active) return
      const card = (e.target as Element).closest<HTMLElement>("[data-card]")
      if (!card) return
      pending = null
      toIndex(cards.indexOf(card))
    },
    { signal }
  )

  orbit.querySelectorAll<HTMLButtonElement>("[data-step]").forEach((b) =>
    b.addEventListener("click", () => step(Number(b.dataset.step)), {
      signal,
    })
  )

  addEventListener(
    "keydown",
    (e) => {
      if (!visible || e.altKey || e.metaKey || e.ctrlKey) return
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
      e.preventDefault()
      step(e.key === "ArrowRight" ? 1 : -1)
    },
    { signal }
  )

  stage.addEventListener(
    "wheel",
    (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
      e.preventDefault()
      pending = null
      offset += e.deltaX / span()
      go()
      clearTimeout(wheelTimer)
      wheelTimer = window.setTimeout(() => {
        offset = Math.round(offset)
        go()
      }, 140)
    },
    { passive: false, signal }
  )

  addEventListener("scroll", go, { passive: true, signal })

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
  })
  io.observe(stage)

  render()

  return () => {
    ac.abort()
    io.disconnect()
    cancelAnimationFrame(raf)
    clearTimeout(wheelTimer)
  }
}
