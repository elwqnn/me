const pad = (n: number) => String(n).padStart(2, "0")

export function mountLightbox() {
  const dialog = document.querySelector<HTMLDialogElement>("[data-lightbox]")
  if (!dialog || dialog.dataset.ready !== undefined) return
  dialog.dataset.ready = ""

  const triggers = [...document.querySelectorAll<HTMLElement>("[data-zoom]")]
  const items = triggers.map((t) => ({
    src: t.dataset.zoom!,
    alt: t.querySelector("img")?.alt ?? "",
  }))
  const img = dialog.querySelector("img")!
  const count = dialog.querySelector("[data-count]")!
  const ac = new AbortController()
  const { signal } = ac
  let index = 0

  dialog.classList.toggle("single", items.length < 2)

  const show = (i: number) => {
    index = (i + items.length) % items.length
    img.removeAttribute("src")
    img.alt = items[index].alt
    img.src = items[index].src
    count.textContent = `${pad(index + 1)} / ${pad(items.length)}`
  }

  triggers.forEach((t, i) =>
    t.addEventListener(
      "click",
      () => {
        show(i)
        dialog.showModal()
      },
      { signal }
    )
  )

  const on = (sel: string, fn: () => void) =>
    dialog.querySelector(sel)?.addEventListener("click", fn, { signal })
  on("[data-prev]", () => show(index - 1))
  on("[data-next]", () => show(index + 1))
  on("[data-close]", () => dialog.close())

  dialog.addEventListener(
    "click",
    (e) => {
      if (e.target === dialog || (e.target as Element).matches("[data-frame]"))
        dialog.close()
    },
    { signal }
  )

  dialog.addEventListener(
    "keydown",
    (e) => {
      if (items.length < 2) return
      if (e.key === "ArrowLeft") show(index - 1)
      if (e.key === "ArrowRight") show(index + 1)
    },
    { signal }
  )

  return () => {
    ac.abort()
    if (dialog.open) dialog.close()
  }
}

export function freezeGifs() {
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) return
  document
    .querySelectorAll<HTMLImageElement>("img[data-gif]:not([data-frozen])")
    .forEach((img) => {
      img.dataset.frozen = ""
      const draw = () => {
        const canvas = document.createElement("canvas")
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        canvas.getContext("2d")?.drawImage(img, 0, 0)
        canvas.className = "still"
        canvas.setAttribute("role", "img")
        canvas.setAttribute("aria-label", img.alt)
        img.after(canvas)
      }
      if (img.complete && img.naturalWidth) draw()
      else img.addEventListener("load", draw, { once: true })
    })
}
