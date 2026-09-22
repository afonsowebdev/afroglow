import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const createSlotSchema = z.object({
  startsAt: z.string().datetime(),
})

export const createSlotsBatchSchema = z.object({
  startsAtList: z.array(z.string().datetime()).min(1).max(50),
})

export const updateServiceSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().min(1).max(300).optional(),
  durationLabel: z.string().trim().min(1).max(40).optional(),
  priceCents: z.number().int().min(0).max(100000).optional(),
})

export const createBookingSchema = z.object({
  slotId: z.string().min(1),
  serviceId: z.string().min(1),
  customerName: z.string().trim().min(2).max(100),
  customerPhone: z.string().trim().min(6).max(30),
  notes: z.string().trim().max(500).optional(),
})
