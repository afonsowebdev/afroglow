import { Router } from 'express'
import { requireAdmin } from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'

export const testimonialsRouter = Router()

testimonialsRouter.get('/', async (_req, res) => {
  const testimonials = await prisma.testimonial.findMany({
    where: { status: 'APPROVED' },
    include: { customer: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(testimonials)
})

export const adminTestimonialsRouter = Router()
adminTestimonialsRouter.use(requireAdmin)

adminTestimonialsRouter.get('/', async (_req, res) => {
  const testimonials = await prisma.testimonial.findMany({
    include: { customer: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(testimonials)
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
    if (testimonial.status !== 'PENDING') {
      res.status(400).json({ error: 'Este testemunho já foi respondido.' })
      return
    }

    const updated = await prisma.testimonial.update({ where: { id }, data: { status } })
    res.json(updated)
  } catch (error) {
    console.error('[testimonials] resolve failed:', error)
    res.status(500).json({ error: 'Erro ao atualizar testemunho.' })
  }
}
