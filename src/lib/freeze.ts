export const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches

export function freeze(img: HTMLImageElement) {
  const src = img.src
  const draw = () => {
    if (img.src !== src) return
    const canvas = document.createElement("canvas")
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    canvas.getContext("2d")?.drawImage(img, 0, 0)
    canvas.toBlob((blob) => {
      if (blob && img.src === src) img.src = URL.createObjectURL(blob)
    })
  }
  if (img.complete && img.naturalWidth) draw()
  else img.addEventListener("load", draw, { once: true })
}
