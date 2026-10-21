import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError, assetUrl } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Item {
  id: string
  kind: 'IMAGE' | 'VIDEO'
}

const MAX_SIDE = 1800

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

/** The file as base64 (sent inside JSON, which the iPhone app's network layer handles reliably). */
function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result)
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

const upload = async (blob: Blob, contentType: string) =>
  api.post('/admin/portfolio', { contentType, data: await toBase64(blob) })

const fileUrl = (id: string) => assetUrl(`/portfolio/${id}/file`)

// The site's gallery shows the first ones large (Gallery: FEATURED).
const FEATURED = 5

/**
 * The studio's portfolio (the site's gallery and the customer app): the photos numbered in their order, the first
 * five marked as shown large on the site. Tap a photo to see it, put it first or delete it; "Organizar" moves photos
 * by tapping one and then where it should go, and saves the whole order at once.
 */
export function PortfolioView() {
  const input = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<Item[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  // Organising: the order being built, and the photo picked to move.
  const [draft, setDraft] = useState<Item[] | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  // The photo open in the viewer, and whether delete was tapped once (asks to confirm).
  const [openId, setOpenId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

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
        await upload(await shrink(file), 'image/jpeg')
        done += 1
      } catch (err) {
        problems.push(err instanceof ApiError ? err.message : `Falhou o envio de "${file.name}".`)
      }
    }
    setBusy(null)
    if (input.current) input.current.value = ''
    setMessage(
      problems.length
        ? { ok: done > 0, text: `${done} enviadas. ${problems.join(' ')}` }
        : { ok: true, text: `${done} ${done === 1 ? 'foto adicionada' : 'fotos adicionadas'} no fim.` },
    )
    await load()
  }

  async function act(action: () => Promise<unknown>, done: string) {
    setBusy('A atualizar...')
    try {
      await action()
      await load()
      setMessage({ ok: true, text: done })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : 'Não foi possível concluir.' })
    } finally {
      setBusy(null)
    }
  }

  function closeViewer() {
    setOpenId(null)
    setConfirmDelete(false)
  }

  // Organising: tap a photo, then tap where it should go.
  function tapInDraft(id: string) {
    if (!draft) return
    if (!picked) return setPicked(id)
    if (picked === id) return setPicked(null)
    const from = draft.findIndex((i) => i.id === picked)
    const to = draft.findIndex((i) => i.id === id)
    const next = [...draft]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setDraft(next)
    setPicked(null)
  }

  async function saveOrder() {
    if (!draft) return
    setBusy('A guardar a ordem...')
    try {
      await api.put('/admin/portfolio/order', { ids: draft.map((i) => i.id) })
      setDraft(null)
      setPicked(null)
      await load()
      setMessage({ ok: true, text: 'Ordem guardada.' })
    } catch (err) {
      setMessage({
        ok: false,
        text:
          err instanceof ApiError && err.status === 404
            ? 'O servidor ainda não tem esta função: publica-o no Render e tenta de novo.'
            : err instanceof ApiError
              ? err.message
              : 'Não foi possível guardar a ordem.',
      })
    } finally {
      setBusy(null)
    }
  }

  const shown = draft ?? items ?? []
  const photos = items?.filter((i) => i.kind === 'IMAGE').length ?? 0
  const videos = items?.filter((i) => i.kind === 'VIDEO').length ?? 0
  const openIndex = openId ? (items ?? []).findIndex((i) => i.id === openId) : -1
  const openItem = openIndex >= 0 ? items![openIndex] : null

  return (
    <section className="mt-6">
      {/* What it is, and the two actions. */}
      <div className="rounded-[12px] bg-[var(--ios-cell)] p-4">
        <p className="font-subtitle text-2xl font-semibold lining-nums tracking-tight text-onyx">
          {photos} {photos === 1 ? 'foto' : 'fotos'}
        </p>
        <p className="mt-1 font-subtitle text-sm text-muted-dark">
          Aparecem na galeria do site e na app, por esta ordem. As {FEATURED} primeiras ficam em destaque no site.
          {videos > 0 && ` Há ${videos} ${videos === 1 ? 'vídeo antigo' : 'vídeos antigos'} que podes apagar.`}
        </p>
        {draft ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => {
                setDraft(null)
                setPicked(null)
              }}
              className="h-11 rounded-full border border-onyx/15 font-subtitle text-sm text-onyx disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void saveOrder()}
              className="h-11 rounded-full bg-onyx font-subtitle text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ?? 'Guardar ordem'}
            </button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => input.current?.click()}
              className="flex h-11 items-center justify-center gap-2 rounded-full bg-onyx font-subtitle text-sm font-medium text-white disabled:opacity-50"
            >
              <i className="bx bx-plus text-lg" aria-hidden="true" />
              {busy ?? 'Adicionar'}
            </button>
            <button
              type="button"
              disabled={busy !== null || (items?.length ?? 0) < 2}
              onClick={() => {
                setDraft(items)
                setMessage(null)
              }}
              className="flex h-11 items-center justify-center gap-2 rounded-full border border-onyx/15 font-subtitle text-sm text-onyx disabled:opacity-40"
            >
              <i className="bx bx-sort-alt-2 text-lg" aria-hidden="true" />
              Organizar
            </button>
          </div>
        )}
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void addFiles(e.target.files)}
        />
        {message && (
          <p className={`mt-3 font-subtitle text-sm ${message.ok ? 'text-onyx' : 'text-red-700'}`}>{message.text}</p>
        )}
      </div>

      {draft && (
        <p className="mt-4 rounded-xl bg-onyx/[0.05] px-4 py-3 font-subtitle text-sm text-onyx">
          {picked
            ? 'Agora toca no lugar para onde a queres mover.'
            : 'Toca numa foto para a escolher, e depois no lugar para onde a queres mover.'}
        </p>
      )}

      {items === null && <p className="mt-6 font-subtitle text-muted-dark">A carregar...</p>}
      {items && items.length === 0 && (
        <div className="mt-6 flex flex-col items-center rounded-3xl bg-onyx/[0.04] px-6 py-10 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-onyx text-3xl text-white">
            <i className="bx bx-images" aria-hidden="true" />
          </span>
          <p className="mt-5 font-subtitle text-xl font-semibold tracking-tight text-onyx">Ainda sem fotos</p>
          <p className="mt-1.5 max-w-xs font-subtitle text-sm text-muted-dark">
            Adiciona fotos do teu trabalho. Até lá, o site e a app mostram fotos de exemplo.
          </p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2">
        {shown.map((item, index) => {
          const isPicked = picked === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => (draft ? tapInDraft(item.id) : setOpenId(item.id))}
              aria-label={`Foto ${index + 1}`}
              className={cn(
                'relative aspect-[3/4] overflow-hidden rounded-xl bg-onyx/5 transition-transform',
                isPicked && 'scale-95 ring-4 ring-onyx',
                draft && picked && !isPicked && 'opacity-80',
              )}
            >
              {item.kind === 'IMAGE' ? (
                <img src={fileUrl(item.id)} alt="" loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <video
                  src={`${fileUrl(item.id)}#t=0.1`}
                  muted
                  playsInline
                  preload="metadata"
                  className="background-video h-full w-full object-cover"
                />
              )}
              {/* Its place in the order; the featured ones in solid. */}
              <span
                className={cn(
                  'absolute left-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 font-subtitle text-[11px] font-semibold',
                  index < FEATURED ? 'bg-onyx text-white' : 'bg-white/85 text-onyx',
                )}
              >
                {index + 1}
              </span>
              {index < FEATURED && !draft && (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-1.5 pt-4 text-left font-subtitle text-[10px] uppercase tracking-wide text-[#ffffff]">
                  Destaque
                </span>
              )}
              {item.kind === 'VIDEO' && (
                <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/60 px-2 py-0.5 font-subtitle text-[10px] text-[#ffffff]">
                  Vídeo
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* One photo, large, with what can be done to it. */}
      {openItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ${openIndex + 1}`}
          className="fixed inset-0 z-[80] flex flex-col bg-black/90 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]"
        >
          <div className="flex items-center justify-between">
            <p className="font-subtitle text-sm text-[#ffffff]/80">
              Foto {openIndex + 1} de {items!.length}
              {openIndex < FEATURED && ' · em destaque'}
            </p>
            <button
              type="button"
              aria-label="Fechar"
              onClick={closeViewer}
              className="flex size-10 items-center justify-center rounded-full bg-[#ffffff]/15 text-2xl text-[#ffffff]"
            >
              <i className="bx bx-x" aria-hidden="true" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center py-4">
            {openItem.kind === 'IMAGE' ? (
              <img src={fileUrl(openItem.id)} alt="" className="max-h-full max-w-full rounded-2xl object-contain" />
            ) : (
              <video src={fileUrl(openItem.id)} controls playsInline className="max-h-full max-w-full rounded-2xl" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy !== null || openIndex === 0}
              onClick={() => {
                const id = openItem.id
                closeViewer()
                void act(() => api.post(`/admin/portfolio/${id}/first`), 'Foto posta em primeiro lugar.')
              }}
              className="h-12 rounded-full bg-[#ffffff] font-subtitle text-sm font-medium text-[#111111] disabled:opacity-40"
            >
              Pôr em 1.º
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => {
                if (!confirmDelete) return setConfirmDelete(true)
                const id = openItem.id
                closeViewer()
                void act(() => api.delete(`/admin/portfolio/${id}`), 'Foto apagada.')
              }}
              className={cn(
                'h-12 rounded-full font-subtitle text-sm font-medium transition-colors disabled:opacity-40',
                confirmDelete ? 'bg-red-600 text-[#ffffff]' : 'border border-[#ffffff]/30 text-[#ffffff]',
              )}
            >
              {confirmDelete ? 'Toca de novo para apagar' : 'Apagar'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
