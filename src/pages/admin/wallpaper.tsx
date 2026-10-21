import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

/** What sits behind the admin's screens: nothing (the plain page), a colour, or a photo. */
export type Wallpaper = { kind: 'none' } | { kind: 'color'; value: string } | { kind: 'image'; src: string }

export interface Appearance {
  wallpaper: Wallpaper
  /** How much the photo is blurred, in px. */
  blur: 0 | 10 | 24
  /** How see-through the cards are over it. */
  glass: 'pouca' | 'media' | 'muita'
}

export const COLORS: Array<{ name: string; value: string }> = [
  { name: 'Areia', value: '#ece3d3' },
  { name: 'Pedra', value: '#d8d6d1' },
  { name: 'Cacau', value: '#4a2c17' },
  { name: 'Noite', value: '#1c1c1e' },
]

export const PHOTOS = ['/images/hero/hero-1.jpg', '/images/hero/hero-3.jpg', '/images/hero/hero-4.jpg', '/images/hero/hero-5.jpg', '/images/hero-app-poster-light.jpg']

const KEY = 'afroglow-admin-appearance'
const DEFAULT: Appearance = { wallpaper: { kind: 'none' }, blur: 10, glass: 'media' }

function load(): Appearance {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...DEFAULT, ...(JSON.parse(raw) as Partial<Appearance>) }
  } catch {
    // not remembered: the plain page
  }
  return DEFAULT
}

const AppearanceContext = createContext<{ appearance: Appearance; update: (patch: Partial<Appearance>) => void }>({
  appearance: DEFAULT,
  update: () => {},
})

/** The admin's background and card transparency, kept on this iPhone. */
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearance] = useState<Appearance>(load)
  const update = useCallback((patch: Partial<Appearance>) => {
    setAppearance((current) => {
      const next = { ...current, ...patch }
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        // a photo too big to keep: it still shows until the app closes
      }
      return next
    })
  }, [])
  return <AppearanceContext.Provider value={{ appearance, update }}>{children}</AppearanceContext.Provider>
}

export function useAppearance() {
  return useContext(AppearanceContext)
}

/** How see-through the cards are (their opacity over the background). */
export const GLASS_ALPHA: Record<Appearance['glass'], number> = { pouca: 0.82, media: 0.6, muita: 0.38 }

/**
 * The background itself, fixed behind everything: the colour or the photo (cover, blurred to taste), with a veil in
 * the theme's colour so the text on it stays readable.
 */
export function WallpaperLayer() {
  const { appearance } = useAppearance()
  const { wallpaper, blur } = appearance
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (wallpaper.kind !== 'image') return
    setLoaded(false)
    const img = new Image()
    img.onload = () => setLoaded(true)
    img.src = wallpaper.src
  }, [wallpaper])

  if (wallpaper.kind === 'none') return null
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {wallpaper.kind === 'color' ? (
        <div className="absolute inset-0" style={{ background: wallpaper.value }} />
      ) : (
        <div
          className="absolute -inset-12 bg-cover bg-center transition-opacity duration-500"
          style={{ backgroundImage: `url("${wallpaper.src}")`, filter: blur ? `blur(${blur}px)` : undefined, opacity: loaded ? 1 : 0 }}
        />
      )}
      <div className="absolute inset-0 bg-[var(--ios-wallpaper-veil)]" />
    </div>
  )
}

/** Shrinks a photo from the phone to a background (about 1200 px, JPEG), as a data URL kept on this iPhone. */
export async function photoToWallpaper(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.78)
}
