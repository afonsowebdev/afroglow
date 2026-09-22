import { Router } from 'express'
import { requireAdmin } from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'
import { sendBookingNotification } from '../lib/resend.js'
import { createBookingSchema } from '../lib/validation.js'

export const bookingsRouter = Router()

class SlotUnavailableError extends Error {}
class ServiceNotFoundError extends Error {}

bookingsRouter.post('/', async (req, res) => {
  const parsed = createBookingSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Dados de marcação inválidos.' })
    return
  }

  const { slotId, serviceId, customerName, customerPhone, notes } = parsed.data

  try {
    const { booking, slot, service } = await prisma.$transaction(async (tx) => {
      const slot = await tx.availabilitySlot.findUnique({ where: { id: slotId } })
      if (!slot || slot.status !== 'OPEN') {
        throw new SlotUnavailableError()
      }

      const service = await tx.service.findUnique({ where: { id: serviceId } })
      if (!service) {
        throw new ServiceNotFoundError()
      }

      await tx.availabilitySlot.update({ where: { id: slot.id }, data: { status: 'PENDING' } })
      const booking = await tx.booking.create({
        data: { slotId: slot.id, serviceId: service.id, customerName, customerPhone, notes },
      })

      return { booking, slot, service }
    })

    void sendBookingNotification({
      customerName,
      customerPhone,
      serviceName: service.name,
      priceCents: service.priceCents,
      startsAt: slot.startsAt,
    })

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
  await resolveBooking(req.params.id, 'REJECTED', 'OPEN', res, ['PENDING'])
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
) {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
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

    res.json(updated)
  } catch (error) {
    console.error('[bookings] resolve failed:', error)
    res.status(500).json({ error: 'Erro ao atualizar marcação.' })
  }
}
