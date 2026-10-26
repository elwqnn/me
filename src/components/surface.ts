const VERT = `#version 300 es
in vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }`

const TRAIL = 12

const FRAG = `#version 300 es
precision highp float;
out vec4 o;
uniform vec2 uRes;
uniform float uScale;
uniform float uTime;
uniform vec2 uSeedA;
uniform vec2 uSeedB;
uniform float uFront;
uniform float uFade;
uniform vec2 uOrigin;
uniform vec4 uTrail[${TRAIL}];
uniform float uScroll;
uniform float uAgit;
uniform vec3 uTint;
uniform float uTintAmt;
uniform float uDim;
uniform float uLevels;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

const mat2 R = mat2(0.8, -0.6, 0.6, 0.8);

float fbm(vec2 p) {
  float s = snoise(p);
  p = R * p * 2.03 + 3.1;
  s += 0.36 * snoise(p);
  p = R * p * 2.01 + 1.7;
  s += 0.12 * snoise(p);
  return s / 1.48;
}

float field(vec2 p, vec2 seed) {
  p += seed;
  float t = uTime;
  vec2 q = vec2(
    fbm(p * 0.42 + vec2(0.0, t * 0.05)),
    fbm(p * 0.42 + vec2(5.2, 1.3) - vec2(t * 0.04, 0.0))
  );
  return fbm(p * 0.36 + (1.1 + 0.7 * uAgit) * q + vec2(t * 0.012, -t * 0.018));
}

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec2 fc = gl_FragCoord.xy;
  float mn = min(uRes.x, uRes.y);
  vec2 ps = (fc - 0.5 * uRes) / mn * uScale;
  vec2 p = ps - vec2(0.0, uScroll);

  float bump = 0.0;
  for (int i = 0; i < ${TRAIL}; i++) {
    vec2 d = ps - uTrail[i].xy;
    bump += uTrail[i].z * exp(-dot(d, d) * 16.0);
  }

  float f;
  float ring = 0.0;
  float glow = 0.0;
  if (uFront >= 0.0) {
    vec2 dv = ps - uOrigin;
    float r = length(dv);
    float wave = exp(-pow((r - uFront) * 7.0, 2.0)) * uFade;
    vec2 q = p + dv / max(r, 1e-3) * wave * 0.14;
    f = mix(field(q, uSeedA), field(q, uSeedB), smoothstep(uFront, uFront - 0.35, r));
    ring = (1.0 - smoothstep(0.4, 1.6, abs(r - uFront) / max(fwidth(r), 1e-4))) * uFade;
    glow = wave * 0.08;
  } else {
    f = field(p, uSeedA);
  }
  f += bump * 0.5;

  float h = f * uLevels;
  float w = max(fwidth(h), 1e-4);
  float minor = 1.0 - smoothstep(0.3, 1.15, abs(fract(h + 0.5) - 0.5) / w);
  float major = 1.0 - smoothstep(0.55, 1.6, abs(fract(h / 5.0 + 0.5) - 0.5) * 5.0 / w);
  float crowd = 1.0 - smoothstep(0.18, 0.42, w);
  minor *= crowd;
  major *= mix(0.35, 1.0, crowd);

  float low = smoothstep(0.2, -0.65, f);
  float high = smoothstep(0.05, 0.8, f);

  vec3 bg = vec3(0.039, 0.043, 0.036);
  vec3 ink = vec3(0.925, 0.906, 0.86);
  vec3 col = bg + vec3(0.022, 0.024, 0.02) * high;
  col += uTint * uTintAmt * (0.05 + 0.26 * low * low);

  vec3 line = mix(ink, mix(ink, uTint, 0.8), uTintAmt);
  float a = minor * 0.09 + major * 0.24;
  a *= 1.0 - uDim;
  a += min(bump, 1.0) * 0.16 * (minor + major) + ring * 0.55 + glow;
  col = mix(col, line, clamp(a, 0.0, 1.0));

  vec2 uv = fc / uRes - 0.5;
  col *= mix(0.62, 1.0, smoothstep(0.95, 0.25, length(uv * vec2(1.0, 1.25))));
  col += (hash(fc + fract(uTime * 7.0) * 113.0) - 0.5) * (3.0 / 255.0);

  o = vec4(col, 1.0);
}`

const UNIFORMS = [
  "uRes",
  "uScale",
  "uTime",
  "uSeedA",
  "uSeedB",
  "uFront",
  "uFade",
  "uOrigin",
  "uTrail",
  "uScroll",
  "uAgit",
  "uTint",
  "uTintAmt",
  "uDim",
  "uLevels",
] as const

const MORPH_MS = 1900
const MAX_PIXELS = 1_800_000
const SOLID =
  "a, button, input, textarea, select, label, dialog, p, h1, h2, h3, li, dt, dd, figure, img"
