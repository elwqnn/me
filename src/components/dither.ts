const css = getComputedStyle(document.documentElement)

export const rgb = (name: string): [number, number, number] => {
  const n = parseInt(css.getPropertyValue(name).trim().slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const pack = ([r, g, b]: number[]) =>
  ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0

export const INK = pack(rgb("--ink"))
export const PAPER = pack(rgb("--paper"))
export const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches

export const BAYER = (() => {
  let m = [[0]]
  for (let k = 0; k < 3; k++) {
    const n = m.length
    const next = Array.from({ length: n * 2 }, () => new Array<number>(n * 2))
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const v = m[y][x] * 4
        next[y][x] = v
        next[y][x + n] = v + 2
        next[y + n][x] = v + 3
        next[y + n][x + n] = v + 1
      }
    m = next
  }
  return Float32Array.from(m.flat(), (v) => (v + 0.5) / 64)
})()

export const easeOut = (t: number) => 1 - (1 - t) ** 3
export const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2

export function animate(
  duration: number,
  step: (k: number) => boolean | void,
  ease = easeInOut
) {
  return new Promise<void>((done) => {
    if (reduced || duration <= 0) {
      step(1)
      return done()
    }
    const start = performance.now()
    const frame = (now: number) => {
      const k = Math.min(1, (now - start) / duration)
      if (step(ease(k)) === false || k === 1) return done()
      requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  })
}

function atkinson(lum: Float32Array, w: number, h: number) {
  const bits = new Uint8Array(w * h)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const v = lum[i]
      const dark = v < 0.5
      bits[i] = dark ? 1 : 0
      const e = (dark ? v : v - 1) / 8
      if (x + 1 < w) lum[i + 1] += e
      if (x + 2 < w) lum[i + 2] += e
      if (y + 1 < h) {
        if (x > 0) lum[i + w - 1] += e
        lum[i + w] += e
        if (x + 1 < w) lum[i + w + 1] += e
      }
      if (y + 2 < h) lum[i + 2 * w] += e
    }
  return bits
}

const loaded = (img: HTMLImageElement) =>
  img.complete && img.naturalWidth
    ? Promise.resolve()
    : new Promise<void>((resolve, reject) => {
        img.addEventListener("load", () => resolve(), { once: true })
        img.addEventListener("error", reject, { once: true })
      })

function paintTrie(canvas: HTMLCanvasElement, accent: string) {
  const ctx = canvas.getContext("2d")!
  const { width: w, height: h } = canvas
  const u = Math.min(w, h)
  ctx.fillStyle = "#151515"
  ctx.fillRect(0, 0, w, h)
  const root = [w * 0.16, h * 0.5]
  const mid = [0.2, 0.5, 0.8].map((f) => [w * 0.46, h * f])
  const leaves = mid.flatMap(([, y], i) =>
    (i === 1 ? [-1, 0, 1] : [-1, 1]).map((k, j) => ({
      at: [w * 0.8, y + k * h * 0.095],
      from: i,
      wild: (i + j) % 3 === 0,
    }))
  )
  const edge = ([ax, ay]: number[], [bx, by]: number[]) => {
    const mx = (ax + bx) / 2
    ctx.moveTo(ax, ay)
    ctx.bezierCurveTo(mx, ay, mx, by, bx, by)
  }
  ctx.strokeStyle = "#ebdbb2"
  ctx.lineWidth = Math.max(2, u * 0.014)
  ctx.beginPath()
  mid.forEach((m) => edge(root, m))
  leaves.forEach((l) => edge(mid[l.from], l.at))
  ctx.stroke()
  const node = ([x, y]: number[], r: number, fill: string) => {
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  node(root, u * 0.085, "#ebdbb2")
  node(root, u * 0.05, accent)
  mid.forEach((m) => node(m, u * 0.045, accent))
  leaves.forEach(({ at: [x, y], wild }) => {
    const s = u * 0.05
    ctx.fillStyle = wild ? "#ebdbb2" : accent
    ctx.fillRect(x - s / 2, y - s / 2, s, s)
  })
}

type Prop = "reveal" | "ink"

export class Surface {
  w = 0
  h = 0
  reveal = 0
  ink = 0
  ox = 0
  oy = 0
  bits = new Uint8Array(0)
  frame: ImageData | null = null
  buf = new Uint32Array(0)
  seq = { reveal: 0, ink: 0 }
  queued = false
  size = ""
  ctx: CanvasRenderingContext2D

  constructor(
    readonly el: HTMLElement,
    readonly canvas: HTMLCanvasElement,
    readonly source: HTMLImageElement | HTMLCanvasElement,
    readonly fit: "cover" | "contain" = "cover",
    readonly px = 2
  ) {
    this.ctx = canvas.getContext("2d")!
  }

  async layout() {
    const { source, el, canvas } = this
    if (source instanceof HTMLImageElement) await loaded(source)
    const W = el.clientWidth
    const H = el.clientHeight
    if (!W || !H) return
    const dpr = window.devicePixelRatio || 1
    const dev = Math.max(1, Math.round(this.px * dpr))
    const s = dpr / dev
    const w = Math.ceil(W * s)
    const h = Math.ceil(H * s)
    this.size = `${W}x${H}@${dpr}`
    canvas.width = w
    canvas.height = h
    canvas.style.width = `${(w * dev) / dpr}px`
    canvas.style.height = `${(h * dev) / dpr}px`

    if (source instanceof HTMLCanvasElement) {
      source.width = Math.round(W * dpr)
      source.height = Math.round(H * dpr)
      paintTrie(source, source.dataset.accent ?? "#888")
    }
    const sw =
      source instanceof HTMLImageElement ? source.naturalWidth : source.width
    const sh =
      source instanceof HTMLImageElement ? source.naturalHeight : source.height
    const scale = (this.fit === "cover" ? Math.max : Math.min)(W / sw, H / sh)
    const dw = sw * scale * s
    const dh = sh * scale * s

    const off = document.createElement("canvas")
    off.width = w
    off.height = h
    const o = off.getContext("2d", { willReadFrequently: true })!
    o.fillStyle = "#fff"
    o.fillRect(0, 0, w, h)
    o.imageSmoothingQuality = "high"
    o.drawImage(source, (W * s - dw) / 2, (H * s - dh) / 2, dw, dh)
    const data = o.getImageData(0, 0, w, h).data
    const lum = new Float32Array(w * h)
    let mean = 0
    for (let i = 0; i < lum.length; i++) {
      lum[i] =
        (0.2126 * data[i * 4] +
          0.7152 * data[i * 4 + 1] +
          0.0722 * data[i * 4 + 2]) /
        255
      mean += lum[i] / lum.length
    }
    const gamma = Math.min(1, Math.max(0.45, Math.log(0.38) / Math.log(mean)))
    if (gamma < 1) for (let i = 0; i < lum.length; i++) lum[i] **= gamma

    this.w = w
    this.h = h
    this.bits = atkinson(lum, w, h)
    this.frame = this.ctx.createImageData(w, h)
    this.buf = new Uint32Array(this.frame.data.buffer)
    this.draw()
  }

  draw() {
    const { w, h, bits, buf, ox, oy } = this
    if (!w || !this.frame) return
    const maxD = Math.hypot(Math.max(ox, w - ox), Math.max(oy, h - oy)) || 1
    const r = this.reveal * 1.02
    const k = this.ink * 1.02
    for (let y = 0; y < h; y++) {
      const row = (y & 7) * 8
      const dy = (y - oy) * (y - oy)
      const yv = (y / h) * 0.45
      for (let x = 0; x < w; x++) {
        const i = y * w + x
        const b = BAYER[row + (x & 7)]
        if (r > 0 && b * 0.4 + (Math.sqrt((x - ox) ** 2 + dy) / maxD) * 0.6 < r)
          buf[i] = 0
        else buf[i] = bits[i] && b * 0.55 + yv < k ? INK : PAPER
      }
    }
    this.ctx.putImageData(this.frame, 0, 0)
  }

  invalidate() {
    if (this.queued) return
    this.queued = true
    requestAnimationFrame(() => {
      this.queued = false
      this.draw()
    })
  }

  to(prop: Prop, value: number, duration: number, ease = easeInOut, delay = 0) {
    const id = ++this.seq[prop]
    const run = () => {
      const from = this[prop]
      return animate(
        duration,
        (k) => {
          if (this.seq[prop] !== id) return false
          this[prop] = from + (value - from) * k
          this.invalidate()
        },
        ease
      )
    }
    if (delay > 0 && !reduced) setTimeout(run, delay)
    else run()
  }

  origin(e?: { clientX: number; clientY: number }) {
    const r = this.el.getBoundingClientRect()
    const s = r.width ? this.w / r.width : 0
    this.ox = e ? (e.clientX - r.left) * s : this.w / 2
    this.oy = e ? (e.clientY - r.top) * s : this.h / 2
  }

  show(e?: PointerEvent) {
    this.origin(e)
    this.to("reveal", 1, 650, easeOut)
  }

  hide(e?: PointerEvent) {
    this.origin(e)
    this.to("reveal", 0, 480)
  }
}

export function mountAll() {
  const surfaces = new Map<Element, Surface>()
  const touch = matchMedia("(hover: none)").matches

  const resize = new ResizeObserver((entries) => {
    for (const { target } of entries) {
      const s = surfaces.get(target)
      const dpr = window.devicePixelRatio || 1
      const size = `${(target as HTMLElement).clientWidth}x${(target as HTMLElement).clientHeight}@${dpr}`
      if (s && s.w && s.size !== size) s.layout()
    }
  })

  const center = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const s = surfaces.get(e.target)
        if (!s) continue
        if (e.isIntersecting) s.show()
        else s.hide()
      }
    },
    { rootMargin: "-42% 0px -42% 0px" }
  )

  const enter = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        enter.unobserve(e.target)
        const s = surfaces.get(e.target)!
        const delay =
          (performance.now() < 1500 ? 280 : 0) +
          (e.boundingClientRect.left / window.innerWidth) * 220
        s.layout()
          .then(() => {
            s.el.classList.add("ready")
            s.to("ink", 1, 900, easeInOut, delay)
            resize.observe(s.el)
            if (touch && !reduced) center.observe(s.el)
          })
          .catch(() => s.el.classList.add("ready"))
      }
    },
    { rootMargin: "240px 0px" }
  )

  for (const el of document.querySelectorAll<HTMLElement>("[data-bitmap]")) {
    const canvas = el.querySelector<HTMLCanvasElement>(".bitmap-dither")
    const source = el.querySelector<HTMLImageElement | HTMLCanvasElement>(
      "img, .bitmap-color"
    )
    if (!canvas || !source) continue
    const s = new Surface(
      el,
      canvas,
      source,
      el.dataset.fit === "contain" ? "contain" : "cover"
    )
    surfaces.set(el, s)
    enter.observe(el)

    const trigger = el.closest<HTMLElement>("a, button") ?? el
    trigger.addEventListener("pointerenter", (e) => {
      if (e.pointerType !== "touch") s.show(e)
    })
    trigger.addEventListener("pointerleave", (e) => {
      if (e.pointerType !== "touch") s.hide(e)
    })
    trigger.addEventListener("focus", () => {
      if (trigger.matches(":focus-visible")) s.show()
    })
    trigger.addEventListener("blur", () => s.hide())
  }
}
