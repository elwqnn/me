import { useState } from "react"
import Lightbox from "yet-another-react-lightbox"
import "yet-another-react-lightbox/styles.css"

interface Props {
  images: string[]
  title: string
}

const lightboxProps = {
  styles: {
    root: { backgroundColor: "rgba(0, 0, 0, 0.6)" },
  },
  carousel: { padding: "10%" },
  controller: { closeOnBackdropClick: true },
} as const

export function ImageHero({ images, title }: Props) {
  const [open, setOpen] = useState(false)

  if (images.length === 0) return null

  const slides = images.map((src) => ({ src }))

  return (
    <>
      <div
        className="cursor-pointer overflow-hidden rounded-lg"
        onClick={() => setOpen(true)}
        onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
        tabIndex={0}
        role="button"
        aria-label="View image fullscreen"
      >
        <img
          src={images[0]}
          alt={`${title} screenshot`}
          className="w-full transition-transform duration-300 hover:scale-[1.01]"
        />
      </div>

      <Lightbox
        open={open}
        close={() => setOpen(false)}
        index={0}
        slides={slides}
        {...lightboxProps}
      />
    </>
  )
}

export function ImageGrid({ images, title }: Props) {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)

  if (images.length <= 1) return null

  const slides = images.map((src) => ({ src }))

  function openAt(i: number) {
    setIndex(i)
    setOpen(true)
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {images.slice(1).map((src, i) => (
          <div
            key={src}
            className="cursor-pointer overflow-hidden rounded-lg"
            onClick={() => openAt(i + 1)}
            onKeyDown={(e) => e.key === "Enter" && openAt(i + 1)}
            tabIndex={0}
            role="button"
            aria-label={`View screenshot ${i + 2} fullscreen`}
          >
            <img
              src={src}
              alt={`${title} screenshot ${i + 2}`}
              className="w-full transition-transform duration-300 hover:scale-[1.01]"
            />
          </div>
        ))}
      </div>

      <Lightbox
        open={open}
        close={() => setOpen(false)}
        index={index}
        slides={slides}
        {...lightboxProps}
      />
    </>
  )
}
