import { Router } from 'express'
import { requireAdmin } from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'

export const testimonialsRouter = Router()

testimonialsRouter.get('/', async (_req, res) => {
  const testimonials = await prisma.testimonial.findMany({
    where: { status: 'APPROVED' },
    include: { customer: { select: { name: true, avatarType: true, avatarUpdatedAt: true } } },
    orderBy: { createdAt: 'desc' },
  })
  // The photo itself is served by /:id/photo; here only whether there is one (and a cache-busting version).
  res.json(
    testimonials.map(({ customer, ...testimonial }) => ({
      ...testimonial,
      customer: { name: customer.name },
      photo: testimonial.showPhoto && customer.avatarType ? (customer.avatarUpdatedAt?.getTime() ?? 1) : null,
    })),
  )
})

// The photo of an approved testimonial whose author chose to show it.
testimonialsRouter.get('/:id/photo', async (req, res) => {
  const testimonial = await prisma.testimonial.findUnique({
    where: { id: req.params.id },
    select: { status: true, showPhoto: true, customer: { select: { avatar: true, avatarType: true } } },
  })
  const { avatar, avatarType } = testimonial?.customer ?? {}
  if (!testimonial || testimonial.status !== 'APPROVED' || !testimonial.showPhoto || !avatar || !avatarType) {
    res.status(404).end()
    return
  }
  res.set({
    'Content-Type': avatarType,
    'Cache-Control': 'public, max-age=86400',
    'Cross-Origin-Resource-Policy': 'cross-origin',
  })
  res.end(Buffer.from(avatar))
})

export const adminTestimonialsRouter = Router()
adminTestimonialsRouter.use(requireAdmin)

adminTestimonialsRouter.get('/', async (_req, res) => {
  const testimonials = await prisma.testimonial.findMany({
    include: { customer: { select: { name: true, avatarType: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(
    testimonials.map(({ customer, ...testimonial }) => ({
      ...testimonial,
      customer: { name: customer.name },
      // Whether the author wants the photo shown and actually has one.
      photo: testimonial.showPhoto && !!customer.avatarType,
    })),
  )
})

// The author's photo as a data URL, so the admin can look at it before approving.
adminTestimonialsRouter.get('/:id/photo', async (req, res) => {
  const testimonial = await prisma.testimonial.findUnique({
    where: { id: req.params.id },
    select: { customer: { select: { avatar: true, avatarType: true } } },
  })
  const { avatar, avatarType } = testimonial?.customer ?? {}
  res.json({ dataUrl: avatar && avatarType ? `data:${avatarType};base64,${Buffer.from(avatar).toString('base64')}` : null })
})

adminTestimonialsRouter.post('/:id/approve', async (req, res) => {
  await resolveTestimonial(req.params.id, 'APPROVED', res)
})

adminTestimonialsRouter.post('/:id/reject', async (req, res) => {
  await resolveTestimonial(req.params.id, 'REJECTED', res)
})

async function resolveTestimonial(id: string, status: 'APPROVED' | 'REJECTED', res: import('express').Response) {
  try {
    const testimonial = await prisma.testimonial.findUnique({ where: { id } })
    if (!testimonial) {
      res.status(404).json({ error: 'Testemunho não encontrado.' })
      return
    }
    // A decision can be revisited (unpublish an approved one, publish a rejected one);
    // only repeating the current state is refused.
    if (testimonial.status === status) {
      res.status(400).json({
        error: status === 'APPROVED' ? 'Este testemunho já está publicado.' : 'Este testemunho já foi recusado.',
      })
      return
    }

    const updated = await prisma.testimonial.update({ where: { id }, data: { status } })
    res.json(updated)
  } catch (error) {
    console.error('[testimonials] resolve failed:', error)
    res.status(500).json({ error: 'Erro ao atualizar testemunho.' })
  }
}
