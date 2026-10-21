import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BellRing, CalendarPlus, Camera, Mail, MessageCircle, Phone, Trash2, X, type LucideIcon } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { bookingName, bookingPrice } from '@/lib/pricing'
import { customerWhatsappUrl } from '@/lib/site-config'
import { cn } from '@/lib/utils'
import { shrinkPhoto } from '../ServicePhotos'
import { STATUS_LABEL, type AdminCustomerDetail } from '../admin-types'
import { useAdmin } from '../admin-context'
import { dateKey, dateParts, dayTitle, euros, longDate, plural, telHref, timeAgo } from '../format'
import { Alert, Avatar, BarButton, Cell, EmptyState, Screen, Section, TextAreaCell, plainInput, useToast } from '../ios'

/** A round action under the name, as on a contact card: message, call, mail… */
function ContactAction({ Icon, label, href, onClick }: { Icon: LucideIcon; label: string; href?: string; onClick?: () => void }) {
  const className =
    'flex flex-1 flex-col items-center gap-1 rounded-[10px] bg-[var(--ios-cell)] py-2 text-[11px] text-[var(--ios-tint)] active:bg-[var(--ios-cell-pressed)]'
  const body = (
    <>
      <Icon className="size-[22px]" strokeWidth={2} />
      {label}
    </>
  )
  return href ? (
    <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className={className}>
      {body}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  )
}

/** One private photo: loaded with the admin's login (as a data URL), cached for the session. */
const photoCache = new Map<string, string>()
function Photo({ customerId, id, onOpen }: { customerId: string; id: string; onOpen: (src: string) => void }) {
  const [src, setSrc] = useState(() => photoCache.get(id) ?? null)
  useEffect(() => {
    if (src) return
    api
      .get<{ dataUrl: string }>(`/admin/customers/${customerId}/photos/${id}`)
      .then((data) => {
        photoCache.set(id, data.dataUrl)
        setSrc(data.dataUrl)
      })
      .catch(() => {})
  }, [customerId, id, src])
  return (
    <button
      type="button"
      onClick={() => src && onOpen(src)}
      className="aspect-square overflow-hidden rounded-[8px] bg-[var(--ios-fill)] active:opacity-70"
    >
      {src && <img src={src} alt="" className="size-full object-cover" />}
    </button>
  )
}

