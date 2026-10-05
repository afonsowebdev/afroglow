import { z } from 'zod'

// Emails are case-insensitive in practice; normalise so "Maria@x.com" at signup
// and "maria@x.com" at login are the same account.
const emailSchema = z.string().trim().toLowerCase().email()

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
})

export const createSlotSchema = z.object({
  startsAt: z.string().datetime(),
})

export const createSlotsBatchSchema = z.object({
  startsAtList: z.array(z.string().datetime()).min(1).max(300),
})

export const updateServiceSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().min(1).max(300).optional(),
  durationLabel: z.string().trim().min(1).max(40).optional(),
  priceCents: z.number().int().min(0).max(100000).optional(),
})

export const createServiceSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(300),
  durationLabel: z.string().trim().min(1).max(40),
  priceCents: z.number().int().min(0).max(100000),
})

export const registerPushTokenSchema = z.object({
  token: z.string().trim().min(10).max(500),
})

export const createBookingSchema = z.object({
  slotId: z.string().min(1),
  serviceId: z.string().min(1),
  customerName: z.string().trim().min(2).max(100),
  customerPhone: z.string().trim().min(6).max(30),
  notes: z.string().trim().max(500).optional(),
})

const strongPasswordSchema = z
  .string()
  .min(8, 'A password deve ter pelo menos 8 caracteres.')
  .max(100)
  .regex(/[A-Z]/, 'A password deve ter pelo menos 1 letra maiúscula.')
  .regex(/[0-9]/, 'A password deve ter pelo menos 1 número.')
  .regex(/[^A-Za-z0-9]/, 'A password deve ter pelo menos 1 caractere especial.')

export const registerStartSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  phone: z.string().trim().min(6).max(30),
  password: strongPasswordSchema,
})

export const verifyEmailSchema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/, 'O código deve ter exatamente 6 dígitos.'),
})

export const resendCodeSchema = z.object({
  email: emailSchema,
})

export const rescheduleBookingSchema = z.object({
  slotId: z.string().min(1),
})

export const createTestimonialSchema = z.object({
  content: z.string().trim().min(10).max(600),
  showPhoto: z.boolean().optional(),
})

export const clearMonthSchema = z.object({
  password: z.string().min(1),
})

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(6).max(30),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: strongPasswordSchema,
})

export const deleteCustomersSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
  password: z.string().min(1),
})

export const deleteAccountSchema = z.object({
  password: z.string().min(1),
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/, 'O código deve ter exatamente 6 dígitos.'),
  newPassword: strongPasswordSchema,
})

export const businessSettingsSchema = z.object({
  whatsappNumber: z.string().trim().max(20).regex(/^\d*$/, 'Só dígitos, com indicativo (ex.: 351912345678).'),
  phone: z.string().trim().max(30),
  address: z.string().trim().max(200),
  mapUrl: z.string().trim().max(500).refine((v) => v === '' || /^https?:\/\//i.test(v), 'O link do mapa deve começar por https://'),
  openingHours: z
    .array(z.object({ days: z.string().trim().min(1).max(60), hours: z.string().trim().min(1).max(60) }))
    .max(10),
  cancellationPolicy: z.string().trim().max(600),
})

export const manualBookingSchema = z.object({
  startsAt: z.string().datetime(),
  serviceId: z.string().min(1),
  // Either an existing client, or the name + phone of someone without an account.
  customerId: z.string().min(1).optional(),
  customerName: z.string().trim().min(2).max(100).optional(),
  customerPhone: z.string().trim().min(6).max(30).optional(),
  notes: z.string().trim().max(500).optional(),
})

export const rejectBookingSchema = z.object({
  reason: z.string().trim().max(300).optional(),
})

export const customerNotesSchema = z.object({
  adminNotes: z.string().trim().max(1000),
})

export const adminChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
})

export const customerPushTokenSchema = z.object({
  token: z.string().trim().min(10).max(500),
})

export const serviceImageSchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  // base64 of the (already resized) image; roughly 4 MB of binary at most
  data: z.string().min(100).max(5_600_000),
})
