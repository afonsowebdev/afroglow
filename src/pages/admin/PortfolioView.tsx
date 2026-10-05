import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError, assetUrl, uploadFile } from '@/lib/api'

interface Item {
  id: string
  kind: 'IMAGE' | 'VIDEO'
}

const MAX_SIDE = 1800
const MAX_VIDEO_MB = 40

/** Shrinks a phone photo to a ~400 KB JPEG before it is uploaded. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('shrink failed'))), 'image/jpeg', 0.84),
  )
}

const fileUrl = (id: string) => assetUrl(`/portfolio/${id}/file`)

/** The studio's portfolio shown in the customer app: any number of photos and short videos. */
export function PortfolioView() {
  const input = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<Item[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    try {
      setItems(await api.get<Item[]>('/portfolio'))
    } catch {
      setItems([])
      setMessage({ ok: false, text: 'Não foi possível carregar o portfólio.' })
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const list = Array.from(files)
    let done = 0
    const problems: string[] = []
    for (const file of list) {
      setBusy(`A enviar ${done + 1} de ${list.length}...`)
      try {
        if (file.type.startsWith('video/')) {
          if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
            problems.push(`"${file.name}" tem mais de ${MAX_VIDEO_MB} MB.`)
            continue
          }
          await uploadFile('/admin/portfolio', file, file.type === 'video/quicktime' ? 'video/quicktime' : 'video/mp4')
        } else {
          await uploadFile('/admin/portfolio', await shrink(file), 'image/jpeg')
        }
        done += 1
      } catch (err) {
        problems.push(err instanceof ApiError ? err.message : `Falhou o envio de "${file.name}".`)
      }
    }
    setBusy(null)
    if (input.current) input.current.value = ''
    setMessage(
      problems.length
        ? { ok: done > 0, text: `${done} enviados. ${problems.join(' ')}` }
        : { ok: true, text: `${done} ${done === 1 ? 'item adicionado' : 'itens adicionados'}.` },
    )
    await load()
  }

  async function act(id: string, action: () => Promise<unknown>) {
    setBusy('A atualizar...')
    try {
      await action()
      await load()
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : 'Não foi possível concluir.' })
    } finally {
      setBusy(null)
    }
    void id
  }

  const photos = items?.filter((i) => i.kind === 'IMAGE').length ?? 0
  const videos = items?.filter((i) => i.kind === 'VIDEO').length ?? 0

  return (
    <section className="mt-6">
      <div className="rounded-2xl border border-gold/20 bg-white p-5">
        <p className="font-subtitle text-sm text-onyx">
          As fotos e os vídeos que adicionares aparecem no <strong>portfólio da app dos clientes</strong>, pela ordem em
          que estão aqui. Podes juntar quantos quiseres (até 60 fotos e 12 vídeos).
        </p>
        <p className="mt-2 font-subtitle text-xs text-muted-dark">
          Vídeos: MP4 ou MOV até {MAX_VIDEO_MB} MB (cerca de 30 segundos). Para vídeos maiores, corta-os antes na
          galeria do iPhone. {photos} fotos · {videos} vídeos.
        </p>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => input.current?.click()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gold-deep py-3 font-subtitle text-sm text-[#ffffff] disabled:opacity-50"
        >
          <i className="bx bx-plus text-lg" aria-hidden="true" />
          {busy ?? 'Adicionar fotos e vídeos'}
        </button>
        <input
          ref={input}
          type="file"
          accept="image/*,video/mp4,video/quicktime"
          multiple
          className="hidden"
          onChange={(e) => void addFiles(e.target.files)}
        />
        {message && (
          <p className={`mt-3 font-subtitle text-sm ${message.ok ? 'text-gold-deep' : 'text-red-700'}`}>
            {message.text}
          </p>
        )}
      </div>

      {items === null && <p className="mt-6 font-subtitle text-muted-dark">A carregar...</p>}
      {items && items.length === 0 && (
        <p className="mt-8 text-center font-subtitle text-sm text-muted-dark">
          Ainda sem itens. Enquanto estiver vazio, a app mostra 5 fotos de exemplo.
        </p>
      )}

      <div className="mt-5 grid grid-cols-3 gap-2">
        {items?.map((item, index) => (
          <div
            key={item.id}
            className="relative aspect-[3/4] overflow-hidden rounded-xl border border-gold/30 bg-black/5"
          >
            {item.kind === 'IMAGE' ? (
              <img src={fileUrl(item.id)} alt="" loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <video
                src={`${fileUrl(item.id)}#t=0.1`}
                muted
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
              />
            )}
            {item.kind === 'VIDEO' && (
              <span className="absolute bottom-1 left-1 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 font-subtitle text-[10px] text-[#ffffff]">
                <i className="bx bx-play" aria-hidden="true" /> Vídeo
              </span>
            )}
            {index !== 0 && (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void act(item.id, () => api.post(`/admin/portfolio/${item.id}/first`))}
                className="absolute left-1 top-1 rounded-full bg-black/60 px-2 py-0.5 font-subtitle text-[10px] text-[#ffffff]"
              >
                Pôr em 1.º
              </button>
            )}
            <button
              type="button"
              aria-label="Remover"
              disabled={busy !== null}
              onClick={() => void act(item.id, () => api.delete(`/admin/portfolio/${item.id}`))}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-[#ffffff]"
            >
              <i className="bx bx-x text-lg" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
