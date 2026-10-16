import { useEffect, useState, type RefObject } from 'react'

export type BackdropTone = 'light' | 'dark'

/** Relative luminance (0 dark … 1 bright) of an sRGB colour. */
function luminance(r: number, g: number, b: number) {
  const lin = (c: number) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

let sampler: CanvasRenderingContext2D | null = null
const UNREADABLE_PHOTO = 0.12

/** The brightness of a photo or video at a point on screen (object-fit: cover), or null when it can't be read. */
function mediaLuminance(media: HTMLImageElement | HTMLVideoElement, x: number, y: number) {
  const nw = media instanceof HTMLImageElement ? media.naturalWidth : media.videoWidth
  const nh = media instanceof HTMLImageElement ? media.naturalHeight : media.videoHeight
  if (!nw || !nh) return null
  const r = media.getBoundingClientRect()
  const fit = getComputedStyle(media).objectFit
  const scale = fit === 'contain' ? Math.min(r.width / nw, r.height / nh) : Math.max(r.width / nw, r.height / nh)
  const sx = (x - r.left - (r.width - nw * scale) / 2) / scale
  const sy = (y - r.top - (r.height - nh * scale) / 2) / scale
  if (sx < 0 || sy < 0 || sx >= nw || sy >= nh) return null
  try {
    sampler ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true })
    if (!sampler) return null
    sampler.canvas.width = 1
    sampler.canvas.height = 1
    // A small patch around the point, averaged into one pixel.
    const patch = 12 / scale
    sampler.drawImage(media, Math.max(0, sx - patch / 2), Math.max(0, sy - patch / 2), patch, patch, 0, 0, 1, 1)
    const [red, green, blue] = sampler.getImageData(0, 0, 1, 1).data
    return luminance(red, green, blue)
  } catch {
    // A picture from another site (the server's photos) can't be read: taken as a photo, so as dark, where white
    // letters with their soft shadow read well on nearly any picture.
    return UNREADABLE_PHOTO
  }
}

/** The brightness of an element's own background colour, or null when it is (nearly) see-through. */
function ownBackground(el: Element) {
  const match = getComputedStyle(el).backgroundColor.match(/[\d.]+/g)
  if (!match) return null
  const [r, g, b, a = '1'] = match
  return +a >= 0.5 ? luminance(+r, +g, +b) : null
}

/**
 * The brightness of what is on screen at a point, under `own` (skipped): the first thing actually visible down the
 * stack, a photo or video (read pixel by pixel) or a solid background; see-through layers are passed over.
 */
function luminanceAt(x: number, y: number, own: Element) {
  for (const el of document.elementsFromPoint(x, y)) {
    if (own.contains(el)) continue
    if (el instanceof HTMLImageElement || el instanceof HTMLVideoElement) {
      const value = mediaLuminance(el, x, y)
      if (value !== null) return value
      continue
    }
    const value = ownBackground(el)
    if (value !== null) return value
  }
  return null
}

/**
 * Whether what lies behind an element (a see-through button) is light or dark, kept up to date as the page scrolls
 * or changes: photos and videos are read pixel by pixel, other things by their background colour. Letters on top
 * then go dark on light and white on dark.
 */
export function useBackdropTone(ref: RefObject<HTMLElement | null>, fallback: BackdropTone = 'light') {
  const [tone, setTone] = useState<BackdropTone>(fallback)

  useEffect(() => {
    let frame = 0
    const measure = () => {
      frame = 0
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      if (!r.width) return
      const y = r.top + r.height / 2
      const values = [0.2, 0.5, 0.8]
        .map((f) => luminanceAt(r.left + r.width * f, y, el))
        .filter((v): v is number => v !== null)
      if (!values.length) return
      const average = values.reduce((sum, v) => sum + v, 0) / values.length
      // A little hysteresis so it doesn't flicker on mid-tones.
      setTone((current) =>
        current === 'light' ? (average < 0.3 ? 'dark' : 'light') : average > 0.4 ? 'light' : 'dark',
      )
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    schedule()
    window.addEventListener('scroll', schedule, { capture: true, passive: true })
    window.addEventListener('resize', schedule)
    // Pictures load and screens change without scrolling too.
    const timer = window.setInterval(schedule, 400)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule, { capture: true })
      window.removeEventListener('resize', schedule)
      window.clearInterval(timer)
    }
  }, [ref])

  return tone
}
