import { randomBytes } from 'node:crypto'
import { Router } from 'express'
import { sendBookingPushNotification } from '../lib/apns.js'
import { hashPassword, requireAdmin, requireCustomer } from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'
import {
  sendBookingAcceptedEmail,
  sendBookingConfirmationEmail,
  sendBookingNotification,
  sendBookingRejectedEmail,
} from '../lib/resend.js'
import { createBookingSchema, manualBookingSchema, rejectBookingSchema } from '../lib/validation.js'

export const bookingsRouter = Router()

class SlotUnavailableError extends Error {}
class ServiceNotFoundError extends Error {}

bookingsRouter.post('/', requireCustomer, async (req, res) => {
  const parsed = createBookingSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Dados de marcação inválidos.' })
    return
  }

  const { slotId, serviceId, customerName, customerPhone, notes } = parsed.data
  const customerId = req.customerId!

  try {
    const { booking, slot, service, customer } = await prisma.$transaction(async (tx) => {
      const slot = await tx.availabilitySlot.findUnique({ where: { id: slotId } })
      if (!slot || slot.status !== 'OPEN') {
        throw new SlotUnavailableError()
      }

      const service = await tx.service.findUnique({ where: { id: serviceId } })
      if (!service) {
        throw new ServiceNotFoundError()
      }

      const customer = await tx.customer.findUniqueOrThrow({ where: { id: customerId } })

      await tx.availabilitySlot.update({ where: { id: slot.id }, data: { status: 'PENDING' } })
      const booking = await tx.booking.create({
        data: { slotId: slot.id, serviceId: service.id, customerId, customerName, customerPhone, notes },
      })

      return { booking, slot, service, customer }
    })

    // Awaited (not fire-and-forget) — a detached push send was observed to
    // get cut off before completing once the response for this request went
    // out, even though the exact same send logic works fine when awaited
    // directly (confirmed via the diagnostic endpoint).
    await Promise.all([
      sendBookingConfirmationEmail(customer.email, {
        serviceName: service.name,
        priceCents: service.priceCents,
        startsAt: slot.startsAt,
        durationLabel: service.durationLabel,
      }),
      sendBookingNotification({
        customerName,
        customerPhone,
        serviceName: service.name,
        priceCents: service.priceCents,
        startsAt: slot.startsAt,
        durationLabel: service.durationLabel,
      }),
      sendBookingPushNotification({ customerName, serviceName: service.name }),
    ])

    res.status(201).json({ id: booking.id, status: booking.status })
  } catch (error) {
    if (error instanceof SlotUnavailableError) {
      res.status(409).json({ error: 'Esta vaga já não está disponível. Escolhe outro horário.' })
      return
    }
    if (error instanceof ServiceNotFoundError) {
      res.status(404).json({ error: 'Serviço não encontrado.' })
      return
    }
    console.error('[bookings] create failed:', error)
    res.status(500).json({ error: 'Erro ao criar marcação.' })
  }
})

export const adminBookingsRouter = Router()
adminBookingsRouter.use(requireAdmin)