const INK: Rgb = [0.925, 0.906, 0.86]

type Rgb = [number, number, number]

function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.replace("#", ""), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

function seedOffset(seed: number): [number, number] {
  return [
    ((seed * 0.6180339887) % 1) * 400 - 200,
    ((seed * 0.7548776662) % 1) * 400 - 200,
  ]
}

const randomSeed = () => 1 + Math.floor(Math.random() * 9999)

function readSeed() {
  try {
    return Number(sessionStorage.getItem("surface-seed")) || randomSeed()
  } catch {
    return randomSeed()
  }
}

function writeSeed(seed: number) {
  try {
    sessionStorage.setItem("surface-seed", String(seed))
  } catch {
    return
  }
}

function program(gl: WebGL2RenderingContext) {
  const prog = gl.createProgram()
  for (const [type, src] of [
    [gl.VERTEX_SHADER, VERT],
    [gl.FRAGMENT_SHADER, FRAG],
  ] as const) {
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, src)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(shader))
      return null
    }
    gl.attachShader(prog, shader)
  }
  gl.bindAttribLocation(prog, 0, "a")
  gl.linkProgram(prog)
  return gl.getProgramParameter(prog, gl.LINK_STATUS) ? prog : null
}

const pad = (seed: number) => String(seed).padStart(4, "0")
const signed = (n: number) => (n < 0 ? "−" : "+") + Math.abs(n).toFixed(3)
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

