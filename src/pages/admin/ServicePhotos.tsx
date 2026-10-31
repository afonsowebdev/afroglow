import { useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { serviceImageUrl } from '@/lib/service-images'

const MAX_SIDE = 1600
const PHOTOS_PER_PACKAGE = 5

/** Shrinks a phone photo (often 4-8 MB) to a ~300 KB JPEG before it is uploaded. */
export async function shrink(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
  return dataUrl.slice(dataUrl.indexOf(',') + 1)
}

/** A small frosted label over a photo, light in both themes so it reads on any picture. */
const ON_PHOTO = 'bg-white/85 text-[#1a1008] shadow-[0_1px_4px_rgba(0,0,0,0.18)] backdrop-blur-md'

/**
 * Photo manager inside the service editor: add, choose the cover, remove. The photos as rounded tiles with the cards'
 * shadow, a frosted "Capa" on the first and "Pôr capa" / remove on the others, and a white tile to add more.
 */
export function ServicePhotos({
  serviceId,
  images,
  onChanged,
}: {
  serviceId: string
  images: Array<{ id: string }>
  onChanged: () => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run(label: string, action: () => Promise<void>) {
    setBusy(label)
    setError(null)
    try {
      await action()
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível concluir. Tenta novamente.')
    } finally {
      setBusy(null)
    }
  }

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    await run('A enviar fotos…', async () => {
      for (const file of Array.from(files).slice(0, Math.max(0, PHOTOS_PER_PACKAGE - images.length))) {
        const data = await shrink(file)
        await api.post(`/admin/services/${serviceId}/images`, { contentType: 'image/jpeg', data })
      }
    })
    if (input.current) input.current.value = ''
  }

  const free = PHOTOS_PER_PACKAGE - images.length

  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="font-subtitle text-[12px] font-semibold text-muted-dark">
          Fotos <span className="font-normal">· a primeira é a capa</span>
        </span>
        <span className="glass-chip rounded-full px-2.5 py-0.5 font-subtitle text-[11px] font-semibold tabular-nums text-onyx">
          {images.length}/{PHOTOS_PER_PACKAGE}
        </span>
      </div>
      {/* One row that scrolls sideways, so the sheet stays short. */}
      <div className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-2 pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {images.map((image, index) => (
          <div
            key={image.id}
            className="relative size-[5.75rem] shrink-0 overflow-hidden rounded-[18px] bg-onyx/[0.05]"
            style={{ boxShadow: 'var(--card-shadow)' }}
          >
            <img src={serviceImageUrl(serviceId, image.id)} alt="" className="h-full w-full object-cover" />
            {index === 0 ? (
              <span className={`absolute bottom-1.5 left-1.5 rounded-full px-2 py-0.5 font-subtitle text-[10px] font-semibold ${ON_PHOTO}`}>
                Capa
              </span>
            ) : (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => run('A atualizar…', () => api.post(`/admin/services/${serviceId}/images/${image.id}/cover`))}
                className={`absolute bottom-1.5 left-1.5 rounded-full px-2 py-0.5 font-subtitle text-[10px] font-medium ${ON_PHOTO}`}
              >
                Pôr capa
              </button>
            )}
            <button
              type="button"
              aria-label="Remover foto"
              disabled={busy !== null}
              onClick={() => run('A remover…', () => api.delete(`/admin/services/${serviceId}/images/${image.id}`))}
              className={`absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full ${ON_PHOTO}`}
            >
              <X size={13} strokeWidth={2.4} />
            </button>
          </div>
        ))}
        {free > 0 && (
          <button
            key="add"
            type="button"
            disabled={busy !== null}
            onClick={() => input.current?.click()}
            className="flex size-[5.75rem] shrink-0 flex-col items-center justify-center gap-1.5 rounded-[18px] bg-card text-onyx transition-transform active:scale-[0.97] disabled:opacity-50"
            style={{ boxShadow: 'var(--card-shadow)' }}
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-onyx/[0.05]">
              <ImagePlus size={17} />
            </span>
            <span className="font-subtitle text-[11px] font-medium">Juntar</span>
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void addFiles(e.target.files)} />
      {busy && (
        <p className="mt-1.5 flex items-center gap-1.5 px-1 font-subtitle text-xs text-muted-dark">
          <Loader2 size={13} className="animate-spin" />
          {busy}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-2 rounded-2xl px-4 py-2.5 font-subtitle text-[13px] text-onyx"
          style={{ background: 'color-mix(in srgb, var(--c-cancelled) 12%, transparent)' }}
        >
          {error}
        </p>
      )}
      {free === 0 && <p className="mt-1.5 px-1 font-subtitle text-xs text-muted-dark">Pacote completo. Remove uma foto para trocar.</p>}
    </div>
  )
}
