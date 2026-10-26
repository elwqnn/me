const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/<>"
const reduce = matchMedia("(prefers-reduced-motion: reduce)")
const texts = new WeakMap<HTMLElement, string>()
const busy = new WeakSet<HTMLElement>()

const glyph = () => GLYPHS[(Math.random() * GLYPHS.length) | 0]
const escape = (c: string) =>
  c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c

export function scramble(el: HTMLElement, delay = 0) {
  el.dataset.decoded = ""
  if (reduce.matches || busy.has(el)) return
  const text =
    texts.get(el) ?? (el.textContent ?? "").replace(/\s+/g, " ").trim()
  texts.set(el, text)
  const chars = [...text]
  if (!chars.length) return

  const style = getComputedStyle(el)
  const multiline =
    el.getClientRects().length > 1 ||
    el.offsetHeight > parseFloat(style.lineHeight) * 1.5
  const spread = Math.min(640, chars.length * 34)
  const appear = chars.map((_, i) =>
    delay ? delay + (i / chars.length) * spread * 0.5 : 0
  )
  const resolve = chars.map(
    (_, i) =>
      appear[i] + 140 + (i / chars.length) * spread * 0.6 + Math.random() * 180
  )
  const shown = chars.map(glyph)

  const layer = document.createElement("span")
  layer.className = "scramble-layer"
  layer.setAttribute("aria-hidden", "true")
  if (!multiline) layer.style.whiteSpace = "nowrap"
  busy.add(el)
  el.classList.add("is-scrambling")
  el.append(layer)

  const start = performance.now()
  let swapped = 0
  const frame = (now: number) => {
    const t = now - start
    const swap = now - swapped > 60
    if (swap) swapped = now
    let html = ""
    let open = false
    let done = true
    chars.forEach((c, i) => {
      if (/\s/.test(c) || t >= resolve[i]) {
        if (open) html += "</span>"
        open = false
        html += escape(c)
        return
      }
      done = false
      if (!open) html += '<span class="u">'
      open = true
      if (t < appear[i]) {
        html += " "
        return
      }
      if (swap && Math.random() < 0.7) shown[i] = glyph()
      html += escape(shown[i])
    })
    if (open) html += "</span>"
    if (done) {
      layer.remove()
      el.classList.remove("is-scrambling")
      busy.delete(el)
      return
    }
    layer.innerHTML = html
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

function initScramble() {
  const items = [...document.querySelectorAll<HTMLElement>("[data-scramble]")]
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const el = entry.target as HTMLElement
        io.unobserve(el)
        scramble(el, 40 + Number(el.dataset.scrambleDelay ?? 0))
      }
    },
    { rootMargin: "0px 0px -6% 0px" }
  )
  for (const el of items) {
    io.observe(el)
    const host =
      el.closest<HTMLElement>("a, button, [data-scramble-host]") ?? el
    const run = () => {
      if (el.dataset.decoded !== undefined) scramble(el)
    }
    host.addEventListener("pointerenter", run)
    host.addEventListener("focusin", run)
  }
}

function initReveal() {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add("is-in")
        io.unobserve(entry.target)
      }
    },
    { rootMargin: "0px 0px -10% 0px" }
  )
  document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el))
}

function initClock() {
  const clocks = document.querySelectorAll<HTMLTimeElement>("[data-clock]")
  if (!clocks.length) return
  const format = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
  })
  const tick = () => {
    const now = new Date()
    clocks.forEach((c) => {
      c.textContent = format.format(now)
      c.dateTime = now.toISOString()
    })
  }
  tick()
  setInterval(tick, 15000)
}

initScramble()
initReveal()
initClock()
