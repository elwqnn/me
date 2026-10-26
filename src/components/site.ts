const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
const LOWER = "abcdefghijklmnopqrstuvwxyz"
const DIGITS = "0123456789"
const SIGNS = "#%&*+=/<>"
const reduce = matchMedia("(prefers-reduced-motion: reduce)")
const texts = new WeakMap<HTMLElement, string>()
const busy = new WeakSet<HTMLElement>()

const pick = (set: string) => set[(Math.random() * set.length) | 0]
const glyph = (c: string) =>
  pick(
    c >= "a" && c <= "z"
      ? LOWER
      : c >= "A" && c <= "Z"
        ? UPPER
        : c >= "0" && c <= "9"
          ? DIGITS
          : SIGNS
  )
const escape = (c: string) =>
  c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c

function lines(el: HTMLElement) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  let text = ""
  let top = -Infinity
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    for (const word of node.textContent!.matchAll(/\S+/g)) {
      range.setStart(node, word.index)
      range.setEnd(node, word.index + word[0].length)
      const box = range.getBoundingClientRect()
      if (text) text += box.top - top > box.height / 2 ? "\n" : " "
      text += word[0]
      top = box.top
    }
  }
  return text
}

export function scramble(el: HTMLElement, delay = 0) {
  el.dataset.decoded = ""
  if (reduce.matches || busy.has(el)) return
  const style = getComputedStyle(el)
  const multiline =
    el.getClientRects().length > 1 ||
    el.offsetHeight > parseFloat(style.lineHeight) * 1.5
  const flat =
    texts.get(el) ?? (el.textContent ?? "").replace(/\s+/g, " ").trim()
  texts.set(el, flat)
  const chars = [...(multiline ? lines(el) : flat)]
  if (!chars.length) return
  const spread = Math.min(640, chars.length * 34)
  const appear = chars.map((_, i) =>
    delay ? delay + (i / chars.length) * spread * 0.5 : 0
  )
  const resolve = chars.map(
    (_, i) =>
      appear[i] + 140 + (i / chars.length) * spread * 0.6 + Math.random() * 180
  )
  const shown = chars.map((c) => glyph(c))

  const layer = document.createElement("span")
  layer.className = "scramble-layer"
  layer.setAttribute("aria-hidden", "true")
  layer.style.whiteSpace = multiline ? "pre" : "nowrap"
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
      if (swap && Math.random() < 0.7) shown[i] = glyph(c)
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
        const el = entry.target as HTMLElement
        io.unobserve(el)
        const show = () => el.classList.add("is-in")
        const img = el.querySelector("img")
        if (el.dataset.reveal !== "image" || !img || img.complete) {
          show()
          continue
        }
        img.addEventListener("load", show, { once: true })
        img.addEventListener("error", show, { once: true })
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

const root = document.documentElement
const fonts = Promise.all([
  document.fonts.load('1em "Geist Variable"'),
  document.fonts.load('1em "Geist Mono Variable"'),
])
const cap = new Promise((resolve) => setTimeout(resolve, 2500))

Promise.race([fonts, cap])
  .catch(() => {})
  .then(() => {
    root.classList.add("fonts")
    initScramble()
    initReveal()
    initClock()
    root.classList.add("ready")
  })
