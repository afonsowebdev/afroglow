import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, CheckCircle2, MessageCircle, Phone } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { bookingName, bookingPrice } from '@/lib/pricing'
import { customerWhatsappUrl } from '@/lib/site-config'
import type { Booking } from '@/lib/types'
import { BookingChoices } from '../BookingChoices'
import { useAdmin } from '../admin-context'
import { dateParts, dayTitle, euros, telHref, timeAgo } from '../format'
import { Alert, Avatar, Button, EmptyState, Screen, Section, Segmented, plainInput, useToast } from '../ios'

/** One request: who, when, what and for how much, the note; Recusar and Aceitar. */
function RequestCard({
  booking,
  busy,
  onAccept,
  onReject,
}: {
  booking: Booking
  busy: boolean
  onAccept: () => void
  onReject: () => void
}) {
  const { push, can } = useAdmin()
  const { time } = dateParts(booking.slot.startsAt)
  const hoursUntil = (new Date(booking.slot.startsAt).getTime() - Date.now()) / 3_600_000
  const past = hoursUntil < 0
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40, transition: { duration: 0.2 } }}
      className="overflow-hidden rounded-[12px] bg-[var(--ios-cell)]"
    >
      <div className="flex w-full items-center gap-3 px-4 pb-2 pt-3">
        <button
          type="button"
          disabled={!can('clientes')}
          onClick={() => push({ name: 'customer', id: booking.customerId })}
          className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-60 disabled:active:opacity-100"
        >
          <Avatar name={booking.customerName} size={40} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold">{booking.customerName}</span>
            <span className="block truncate text-[13px] text-[var(--ios-secondary)]">
              Pedido {timeAgo(booking.createdAt).toLowerCase()}
            </span>
          </span>
        </button>
        <a
          href={customerWhatsappUrl(booking.customerPhone, `Olá ${booking.customerName}! Sobre a tua marcação de ${bookingName(booking)}...`)}
          target="_blank"
          rel="noreferrer"
          aria-label={`WhatsApp de ${booking.customerName}`}
          className="flex size-9 items-center justify-center rounded-full bg-[var(--ios-fill)] text-[var(--ios-tint)] active:opacity-50"
        >
          <MessageCircle className="size-[18px]" strokeWidth={2.2} />
        </a>
        <a
          href={telHref(booking.customerPhone)}
          aria-label={`Ligar a ${booking.customerName}`}
          className="flex size-9 items-center justify-center rounded-full bg-[var(--ios-fill)] text-[var(--ios-tint)] active:opacity-50"
        >
          <Phone className="size-[17px]" strokeWidth={2.2} />
        </a>
      </div>

      <div className="mx-4 my-2 rounded-[10px] bg-[var(--ios-bg)] px-3.5 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[15px] font-semibold">{dayTitle(booking.slot.startsAt)}</span>
          <span className="text-[22px] font-semibold tabular-nums">{time}</span>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-3 text-[15px]">
          <span className="min-w-0 truncate">{booking.service.name}</span>
          <span className="shrink-0 font-semibold tabular-nums">{euros(bookingPrice(booking))}</span>
        </div>
        <BookingChoices booking={booking} className="mt-2" />
        {(past || hoursUntil < 24) && (
          <p className={`mt-2 flex items-center gap-1.5 text-[13px] font-medium ${past ? 'text-[var(--ios-red)]' : 'text-[var(--ios-orange)]'}`}>
            <AlertTriangle className="size-3.5" strokeWidth={2.4} />
            {past ? 'A data já passou' : 'Menos de 24 horas'}
          </p>
        )}
      </div>

      {booking.notes && <p className="px-4 pb-1 text-[15px] italic text-[var(--ios-secondary)]">“{booking.notes}”</p>}

      <div className="grid grid-cols-2 gap-2.5 p-4 pt-2">
        <Button variant="gray" onClick={onReject} disabled={busy} className="h-11 text-[15px]">
          Recusar
        </Button>
        <Button onClick={onAccept} disabled={busy || past} className="h-11 text-[15px]">
          {busy ? 'A guardar…' : 'Aceitar'}
        </Button>
      </div>
    </motion.div>
  )
}