adminBookingsRouter.get('/', async (_req, res) => {
  const bookings = await prisma.booking.findMany({
    include: { slot: true, service: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(bookings)
})

adminBookingsRouter.post('/:id/accept', async (req, res) => {
  await resolveBooking(req.params.id, 'ACCEPTED', 'BOOKED', res, ['PENDING'])
})

adminBookingsRouter.post('/:id/reject', async (req, res) => {
  const parsed = rejectBookingSchema.safeParse(req.body ?? {})
  await resolveBooking(req.params.id, 'REJECTED', 'OPEN', res, ['PENDING'], parsed.success ? parsed.data.reason : undefined)
})

class ManualSlotTakenError extends Error {}

// A booking the business adds itself (client booked by WhatsApp, Instagram, in person…).
// It is confirmed straight away. Clients without an account get a placeholder customer
// (never emailed) so the booking, history and stats all work the same way.
adminBookingsRouter.post('/manual', async (req, res) => {
  const parsed = manualBookingSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Dados da marcação inválidos.' })
    return
  }
  const { startsAt, serviceId, customerId, customerName, customerPhone, notes } = parsed.data
  if (!customerId && (!customerName || !customerPhone)) {
    res.status(400).json({ error: 'Indica o nome e o telemóvel do cliente.' })
    return
  }

  try {
    const placeholderHash = customerId ? '' : await hashPassword(randomBytes(24).toString('hex'))
    const { booking, customer, service, slot } = await prisma.$transaction(async (tx) => {
      const service = await tx.service.findUnique({ where: { id: serviceId } })
      if (!service) throw new ServiceNotFoundError()

      let customer = customerId ? await tx.customer.findUnique({ where: { id: customerId } }) : null
      if (customerId && !customer) throw new Error('customer-not-found')
      if (!customer) {
        customer = await tx.customer.findFirst({ where: { phone: customerPhone!, email: { endsWith: '@manual.invalid' } } })
      }
      if (!customer) {
        customer = await tx.customer.create({
          data: {
            name: customerName!,
            phone: customerPhone!,
            email: `manual-${randomBytes(8).toString('hex')}@manual.invalid`,
            passwordHash: placeholderHash,
          },
        })
      }

      const existing = await tx.availabilitySlot.findUnique({ where: { startsAt: new Date(startsAt) } })
      if (existing && existing.status !== 'OPEN') throw new ManualSlotTakenError()
      const slot = existing
        ? await tx.availabilitySlot.update({ where: { id: existing.id }, data: { status: 'BOOKED' } })
        : await tx.availabilitySlot.create({ data: { startsAt: new Date(startsAt), status: 'BOOKED' } })

      const booking = await tx.booking.create({
        data: {
          slotId: slot.id,
          serviceId: service.id,
          customerId: customer.id,
          customerName: customerName ?? customer.name,
          customerPhone: customerPhone ?? customer.phone,
          notes,
          status: 'ACCEPTED',
        },
        include: { slot: true, service: true },
      })
      return { booking, customer, service, slot }
    })

    await sendBookingAcceptedEmail(customer.email, {
      serviceName: service.name,
      priceCents: service.priceCents,
      startsAt: slot.startsAt,
      durationLabel: service.durationLabel,
    })
    res.status(201).json(booking)
  } catch (error) {
    if (error instanceof ManualSlotTakenError) {
      res.status(409).json({ error: 'Já existe uma marcação nesse horário.' })
      return
    }
    if (error instanceof ServiceNotFoundError) {
      res.status(404).json({ error: 'Serviço não encontrado.' })
      return
    }
    if (error instanceof Error && error.message === 'customer-not-found') {
      res.status(404).json({ error: 'Cliente não encontrado.' })
      return
    }
    console.error('[bookings] manual create failed:', error)
    res.status(500).json({ error: 'Erro ao criar marcação.' })
  }
})

adminBookingsRouter.post('/:id/cancel', async (req, res) => {
  await resolveBooking(req.params.id, 'CANCELLED', 'OPEN', res, ['ACCEPTED'])
})

async function resolveBooking(
  bookingId: string,
  bookingStatus: 'ACCEPTED' | 'REJECTED' | 'CANCELLED',
  slotStatus: 'BOOKED' | 'OPEN',
  res: import('express').Response,
  allowedFrom: Array<'PENDING' | 'ACCEPTED'>,
  reason?: string,
) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { slot: true, service: true, customer: true },
    })
    if (!booking) {
      res.status(404).json({ error: 'Marcação não encontrada.' })
      return
    }
    if (!allowedFrom.includes(booking.status as 'PENDING' | 'ACCEPTED')) {
      res.status(400).json({ error: 'Esta marcação já foi respondida.' })
      return
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.availabilitySlot.update({ where: { id: booking.slotId }, data: { status: slotStatus } })
      return tx.booking.update({ where: { id: booking.id }, data: { status: bookingStatus } })
    })

    if (bookingStatus === 'ACCEPTED') {
      await sendBookingAcceptedEmail(booking.customer.email, {
        serviceName: booking.service.name,
        priceCents: booking.service.priceCents,
        startsAt: booking.slot.startsAt,
        durationLabel: booking.service.durationLabel,
      })
    } else if (bookingStatus === 'REJECTED') {
      await sendBookingRejectedEmail(booking.customer.email, {
        serviceName: booking.service.name,
        startsAt: booking.slot.startsAt,
      }, reason)
    }

    res.json(updated)
  } catch (error) {
    console.error('[bookings] resolve failed:', error)
    res.status(500).json({ error: 'Erro ao atualizar marcação.' })
  }
}
