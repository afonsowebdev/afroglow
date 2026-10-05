import express, { Router } from 'express'
import { requireAdmin } from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'

const MAX_IMAGES = 60
const MAX_VIDEOS = 12
const MAX_VIDEO_BYTES = 40 * 1024 * 1024
const MAX_IMAGE_BYTES = 6 * 1024 * 1024

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const VIDEO_TYPES = ['video/mp4', 'video/quicktime']

export const portfolioRouter = Router()

// List: ids and kinds only, ordered. The files themselves are fetched one by one (and cached for good).
portfolioRouter.get('/', async (_req, res) => {
  const items = await prisma.portfolioItem.findMany({
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, kind: true },
  })
  res.set('Cache-Control', 'public, max-age=60')
  res.json(items)
})

// The file, with HTTP Range support so videos can start playing and seek without downloading everything.
portfolioRouter.get('/:id/file', async (req, res) => {
  const item = await prisma.portfolioItem.findUnique({ where: { id: req.params.id } })
  if (!item) {
    res.status(404).end()
    return
  }
  const data = Buffer.from(item.data)
  res.set({
    'Content-Type': item.contentType,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Cross-Origin-Resource-Policy': 'cross-origin',
  })
  const range = req.headers.range?.match(/^bytes=(\d*)-(\d*)$/)
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, data.length - Number(range[2]))
    const end = range[1] && range[2] ? Math.min(Number(range[2]), data.length - 1) : data.length - 1
    if (start >= data.length || start > end) {
      res.status(416).set('Content-Range', `bytes */${data.length}`).end()
      return
    }
    res.status(206).set({ 'Content-Range': `bytes ${start}-${end}/${data.length}`, 'Content-Length': String(end - start + 1) })
    res.end(data.subarray(start, end + 1))
    return
  }
  res.set('Content-Length', String(data.length))
  res.end(data)
})

export const adminPortfolioRouter = Router()
adminPortfolioRouter.use(requireAdmin)

// Upload: the raw file as the request body (Content-Type tells photo from video).
adminPortfolioRouter.post(
  '/',
  express.raw({ type: [...IMAGE_TYPES, ...VIDEO_TYPES], limit: `${Math.ceil(MAX_VIDEO_BYTES / 1024 / 1024)}mb` }),
  async (req, res) => {
    const contentType = String(req.headers['content-type'] ?? '').split(';')[0]
    const isVideo = VIDEO_TYPES.includes(contentType)
    const isImage = IMAGE_TYPES.includes(contentType)
    const body = req.body as Buffer
    if ((!isVideo && !isImage) || !Buffer.isBuffer(body) || body.length === 0) {
      res.status(400).json({ error: 'Ficheiro inválido (foto JPEG/PNG/WebP ou vídeo MP4/MOV).' })
      return
    }
    if (isImage && body.length > MAX_IMAGE_BYTES) {
      res.status(413).json({ error: 'Foto demasiado grande.' })
      return
    }
    const kind = isVideo ? 'VIDEO' : 'IMAGE'
    const count = await prisma.portfolioItem.count({ where: { kind } })
    if (count >= (isVideo ? MAX_VIDEOS : MAX_IMAGES)) {
      res.status(400).json({
        error: isVideo ? `Máximo de ${MAX_VIDEOS} vídeos.` : `Máximo de ${MAX_IMAGES} fotos.`,
      })
      return
    }
    const last = await prisma.portfolioItem.findFirst({ orderBy: { position: 'desc' }, select: { position: true } })
    const item = await prisma.portfolioItem.create({
      data: { kind, contentType, data: new Uint8Array(body), position: (last?.position ?? -1) + 1 },
      select: { id: true, kind: true },
    })
    res.status(201).json(item)
  },
)

adminPortfolioRouter.delete('/:id', async (req, res) => {
  await prisma.portfolioItem.deleteMany({ where: { id: req.params.id } })
  res.status(204).end()
})

// Brings an item to the front.
adminPortfolioRouter.post('/:id/first', async (req, res) => {
  const first = await prisma.portfolioItem.findFirst({ orderBy: { position: 'asc' }, select: { position: true } })
  const updated = await prisma.portfolioItem.updateMany({
    where: { id: req.params.id },
    data: { position: (first?.position ?? 0) - 1 },
  })
  if (updated.count === 0) {
    res.status(404).json({ error: 'Item não encontrado.' })
    return
  }
  res.status(204).end()
})
