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
const WIDE = [0.2, 0.5, 0.8] as const
/** For small round buttons: five columns inside the circle, so a thin strip behind its middle doesn't decide. */
export const ROUND_SAMPLES = [0.15, 0.3, 0.5, 0.7, 0.85] as const
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
export function useBackdropTone(
  ref: RefObject<HTMLElement | null>,
  fallback: BackdropTone = 'light',
  enabled = true,
  /** Where across the element to look (0 left … 1 right): spread out for a wide bar, close to the middle for a
   *  small round button, so a point just past its edge can't sway it. */
  samples: readonly number[] = WIDE,
) {
  const [tone, setTone] = useState<BackdropTone>(fallback)

  useEffect(() => {
    if (!enabled) return
    let frame = 0
    const measure = () => {
      frame = 0
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      if (!r.width) return
      // A small grid of points across the element (three rows of `samples`); the median decides, so a thin strip
      // of something else (the gap between two cards, a line of text) can't sway it.
      const values = [0.3, 0.5, 0.7]
        .flatMap((fy) => samples.map((fx) => luminanceAt(r.left + r.width * fx, r.top + r.height * fy, el)))
        .filter((v): v is number => v !== null)
        .sort((a, b) => a - b)
      if (!values.length) return
      const middle = values.length >> 1
      const average = values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2
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
  }, [ref, enabled, samples])

  return tone
}