export function RequestsScreen() {
  const { bookings, reload } = useAdmin()
  const toast = useToast()
  const [order, setOrder] = useState<'session' | 'received'>('session')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<Booking | null>(null)
  const [reason, setReason] = useState('')

  const now = Date.now()
  const pending = bookings
    .filter((b) => b.status === 'PENDING')
    .sort((a, b) =>
      order === 'session' ? a.slot.startsAt.localeCompare(b.slot.startsAt) : b.createdAt.localeCompare(a.createdAt),
    )
  const upcoming = pending.filter((b) => new Date(b.slot.startsAt).getTime() >= now)
  const past = pending.filter((b) => new Date(b.slot.startsAt).getTime() < now)
  const waitingCents = upcoming.reduce((sum, b) => sum + bookingPrice(b), 0)

  async function decide(booking: Booking, decision: 'accept' | 'reject', why?: string) {
    setBusyId(booking.id)
    try {
      await api.post(`/admin/bookings/${booking.id}/${decision}`, why ? { reason: why } : undefined)
      await reload()
      toast(decision === 'accept' ? `${booking.customerName.split(' ')[0]}: marcação confirmada` : 'Pedido recusado')
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Não foi possível guardar.', true)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Screen
      title="Pedidos"
      subtitle={
        pending.length
          ? `${upcoming.length} por responder · ${euros(waitingCents)} em espera`
          : undefined
      }
    >
      {pending.length === 0 ? (
        <EmptyState
          Icon={CheckCircle2}
          title="Tudo respondido"
          text="Quando uma cliente pedir uma marcação, recebes uma notificação e o pedido aparece aqui."
        />
      ) : (
        <>
          <div className="px-4 pt-2">
            <Segmented
              value={order}
              onChange={setOrder}
              options={[
                { value: 'session', label: 'Por data da sessão' },
                { value: 'received', label: 'Mais recentes' },
              ]}
            />
          </div>

          <Section flush>
            <div className="flex flex-col gap-3">
              <AnimatePresence initial={false}>
                {upcoming.map((booking) => (
                  <RequestCard
                    key={booking.id}
                    booking={booking}
                    busy={busyId === booking.id}
                    onAccept={() => void decide(booking, 'accept')}
                    onReject={() => {
                      setReason('')
                      setRejecting(booking)
                    }}
                  />
                ))}
              </AnimatePresence>
            </div>
          </Section>

          {past.length > 0 && (
            <Section
              flush
              header={`Datas passadas · ${past.length}`}
              footer="Pedidos que ficaram sem resposta e cuja data já passou. Recusa-os para limpar a lista."
            >
              <div className="flex flex-col gap-3">
                {past.map((booking) => (
                  <RequestCard
                    key={booking.id}
                    booking={booking}
                    busy={busyId === booking.id}
                    onAccept={() => {}}
                    onReject={() => void decide(booking, 'reject')}
                  />
                ))}
              </div>
            </Section>
          )}
        </>
      )}

      <Alert
        open={rejecting !== null}
        title="Recusar o pedido?"
        message={rejecting ? `${rejecting.customerName} recebe um email e uma notificação.` : undefined}
        onClose={() => setRejecting(null)}
        buttons={[
          { label: 'Cancelar', style: 'cancel' },
          {
            label: 'Recusar',
            style: 'destructive',
            onClick: () => {
              const booking = rejecting
              setRejecting(null)
              if (booking) void decide(booking, 'reject', reason.trim() || undefined)
            },
          },
        ]}
      >
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={300}
          placeholder="Motivo (opcional)"
          aria-label="Motivo da recusa"
          className={`${plainInput} h-9 w-full rounded-[8px] bg-[var(--ios-cell)] px-2.5 text-[15px]`}
        />
      </Alert>
    </Screen>
  )
}