export function CustomerDetailScreen({ id, backLabel }: { id: string; backLabel: string }) {
  const { pop, can, newBooking, goTab, bookings } = useAdmin()
  const toast = useToast()
  const [customer, setCustomer] = useState<AdminCustomerDetail | null>(null)
  const [error, setError] = useState(false)
  const [notes, setNotes] = useState('')
  const [savedNotes, setSavedNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const [viewer, setViewer] = useState<{ id: string; src: string; caption: string; createdAt: string } | null>(null)
  const [confirmPhoto, setConfirmPhoto] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [password, setPassword] = useState('')
  const [showAll, setShowAll] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  async function load() {
    try {
      const data = await api.get<AdminCustomerDetail>(`/admin/customers/${id}`)
      setCustomer(data)
      setNotes(data.adminNotes)
      setSavedNotes(data.adminNotes)
      setError(false)
    } catch {
      setError(true)
    }
  }

  const bookingsKey = bookings.map((b) => b.id + b.status).join()
  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, bookingsKey])

  async function saveNotes() {
    if (notes.trim() === savedNotes.trim()) return
    try {
      await api.patch(`/admin/customers/${id}/notes`, { adminNotes: notes })
      setSavedNotes(notes.trim())
      toast('Notas guardadas')
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Não foi possível guardar as notas.', true)
    }
  }

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    try {
      for (const file of Array.from(files).slice(0, 10)) {
        const data = await shrinkPhoto(file)
        await api.post(`/admin/customers/${id}/photos`, { contentType: 'image/jpeg', data })
      }
      await load()
      toast(files.length > 1 ? 'Fotos guardadas' : 'Foto guardada')
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Não foi possível guardar a foto.', true)
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function deletePhoto() {
    if (!viewer) return
    try {
      await api.delete(`/admin/customers/${id}/photos/${viewer.id}`)
      setViewer(null)
      await load()
      toast('Foto apagada')
    } catch {
      toast('Não foi possível apagar a foto.', true)
    }
  }

  async function deleteCustomer() {
    try {
      await api.post('/admin/customers/delete', { ids: [id], password })
      toast('Cliente eliminada')
      pop()
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Não foi possível eliminar.', true)
    }
  }

  if (error || !customer) {
    return (
      <Screen title="" back={{ label: backLabel, onClick: pop }}>
        {error ? (
          <EmptyState Icon={X} title="Sem ligação" text="Não foi possível abrir a ficha." action={{ label: 'Tentar de novo', onClick: () => void load() }} />
        ) : (
          <p className="py-10 text-center text-[15px] text-[var(--ios-secondary)]">A carregar…</p>
        )}
      </Screen>
    )
  }

  const s = customer.summary
  const now = Date.now()
  const next = customer.bookings
    .filter((b) => (b.status === 'ACCEPTED' || b.status === 'PENDING') && new Date(b.slot.startsAt).getTime() >= now)
    .sort((a, b) => a.slot.startsAt.localeCompare(b.slot.startsAt))
  const history = customer.bookings.filter((b) => !next.includes(b))
  const photos = customer.photos ?? []
  const notesDirty = notes.trim() !== savedNotes.trim()

  return (
    <Screen
      title={customer.name}
      back={{ label: backLabel, onClick: pop }}
      trailing={notesDirty ? <BarButton label="Guardar" bold onClick={() => void saveNotes()} /> : undefined}
    >
      {/* The card's head: photo, name, since when, and the ways to reach her. */}
      <div className="flex flex-col items-center px-4 pt-1 text-center">
        <Avatar name={customer.name} size={88} />
        <p className="mt-2 text-[15px] text-[var(--ios-secondary)]">
          {customer.hasAccount ? 'Com conta na app' : 'Sem conta · adicionada por ti'} · desde{' '}
          {new Date(customer.createdAt).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
        </p>
      </div>
      <div className="mt-4 flex gap-2 px-4">
        <ContactAction Icon={MessageCircle} label="WhatsApp" href={customerWhatsappUrl(customer.phone, `Olá ${customer.name.split(' ')[0]}! `)} />
        <ContactAction Icon={Phone} label="Ligar" href={telHref(customer.phone)} />
        {customer.email && <ContactAction Icon={Mail} label="Email" href={`mailto:${customer.email}`} />}
        {can('marcacoes') && (
          <ContactAction Icon={CalendarPlus} label="Marcar" onClick={() => newBooking({ id: customer.id, name: customer.name, phone: customer.phone })} />
        )}
      </div>

      {/* Her story in numbers. */}
      {s && (
        <Section flush>
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[12px] bg-[var(--ios-separator)]">
            {[
              [String(s.visits), s.visits === 1 ? 'visita' : 'visitas'],
              [euros(s.spentCents), 'no total'],
              [s.visits ? euros(s.averageCents) : '—', 'por visita'],
            ].map(([value, label]) => (
              <div key={label} className="bg-[var(--ios-cell)] px-2 py-3 text-center">
                <p className="truncate text-lg font-semibold tabular-nums">{value}</p>
                <p className="text-[12px] text-[var(--ios-secondary)]">{label}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section>
        <Cell title="Telemóvel" detail={customer.phone} href={telHref(customer.phone)} accessory="none" />
        {customer.email && <Cell title="Email" detail={customer.email} accessory="none" />}
        <Cell title="Lembrete 48h antes" detail={customer.reminderChannel === 'PHONE' ? 'Mensagem' : 'Email'} />
        {s?.favouriteService && <Cell title="Modelo preferido" detail={s.favouriteService} />}
        {s?.everyDays && <Cell title="Volta a cada" detail={plural(s.everyDays, 'dia', 'dias')} />}
        {s?.lastVisitAt && <Cell title="Última visita" detail={timeAgo(s.lastVisitAt)} />}
        {s && s.cancelled > 0 && <Cell title="Cancelamentos" detail={String(s.cancelled)} />}
      </Section>

      <Section header="Notas privadas" footer="Só tu e a tua equipa veem. Preferências, alergias, tamanho, cuidados…">
        <TextAreaCell
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => void saveNotes()}
          rows={4}
          maxLength={1000}
          placeholder="Escreve uma nota"
          aria-label="Notas privadas"
        />
      </Section>

      <Section
        header={`Fotos · ${photos.length}`}
        flush
        footer="Antes e depois, o penteado feito… Ficam só no painel, as clientes não as veem."
      >
        <div className="grid grid-cols-3 gap-1.5 rounded-[12px] bg-[var(--ios-cell)] p-1.5">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-[8px] bg-[var(--ios-fill)] text-[13px] text-[var(--ios-tint)] active:opacity-60 disabled:opacity-40"
          >
            <Camera className="size-6" strokeWidth={1.9} />
            {uploading ? 'A enviar…' : 'Adicionar'}
          </button>
          {photos.map((photo) => (
            <Photo
              key={photo.id}
              customerId={customer.id}
              id={photo.id}
              onOpen={(src) => setViewer({ ...photo, src })}
            />
          ))}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void addPhotos(e.target.files)}
        />
      </Section>

      {next.length > 0 && (
        <Section header="Próximas">
          {next.map((b) => (
            <Cell
              key={b.id}
              title={whenTitle(b.slot.startsAt)}
              subtitle={`${bookingName(b)}${b.status === 'PENDING' ? ' · por confirmar' : ''}`}
              detail={euros(bookingPrice(b))}
              onClick={b.status === 'PENDING' ? () => goTab('requests') : () => goTab('agenda')}
            />
          ))}
        </Section>
      )}

      <Section header={`Histórico · ${history.length}`}>
        {history.length === 0 ? (
          <Cell title="Ainda sem sessões" />
        ) : (
          (showAll ? history : history.slice(0, 6)).map((b) => (
            <Cell
              key={b.id}
              title={bookingName(b)}
              subtitle={`${longDate(dateKey(b.slot.startsAt))} · ${dateParts(b.slot.startsAt).time}`}
              detail={
                <span
                  className={cn(
                    'text-[15px]',
                    b.status === 'REJECTED' && 'text-[var(--ios-red)]',
                    b.status === 'CANCELLED' && 'text-[var(--ios-orange)]',
                  )}
                >
                  {b.status === 'ACCEPTED' ? euros(bookingPrice(b)) : STATUS_LABEL[b.status]}
                </span>
              }
            />
          ))
        )}
        {!showAll && history.length > 6 && <Cell tinted title={`Ver as ${history.length}`} onClick={() => setShowAll(true)} />}
      </Section>

      <Section>
          {can('notificacoes') && customer.hasAccount && (
            <Cell
              Icon={BellRing}
              tint="orange"
              title="Enviar uma notificação"
              onClick={() => goTab('more', { name: 'broadcast', id: customer.id })}
            />
          )}
          <Cell
            Icon={Trash2}
            tint="red"
            title="Eliminar cliente"
            destructive
            onClick={() => {
              setPassword('')
              setConfirmDelete(true)
            }}
          />
      </Section>

      {/* A photo full screen, with its date and delete. */}
      <AnimatePresence>
        {viewer && (
          <motion.div
            className="fixed inset-0 z-[85] flex flex-col bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center justify-between px-2 pt-[env(safe-area-inset-top)] text-white">
              <button type="button" onClick={() => setViewer(null)} className="h-11 px-2 text-[15px]">
                Fechar
              </button>
              <p className="text-[15px] opacity-80">{timeAgo(viewer.createdAt)}</p>
              <button type="button" onClick={() => setConfirmPhoto(true)} aria-label="Apagar foto" className="flex size-11 items-center justify-center">
                <Trash2 className="size-[22px]" strokeWidth={2} />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center p-2">
              <img src={viewer.src} alt="" className="max-h-full max-w-full object-contain" />
            </div>
            {viewer.caption && <p className="px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] text-center text-[15px] text-white/80">{viewer.caption}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      <Alert
        open={confirmPhoto}
        title="Apagar a foto?"
        onClose={() => setConfirmPhoto(false)}
        buttons={[
          { label: 'Cancelar', style: 'cancel' },
          {
            label: 'Apagar',
            style: 'destructive',
            onClick: () => {
              setConfirmPhoto(false)
              void deletePhoto()
            },
          },
        ]}
      />
      <Alert
        open={confirmDelete}
        title={`Eliminar ${customer.name.split(' ')[0]}?`}
        message="As sessões futuras são canceladas, os dados pessoais, fotos e testemunhos apagados. Não pode ser desfeito."
        onClose={() => setConfirmDelete(false)}
        buttons={[
          { label: 'Cancelar', style: 'cancel' },
          {
            label: 'Eliminar',
            style: 'destructive',
            onClick: () => {
              setConfirmDelete(false)
              if (password) void deleteCustomer()
            },
          },
        ]}
      >
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="A tua password"
          aria-label="A tua password"
          className={`${plainInput} h-9 w-full rounded-[8px] bg-[var(--ios-cell)] px-2.5 text-[15px]`}
        />
      </Alert>
    </Screen>
  )
}

function whenTitle(iso: string) {
  return `${dayTitle(iso)} às ${dateParts(iso).time}`
}
