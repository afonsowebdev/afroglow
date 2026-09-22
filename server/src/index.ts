import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { adminAvailabilityRouter, availabilityRouter } from './routes/availability.js'
import { authRouter } from './routes/auth.js'
import { adminBookingsRouter, bookingsRouter } from './routes/bookings.js'
import { adminServicesRouter, servicesRouter } from './routes/services.js'

const app = express()

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }))
app.use(express.json())
app.use(cookieParser())

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.use('/api/auth', authRouter)
app.use('/api/services', servicesRouter)
app.use('/api/admin/services', adminServicesRouter)
app.use('/api/availability', availabilityRouter)
app.use('/api/admin/availability', adminAvailabilityRouter)
app.use('/api/bookings', bookingsRouter)
app.use('/api/admin/bookings', adminBookingsRouter)

const port = Number(process.env.PORT) || 3001
app.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`)
  if (process.env.SKIP_ADMIN_AUTH === 'true') {
    console.warn('[server] ⚠️  SKIP_ADMIN_AUTH is ON — admin routes are unprotected. Do not expose this publicly.')
  }
})
