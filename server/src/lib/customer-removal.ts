import { randomBytes } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { hashPassword } from './auth.js'

/**
 * Removes a customer the way account deletion always has: upcoming sessions are cancelled and their slots freed,
 * the personal details on past bookings are wiped (the bookings stay for the revenue figures), testimonials and
 * push tokens are deleted, and the account itself is anonymised and locked. The customer then disappears from the
 * admin's list.
 */
export async function removeCustomer(
  tx: Prisma.TransactionClient,
  customer: { id: string; email: string },
  /** An unguessable hash to lock the account with; pass one to share it when removing many customers. */
  lockedHash?: string,
) {
  const hash = lockedHash ?? (await hashPassword(randomBytes(24).toString('hex')))
  const live = await tx.booking.findMany({
    where: {
      customerId: customer.id,
      status: { in: ['PENDING', 'ACCEPTED'] },
      slot: { startsAt: { gte: new Date() } },
    },
    select: { id: true, slotId: true },
  })
  if (live.length > 0) {
    await tx.availabilitySlot.updateMany({ where: { id: { in: live.map((b) => b.slotId) } }, data: { status: 'OPEN' } })
    await tx.booking.updateMany({ where: { id: { in: live.map((b) => b.id) } }, data: { status: 'CANCELLED' } })
  }
  await tx.booking.updateMany({
    where: { customerId: customer.id },
    data: { customerName: 'Conta eliminada', customerPhone: '-', notes: null },
  })
  await tx.testimonial.deleteMany({ where: { customerId: customer.id } })
  await tx.customerPushToken.deleteMany({ where: { customerId: customer.id } })
  await tx.pendingRegistration.deleteMany({ where: { email: customer.email } })
  await tx.customer.update({
    where: { id: customer.id },
    data: {
      name: 'Conta eliminada',
      email: `eliminada-${customer.id}@removed.invalid`,
      phone: '-',
      passwordHash: hash,
      adminNotes: '',
      avatar: null,
      avatarType: null,
      avatarUpdatedAt: null,
    },
  })
}
