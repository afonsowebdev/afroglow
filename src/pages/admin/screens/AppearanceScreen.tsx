import { useEffect, useRef, useState } from 'react'
import { Camera, Check } from 'lucide-react'
import { api, assetUrl } from '@/lib/api'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { useAdmin } from '../admin-context'
import { Cell, Screen, Section, Segmented, Toggle, useToast } from '../ios'
import { COLORS, PatternPreview, PHOTOS, photoToWallpaper, useAppearance, type Wallpaper } from '../wallpaper'

function same(a: Wallpaper, b: Wallpaper) {
  if (a.kind !== b.kind) return false
  if (a.kind === 'color' && b.kind === 'color') return a.value === b.value
  if (a.kind === 'image' && b.kind === 'image') return a.src === b.src
  return true
}

/** One choice in the grid: its picture, a tick when chosen, its name under it. */
function Choice({
  label,
  chosen,
  onClick,
  children,
}: {
  label: string
  chosen: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1.5" aria-pressed={chosen} aria-label={label}>
      <span
        className={cn(
          'relative block aspect-[9/16] w-full overflow-hidden rounded-xl ring-1 ring-[var(--ios-separator)]',
          chosen && 'ring-2 ring-[var(--ios-tint)] ring-offset-2 ring-offset-[var(--ios-bg)]',
        )}
      >
        {children}
        {chosen && (
          <span className="absolute bottom-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-[var(--ios-tint)] text-[var(--ios-on-tint)]">
            <Check className="size-3" strokeWidth={3} />
          </span>
        )}
      </span>
      <span className="text-xs text-[var(--ios-secondary)]">{label}</span>
    </button>
  )
}

/** The admin's background (nothing, a colour, a brand photo, a portfolio photo or one from the phone) and how it looks. */
export function AppearanceScreen({ backLabel }: { backLabel: string }) {
  const { pop } = useAdmin()
  const toast = useToast()
  const theme = useTheme()
  const { appearance, update } = useAppearance()
  const [portfolio, setPortfolio] = useState<string[]>([])
  const fileInput = useRef<HTMLInputElement>(null)
  const current = appearance.wallpaper

  useEffect(() => {
    api
      .get<Array<{ id: string; kind: 'IMAGE' | 'VIDEO' }>>('/portfolio')
      .then((items) => setPortfolio(items.filter((i) => i.kind === 'IMAGE').slice(0, 9).map((i) => assetUrl(`/portfolio/${i.id}/file`))))
      .catch(() => {})
  }, [])

  async function choosePhoto(file: File | undefined) {
    if (!file) return
    try {
      update({ wallpaper: { kind: 'image', src: await photoToWallpaper(file) } })
      toast('Fundo atualizado')
    } catch {
      toast('Não foi possível usar esta foto.', true)
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const own = current.kind === 'image' && current.src.startsWith('data:') ? current.src : null

  return (
    <Screen title="Aparência" back={{ label: backLabel, onClick: pop }}>
      <Section flush header="Fundo" footer="Fica guardado neste iPhone.">
        <div className="grid grid-cols-4 gap-3">
          <Choice label="AFROGLOW" chosen={current.kind === 'pattern'} onClick={() => update({ wallpaper: { kind: 'pattern' } })}>
            <PatternPreview />
          </Choice>
          <Choice label="Liso" chosen={current.kind === 'none'} onClick={() => update({ wallpaper: { kind: 'none' } })}>
            <span className="block size-full bg-[var(--ios-bg)]" />
          </Choice>
          {COLORS.map((c) => (
            <Choice
              key={c.value}
              label={c.name}
              chosen={same(current, { kind: 'color', value: c.value })}
              onClick={() => update({ wallpaper: { kind: 'color', value: c.value } })}
            >
              <span className="block size-full" style={{ background: c.value }} />
            </Choice>
          ))}
          <Choice label="A tua foto" chosen={Boolean(own)} onClick={() => fileInput.current?.click()}>
            {own ? (
              <span className="block size-full bg-cover bg-center" style={{ backgroundImage: `url("${own}")` }} />
            ) : (
              <span className="flex size-full items-center justify-center bg-[var(--ios-cell)] text-[var(--ios-secondary)]">
                <Camera className="size-6" strokeWidth={1.8} />
              </span>
            )}
          </Choice>
          {PHOTOS.map((src, i) => (
            <Choice key={src} label={`Foto ${i + 1}`} chosen={same(current, { kind: 'image', src })} onClick={() => update({ wallpaper: { kind: 'image', src } })}>
              <span className="block size-full bg-cover bg-center" style={{ backgroundImage: `url("${src}")` }} />
            </Choice>
          ))}
        </div>
        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => void choosePhoto(e.target.files?.[0])} />
      </Section>

      {portfolio.length > 0 && (
        <Section flush header="Do portfólio">
          <div className="grid grid-cols-4 gap-3">
            {portfolio.map((src) => (
              <Choice key={src} label="Portfólio" chosen={same(current, { kind: 'image', src })} onClick={() => update({ wallpaper: { kind: 'image', src } })}>
                <span className="block size-full bg-cover bg-center" style={{ backgroundImage: `url("${src}")` }} />
              </Choice>
            ))}
          </div>
        </Section>
      )}

      <Section flush header="Transparência dos cartões">
        <Segmented
          value={appearance.glass}
          onChange={(glass) => update({ glass })}
          options={[
            { value: 'pouca', label: 'Pouca' },
            { value: 'media', label: 'Média' },
            { value: 'muita', label: 'Muita' },
          ]}
        />
      </Section>

      {current.kind === 'image' && (
        <Section flush header="Desfocar o fundo">
          <Segmented
            value={String(appearance.blur) as '0' | '10' | '24'}
            onChange={(v) => update({ blur: Number(v) as 0 | 10 | 24 })}
            options={[
              { value: '0', label: 'Nada' },
              { value: '10', label: 'Pouco' },
              { value: '24', label: 'Muito' },
            ]}
          />
        </Section>
      )}

      <Section>
        <Cell
          title="Modo escuro"
          subtitle="O fundo fica coberto com o castanho do tema"
          multiline
          accessory={<Toggle checked={theme.theme === 'dark'} onChange={() => theme.toggleTheme()} label="Modo escuro" />}
        />
      </Section>
    </Screen>
  )
}
