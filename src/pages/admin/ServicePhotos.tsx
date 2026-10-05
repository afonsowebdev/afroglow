import { useRef, useState } from 'react'
import { api, ApiError } from '@/lib/api'
import { serviceImageUrl } from '@/lib/service-images'

const MAX_SIDE = 1600
const PHOTOS_PER_PACKAGE = 5

/** Shrinks a phone photo (often 4-8 MB) to a ~300 KB JPEG before it is uploaded. */
async function shrink(file: File): Promise<string> {
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

/** Photo manager inside the service editor: add, choose the cover, remove. */
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
    await run('A enviar fotos...', async () => {
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
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="font-subtitle text-xs uppercase tracking-wide text-muted-dark">
          Fotos <span className="normal-case tracking-normal text-muted-dark/70">· a primeira é a capa</span>
        </span>
        <span className="font-subtitle text-xs font-medium text-onyx">
          {images.length}/{PHOTOS_PER_PACKAGE}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {images.map((image, index) => (
          <div key={image.id} className="relative aspect-square overflow-hidden rounded-xl glass-chip">
            <img src={serviceImageUrl(serviceId, image.id)} alt="" className="h-full w-full object-cover" />
            {index === 0 ? (
              <span className="absolute left-1 top-1 rounded-full bg-gold-deep px-2 py-0.5 font-subtitle text-[10px] text-[#ffffff]">
                Capa
              </span>
            ) : (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() =>
                  run('A atualizar...', () => api.post(`/admin/services/${serviceId}/images/${image.id}/cover`))
                }
                className="absolute left-1 top-1 rounded-full bg-black/55 px-2 py-0.5 font-subtitle text-[10px] text-[#ffffff]"
              >
                Tornar capa
              </button>
            )}
            <button
              type="button"
              aria-label="Remover foto"
              disabled={busy !== null}
              onClick={() => run('A remover...', () => api.delete(`/admin/services/${serviceId}/images/${image.id}`))}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-[#ffffff]"
            >
              <i className="bx bx-x text-lg" aria-hidden="true" />
            </button>
          </div>
        ))}
        {Array.from({ length: free }, (_, i) => (
          <button
            key={`free-${i}`}
            type="button"
            disabled={busy !== null}
            onClick={() => input.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-onyx/25 text-muted-dark disabled:opacity-50"
          >
            <i className="bx bx-image-add text-2xl" aria-hidden="true" />
            <span className="font-subtitle text-[11px]">Foto {images.length + i + 1}</span>
          </button>
        ))}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void addFiles(e.target.files)}
      />
      {busy && <p className="mt-2 font-subtitle text-xs text-muted-dark">{busy}</p>}
      {error && <p className="mt-2 font-subtitle text-xs text-red-700">{error}</p>}
      {free === 0 && (
        <p className="mt-2 font-subtitle text-xs text-muted-dark">Pacote completo. Remove uma foto para trocar.</p>
      )}
    </div>
  )
}
