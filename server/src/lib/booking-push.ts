import { sendCustomerPush } from './apns.js'

function whenLabel(startsAt: Date) {
  const day = startsAt.toLocaleDateString('pt-PT', { timeZone: 'Europe/Lisbon', weekday: 'long', day: 'numeric', month: 'long' })
  const time = startsAt.toLocaleTimeString('pt-PT', { timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit' })
  return `${day} às ${time}`
}

type Booking = { customerId: string; id: string; service: { name: string }; slot: { startsAt: Date } }

export const bookingPush = {
  accepted: (b: Booking) =>
    sendCustomerPush(b.customerId, 'Marcação confirmada ✓', `${b.service.name} · ${whenLabel(b.slot.startsAt)}`, { bookingId: b.id }),
  rejected: (b: Booking, reason?: string) =>
    sendCustomerPush(
      b.customerId,
      'Pedido não aceite',
      reason ? `${b.service.name}: ${reason}` : `${b.service.name} não ficou disponível nessa data. Escolhe outro horário.`,
      { bookingId: b.id },
    ),
  cancelled: (b: Booking) =>
    sendCustomerPush(b.customerId, 'Marcação cancelada', `${b.service.name} · ${whenLabel(b.slot.startsAt)}`, { bookingId: b.id }),
  reminder: (b: Booking) =>
    sendCustomerPush(b.customerId, 'Lembrete da tua sessão', `${b.service.name} · ${whenLabel(b.slot.startsAt)}`, { bookingId: b.id }),
}
