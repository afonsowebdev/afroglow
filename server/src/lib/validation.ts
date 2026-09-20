import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const createSlotSchema = z.object({
  startsAt: z.string().datetime(),
})

export const createBookingSchema = z.object({
  slotId: z.string().min(1),
  serviceId: z.string().min(1),
  customerName: z.string().trim().min(2).max(100),
  customerPhone: z.string().trim().min(6).max(30),
  notes: z.string().trim().max(500).optional(),
})