export function mountSurface(root: HTMLElement) {
  const canvas = root.querySelector("canvas")
  if (!canvas) return
  const band = root.dataset.surface === "band"
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
  })
  if (!gl) return
  const prog = program(gl)
  if (!prog) return

  gl.useProgram(prog)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW
  )
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  const u = Object.fromEntries(
    UNIFORMS.map((name) => [name, gl.getUniformLocation(prog, name)])
  ) as Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>

  const still = matchMedia("(prefers-reduced-motion: reduce)").matches
  const scale = band ? 1.35 : 1.7
  const levels = band ? 12 : 15
  const speed = band ? 0.32 : 1

  let seed = readSeed()
  writeSeed(seed)
  let seedA = seedOffset(seed)
  let seedB = seedA
  let morphAt = -1
  let front = -1
  let fade = 0
  let reach = 1
  let origin: [number, number] = [0, 0]
  const trail = new Float32Array(TRAIL * 4)
  let head = 1
  let lastPush = 0
  let time = (seed % 97) * 3.7
  let tint: Rgb =
    band && root.dataset.accent ? hexToRgb(root.dataset.accent) : [...INK]
  let tintTo: Rgb = [...tint]
  let amt = band ? 0.85 : 0
  let amtTo = amt
  let agit = 0
  let lastY = scrollY
  let scroll = 0
  let dim = 0
  let quality = 1
  let frames = 0
  let slow = 0
  let visible = true
  let raf = 0
  let last = 0

  const seedOut = document.querySelectorAll<HTMLElement>("[data-readout=seed]")
  const xyOut = document.querySelectorAll<HTMLElement>("[data-readout=xy]")
  const showSeed = () => seedOut.forEach((el) => (el.textContent = pad(seed)))
  showSeed()

  const rect = () => canvas.getBoundingClientRect()
  const toField = (x: number, y: number): [number, number] => {
    const r = rect()
    const m = Math.min(r.width, r.height) || 1
    return [
      ((x - r.left - r.width / 2) / m) * scale,
      ((r.top + r.height / 2 - y) / m) * scale,
    ]
  }

  const resize = () => {
    const r = rect()
    const ratio =
      Math.min(
        devicePixelRatio || 1,
        1.5,
        Math.sqrt(MAX_PIXELS / Math.max(1, r.width * r.height))
      ) * quality
    canvas.width = Math.max(1, Math.round(r.width * ratio))
    canvas.height = Math.max(1, Math.round(r.height * ratio))
    gl.viewport(0, 0, canvas.width, canvas.height)
    if (still) draw()
  }

  const draw = () => {
    gl.uniform2f(u.uRes, canvas.width, canvas.height)
    gl.uniform1f(u.uScale, scale)
    gl.uniform1f(u.uTime, time)
    gl.uniform2f(u.uSeedA, seedA[0], seedA[1])
    gl.uniform2f(u.uSeedB, seedB[0], seedB[1])
    gl.uniform1f(u.uFront, front)
    gl.uniform1f(u.uFade, fade)
    gl.uniform2f(u.uOrigin, origin[0], origin[1])
    gl.uniform4fv(u.uTrail, trail)
    gl.uniform1f(u.uScroll, scroll)
    gl.uniform1f(u.uAgit, agit)
    gl.uniform3f(u.uTint, tint[0], tint[1], tint[2])
    gl.uniform1f(u.uTintAmt, amt)
    gl.uniform1f(u.uDim, dim)
    gl.uniform1f(u.uLevels, levels)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    if (!("ready" in root.dataset)) root.dataset.ready = ""
  }

  const step = (dt: number, now: number) => {
    const ease = (rate: number) => 1 - Math.exp(-dt * rate)
    if (!band) {
      const y = scrollY
      const v = Math.min(Math.abs(y - lastY) / dt / 2600, 1)
      lastY = y
      agit += (v - agit) * ease(v > agit ? 6 : 1.4)
      const r = rect()
      scroll = (y / (Math.min(r.width, r.height) || 1)) * scale * 0.35
      dim = Math.min(y / innerHeight, 1) * 0.45
    }
    time += dt * speed * (1 + agit * 5)
    amt += (amtTo - amt) * ease(3.5)
    for (let i = 0; i < 3; i++) tint[i] += (tintTo[i] - tint[i]) * ease(5)
    for (let i = 0; i < TRAIL; i++)
      trail[i * 4 + 2] *= Math.exp(-dt * (i ? 1.5 : 2.2))
    if (morphAt >= 0) {
      const t = (now - morphAt) / MORPH_MS
      if (t >= 1) {
        seedA = seedB
        morphAt = -1
        front = -1
      } else {
        front = easeOut(t) * reach
        fade = 1 - t
      }
    }
    frames++
    if (quality === 1 && frames > 30 && frames <= 150) {
      slow += dt > 0.026 ? 1 : 0
      if (frames === 150 && slow > 60) {
        quality = 0.7
        resize()
      }
    }
  }

  const tick = (now: number) => {
    raf = 0
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60
    last = now
    step(dt, now)
    draw()
    if (visible) raf = requestAnimationFrame(tick)
  }

  const start = () => {
    if (still || raf || !visible) return
    last = 0
    raf = requestAnimationFrame(tick)
  }

  const stop = () => {
    cancelAnimationFrame(raf)
    raf = 0
  }

  const reseed = (x: number, y: number) => {
    if (morphAt >= 0) seedA = seedB
    seed = 1 + ((seed + Math.floor(Math.random() * 9990)) % 9999)
    seedB = seedOffset(seed)
    writeSeed(seed)
    showSeed()
    if (still) {
      seedA = seedB
      draw()
      return
    }
    origin = toField(x, y)
    const r = rect()
    const m = Math.min(r.width, r.height) || 1
    reach =
      Math.hypot(
        (r.width / 2 / m) * scale + Math.abs(origin[0]),
        (r.height / 2 / m) * scale + Math.abs(origin[1])
      ) + 0.5
    morphAt = performance.now()
    front = 0
    fade = 1
  }

  new ResizeObserver(resize).observe(canvas)
  resize()

  canvas.addEventListener("webglcontextlost", () => {
    stop()
    delete root.dataset.ready
  })

  addEventListener(
    "pointermove",
    (e) => {
      const [x, y] = toField(e.clientX, e.clientY)
      const label = `x ${signed(x)}  y ${signed(y)}`
      xyOut.forEach((el) => (el.textContent = label))
      if (still) return
      const dx = x - trail[0]
      const dy = y - trail[1]
      const moved = Math.min(Math.hypot(dx, dy) * 3, 0.35)
      trail[0] = x
      trail[1] = y
      trail[2] = Math.min(trail[2] + moved, band ? 0.5 : 0.8)
      const now = performance.now()
      if (now - lastPush > 50 && moved > 0.01) {
        lastPush = now
        trail[head * 4] = x
        trail[head * 4 + 1] = y
        trail[head * 4 + 2] = Math.min(moved * 2.4, band ? 0.35 : 0.55)
        head = (head % (TRAIL - 1)) + 1
      }
    },
    { passive: true }
  )

  addEventListener("click", (e) => {
    const target = e.target as Element | null
    if (!target || e.button !== 0) return
    if (target.closest("[data-reseed]")) {
      const r = rect()
      reseed(r.left + r.width / 2, r.top + Math.min(r.height, innerHeight) / 2)
      return
    }
    if (target.closest(SOLID)) return
    if (band && !root.parentElement?.contains(target)) return
    if (getSelection()?.toString()) return
    reseed(e.clientX, e.clientY)
  })

  if (!band) {
    addEventListener("surface:tint", (e) => {
      const hex = (e as CustomEvent<string | null>).detail
      if (hex) {
        tintTo = hexToRgb(hex)
        if (amt < 0.03) tint = [...tintTo]
        amtTo = 1
      } else amtTo = 0
      if (still) {
        tint = [...tintTo]
        amt = amtTo
        draw()
      }
    })
  }

  draw()
  if (still) return

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    if (visible) start()
    else stop()
  }).observe(canvas)
  start()
}
