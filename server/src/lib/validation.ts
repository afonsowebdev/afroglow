import { z } from 'zod'
import { pricingSchema } from './pricing.js'
import { BRAID_COLORS } from './braid-colors.js'

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
  pricing: pricingSchema.nullable().optional(),
  active: z.boolean().optional(),
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().min(1).max(300).optional(),
  durationLabel: z.string().trim().min(1).max(40).optional(),
  priceCents: z.number().int().min(0).max(100000).optional(),
})

export const createServiceSchema = z.object({
  pricing: pricingSchema.nullable().optional(),
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
  // The options picked when the hairstyle is priced by length and/or parting.
  length: z.string().trim().max(30).optional(),
  parting: z.string().trim().max(30).optional(),
  // The braiding-hair colour, by code; required for customers' bookings.
  color: z.string().refine((c) => c in BRAID_COLORS, 'Cor inválida.'),
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

export const reminderChannelSchema = z.object({
  channel: z.enum(['EMAIL', 'PHONE']),
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
  length: z.string().trim().max(30).optional(),
  parting: z.string().trim().max(30).optional(),
  color: z.string().refine((c) => c in BRAID_COLORS, 'Cor inválida.').optional(),
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

export const adminResetPasswordSchema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/, 'O código deve ter exatamente 6 dígitos.'),
  newPassword: z.string().min(8, 'A nova password deve ter pelo menos 8 caracteres.').max(100),
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

export const adminProfileSchema = z
  .object({
    name: z.string().trim().max(60, 'O nome pode ter até 60 caracteres.').optional(),
    notifyNewBookings: z.boolean().optional(),
  })
  .strict()

/** A small square photo the app prepares (the admin's avatar). */
export const avatarSchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  data: z.string().min(100).max(420_000),
})

const permissionList = z.array(z.string()).max(20)

export const createTeamMemberSchema = z.object({
  name: z.string().trim().min(1, 'Indica o nome.').max(60),
  email: emailSchema,
  password: z.string().min(8, 'A password deve ter pelo menos 8 caracteres.').max(100),
  role: z.enum(['OWNER', 'STAFF']),
  permissions: permissionList,
})

export const updateTeamMemberSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    role: z.enum(['OWNER', 'STAFF']).optional(),
    permissions: permissionList.optional(),
  })
  .strict()

export const teamPasswordSchema = z.object({
  password: z.string().min(8, 'A password deve ter pelo menos 8 caracteres.').max(100),
})

const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.')

export const closedPeriodSchema = z
  .object({
    startDate: dateKeySchema,
    endDate: dateKeySchema,
    reason: z.string().trim().max(120).default(''),
    /** What happens to the bookings already made on those days: kept, or cancelled with a message to the client. */
    bookings: z.enum(['KEEP', 'CANCEL']).default('KEEP'),
    message: z.string().trim().max(300).optional(),
  })
  .refine((p) => p.startDate <= p.endDate, 'O último dia não pode ser antes do primeiro.')

export const promotionSchema = z
  .object({
    title: z.string().trim().min(2, 'Dá um nome à promoção.').max(60),
    percentOff: z.number().int().min(1, 'O desconto vai de 1 a 90%.').max(90, 'O desconto vai de 1 a 90%.'),
    /** null: every hairstyle. */
    serviceId: z.string().min(1).nullable(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    active: z.boolean().default(true),
  })
  .refine((p) => p.startsAt < p.endsAt, 'O fim tem de ser depois do início.')

export const broadcastSchema = z
  .object({
    title: z.string().trim().min(2, 'Escreve um título.').max(60),
    body: z.string().trim().min(2, 'Escreve a mensagem.').max(300),
    audience: z.enum(['ALL', 'SELECTED']),
    customerIds: z.array(z.string().min(1)).max(2000).optional(),
  })
  .refine((b) => b.audience === 'ALL' || (b.customerIds?.length ?? 0) > 0, 'Escolhe pelo menos uma cliente.')

export const customerPhotoSchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  // base64 of the (already resized) photo; roughly 2 MB of binary at most
  data: z.string().min(100).max(2_800_000),
  caption: z.string().trim().max(120).default(''),
})
