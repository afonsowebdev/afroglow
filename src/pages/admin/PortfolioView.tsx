import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDownUp, Check, Images, Plus, Star, Trash2, X } from 'lucide-react'
import { api, ApiError, assetUrl } from '@/lib/api'
import { tap } from '@/lib/haptics'
import { useScrollLock } from '@/lib/use-scroll-lock'
import { cn } from '@/lib/utils'
import { cardShadow } from './admin-ui'

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
  useScrollLock(openItem !== null)

  return (
    <section className="mt-6">
      {/* What it is, in three figures. */}
      {items && items.length > 0 && (
        <div className="grid grid-cols-3 gap-2.5">
          {[
            ['Fotos', String(photos)],
            ['Em destaque', String(Math.min(FEATURED, items.length))],
            [videos > 0 ? 'Vídeos antigos' : 'Na app', videos > 0 ? String(videos) : String(items.length)],
          ].map(([label, value]) => (
            <div key={label} className={`flex min-w-0 flex-col items-center rounded-[22px] bg-card px-2 py-3.5 text-center ${cardShadow}`}>
              <p className="max-w-full truncate font-subtitle text-[12px] text-ink-3">{label}</p>
              <p className="tabular mt-1 font-subtitle text-[22px] font-semibold leading-tight tracking-tight text-onyx">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* The two actions: plain white buttons. While organising, cancel or save the order. */}
      <div className={`grid grid-cols-2 gap-2.5 ${items && items.length > 0 ? 'mt-3' : ''}`}>
        {draft ? (
          <>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => {
                void tap()
                setDraft(null)
                setPicked(null)
              }}
              className="glass-chip flex h-12 items-center justify-center gap-1.5 rounded-full font-subtitle text-[14px] font-semibold text-onyx disabled:opacity-50"
            >
              <X size={16} className="text-muted-dark" />
              Cancelar
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void saveOrder()}
              className={`flex h-12 items-center justify-center gap-1.5 rounded-full bg-card font-subtitle text-[14px] font-semibold text-onyx disabled:opacity-50 ${cardShadow}`}
            >
              <Check size={17} strokeWidth={2.6} style={{ color: 'var(--c-confirmed)' }} />
              {busy ?? 'Guardar ordem'}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => {
                void tap()
                input.current?.click()
              }}
              className={`flex h-12 items-center justify-center gap-1.5 rounded-full bg-card font-subtitle text-[14px] font-semibold text-onyx transition-transform active:scale-[0.98] disabled:opacity-50 ${cardShadow}`}
            >
              <Plus size={17} />
              {busy ?? 'Adicionar'}
            </button>
            <button
              type="button"
              disabled={busy !== null || (items?.length ?? 0) < 2}
              onClick={() => {
                void tap()
                setDraft(items)
                setMessage(null)
              }}
              className={`flex h-12 items-center justify-center gap-1.5 rounded-full bg-card font-subtitle text-[14px] font-semibold text-onyx transition-transform active:scale-[0.98] disabled:opacity-40 ${cardShadow}`}
            >
              <ArrowDownUp size={16} />
              Organizar
            </button>
          </>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void addFiles(e.target.files)} />
      <p className="mt-3 px-1 font-subtitle text-xs text-muted-dark">
        Aparecem na galeria do site e na app por esta ordem; as {FEATURED} primeiras ficam em destaque no site.
        {videos > 0 && ` Há ${videos} ${videos === 1 ? 'vídeo antigo' : 'vídeos antigos'} que podes apagar.`}
      </p>
      {message && (
        <div className={`mt-3 flex items-center gap-2.5 rounded-[22px] bg-card px-4 py-3 ${cardShadow}`}>
          {message.ok ? <Check size={17} className="shrink-0" style={{ color: 'var(--c-confirmed)' }} /> : <X size={17} className="shrink-0" style={{ color: 'var(--c-cancelled)' }} />}
          <p className="flex-1 font-subtitle text-sm text-onyx">{message.text}</p>
          <button type="button" aria-label="Fechar aviso" onClick={() => setMessage(null)} className="text-muted-dark">
            <X size={15} />
          </button>
        </div>
      )}

      {draft && (
        <p className="mt-4 flex items-center gap-2.5 rounded-[20px] px-4 py-3 font-subtitle text-[13px] text-onyx" style={{ background: 'color-mix(in srgb, var(--c-waiting) 14%, transparent)' }}>
          <ArrowDownUp size={16} className="shrink-0" />
          {picked ? 'Agora toca no lugar para onde a queres mover.' : 'Toca numa foto para a escolher, e depois no lugar para onde a queres mover.'}
        </p>
      )}

      {items === null && <p className="mt-6 px-1 font-subtitle text-sm text-muted-dark">A carregar…</p>}
      {items && items.length === 0 && (
        <div className={`mt-6 flex flex-col items-center rounded-[22px] bg-card px-6 py-10 text-center ${cardShadow}`}>
          <span className="glass-chip flex size-16 items-center justify-center rounded-full text-onyx">
            <Images size={26} />
          </span>
          <p className="mt-5 font-subtitle text-xl font-semibold tracking-tight text-onyx">Ainda sem fotos</p>
          <p className="mt-1.5 max-w-xs font-subtitle text-sm text-muted-dark">
            Adiciona fotos do teu trabalho. Até lá, o site e a app mostram fotos de exemplo.
          </p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {shown.map((item, index) => {
          const isPicked = picked === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => (draft ? tapInDraft(item.id) : setOpenId(item.id))}
              aria-label={`Foto ${index + 1}`}
              className={cn(
                'relative aspect-[3/4] overflow-hidden rounded-[18px] bg-onyx/5 shadow-[0_6px_16px_-8px_rgba(0,0,0,0.3)] transition-transform',
                isPicked && 'scale-95 ring-[3px] ring-[var(--c-waiting)]',
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
                className="absolute left-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center gap-0.5 rounded-full bg-black/45 px-1.5 font-subtitle text-[11px] font-semibold text-[#ffffff] backdrop-blur-sm"
              >
                {index < FEATURED && <Star size={10} fill="currentColor" style={{ color: '#fabf00' }} />}
                {index + 1}
              </span>
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
              className="flex size-10 items-center justify-center rounded-full bg-[#ffffff]/15 text-[#ffffff] backdrop-blur-md"
            >
              <X size={18} />
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
              className="flex h-12 items-center justify-center gap-1.5 rounded-full bg-[#ffffff] font-subtitle text-sm font-semibold text-[#111111] disabled:opacity-40"
            >
              <Star size={15} />
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
                'flex h-12 items-center justify-center gap-1.5 rounded-full font-subtitle text-sm font-semibold text-[#ffffff] transition-colors disabled:opacity-40',
                confirmDelete ? '' : 'bg-[#ffffff]/15 backdrop-blur-md',
              )}
              style={confirmDelete ? { background: 'var(--c-cancelled)' } : undefined}
            >
              <Trash2 size={15} />
              {confirmDelete ? 'Toca de novo para apagar' : 'Apagar'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
