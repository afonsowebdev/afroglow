import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { CalendarHeart, Heart, Scissors, Sparkles, type LucideIcon } from 'lucide-react'

/** What sits behind the admin's screens: the AFROGLOW pattern, nothing (the plain page), a colour, or a photo. */
export type Wallpaper =
  | { kind: 'pattern' }
  | { kind: 'none' }
  | { kind: 'color'; value: string }
  | { kind: 'image'; src: string }

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

const KEY = 'afroglow-admin-appearance-v2'
const DEFAULT: Appearance = { wallpaper: { kind: 'pattern' }, blur: 10, glass: 'media' }

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

/** How see-through the cards are: their opacity over the background, in the light and in the dark theme. */
export const GLASS: Record<Appearance['glass'], { light: number; dark: number }> = {
  pouca: { light: 0.55, dark: 0.1 },
  media: { light: 0.3, dark: 0.06 },
  muita: { light: 0.14, dark: 0.03 },
}

/** One tile of the AFROGLOW pattern: the "A", the wordmark and a few of the salon's signs, faint and turned a little. */
const MARKS: Array<{ x: number; y: number; r: number } & ({ text: 'A' | 'AFROGLOW' } | { Icon: LucideIcon })> = [
  { x: 22, y: 26, r: -12, text: 'A' },
  { x: 128, y: 34, r: 18, Icon: Scissors },
  { x: 74, y: 98, r: -6, text: 'AFROGLOW' },
  { x: 24, y: 150, r: 10, Icon: Sparkles },
  { x: 150, y: 150, r: -14, Icon: CalendarHeart },
  { x: 108, y: 186, r: 8, Icon: Heart },
]
const TILE = 200

function PatternLayer() {
  const cols = 8
  const rows = 12
  return (
    <div className="absolute inset-0 bg-[var(--ios-pattern-bg)]">
      {/* Two soft warm lights, so the glass over it has something to catch. */}
      <div className="absolute -left-1/4 -top-1/4 size-[80vmax] rounded-full bg-[radial-gradient(circle,var(--ios-pattern-glow-1),transparent_60%)]" />
      <div className="absolute -bottom-1/3 -right-1/4 size-[80vmax] rounded-full bg-[radial-gradient(circle,var(--ios-pattern-glow-2),transparent_60%)]" />
      <div className="absolute left-0 top-0 text-[var(--ios-pattern-ink)]" style={{ width: cols * TILE, height: rows * TILE }}>
        {Array.from({ length: rows }, (_, row) =>
          Array.from({ length: cols }, (_, col) =>
            MARKS.map((m, i) => {
              // Every other row shifted by half a tile, so the marks don't line up in columns.
              const left = col * TILE + m.x - (row % 2 ? TILE / 2 : 0)
              const top = row * TILE + m.y
              const style = { left, top, transform: `rotate(${m.r}deg)` }
              return 'text' in m ? (
                <span
                  key={`${row}-${col}-${i}`}
                  className={`absolute font-logo leading-none logo-weight ${m.text === 'A' ? 'text-[44px]' : 'text-[13px] tracking-[0.18em]'}`}
                  style={style}
                >
                  {m.text}
                </span>
              ) : (
                <m.Icon key={`${row}-${col}-${i}`} className="absolute size-6" strokeWidth={1.6} style={style} />
              )
            }),
          ),
        )}
      </div>
    </div>
  )
}

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
  if (wallpaper.kind === 'pattern') {
    return (
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <PatternLayer />
      </div>
    )
  }
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
/** A small preview of the pattern, for the choices in "Fundo e aparência". */
export function PatternPreview() {
  return (
    <span className="relative block size-full overflow-hidden">
      <span className="absolute left-0 top-0 origin-top-left scale-[0.35]">
        <span className="relative block" style={{ width: 2 * TILE, height: 3 * TILE }}>
          <PatternLayer />
        </span>
      </span>
    </span>
  )
}

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
