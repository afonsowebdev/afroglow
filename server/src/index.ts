import 'express-async-errors'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import { isHosted } from './lib/env.js'
import { sendDueBookingReminders } from './lib/reminders.js'
import { accountRouter } from './routes/account.js'
import { adminMaintenanceRouter } from './routes/admin-maintenance.js'
import { adminAvailabilityRouter, availabilityRouter } from './routes/availability.js'
import { authRouter } from './routes/auth.js'
import { adminBookingsRouter, bookingsRouter } from './routes/bookings.js'
import { pushRouter } from './routes/push.js'
import { registerRouter } from './routes/register.js'
import { adminServicesRouter, servicesRouter } from './routes/services.js'
import { adminTestimonialsRouter, testimonialsRouter } from './routes/testimonials.js'

const app = express()

// Behind a reverse proxy in production, req.ip would otherwise resolve to the
// proxy's own address for every request — which would make the /api/auth/register
// IP rate limit apply to all users collectively instead of per client.
if (isHosted) {
  app.set('trust proxy', 1)
}

// The admin app is a Capacitor iOS shell, not a browser tab — it makes its
// API requests from the `capacitor://localhost` origin (iOS) rather than the
// site's own domain, so that origin needs to be allowed alongside FRONTEND_URL.
// FRONTEND_URL itself accepts a comma-separated list, since the apex domain
// (afroglow.pt) redirects to www at the CDN level — a browser tab on either
// one can end up making the actual fetch from either origin.
const allowedOrigins = (process.env.FRONTEND_URL ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
  .concat(['capacitor://localhost', 'ionic://localhost'])

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }
      callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
  }),
)
app.use(express.json())
app.use(cookieParser())

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.use('/api/auth', authRouter)
app.use('/api/auth', registerRouter)
app.use('/api/services', servicesRouter)
app.use('/api/admin/services', adminServicesRouter)
app.use('/api/availability', availabilityRouter)
app.use('/api/admin/availability', adminAvailabilityRouter)
app.use('/api/bookings', bookingsRouter)
app.use('/api/admin/bookings', adminBookingsRouter)
app.use('/api/admin/push-token', pushRouter)
app.use('/api/account', accountRouter)
app.use('/api/testimonials', testimonialsRouter)
app.use('/api/admin/testimonials', adminTestimonialsRouter)
app.use('/api/admin/maintenance', adminMaintenanceRouter)

// Unknown API paths and thrown errors (e.g. a blocked CORS origin) would
// otherwise come back as Express's HTML error page, which the frontend can't
// parse into a message.
app.use((_req, res) => {
  res.status(404).json({ error: 'Recurso não encontrado.' })
})
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[server] unhandled error:', error)
  res.status(error.message === 'Not allowed by CORS' ? 403 : 500).json({ error: 'Erro no servidor.' })
})

// Last-resort guards: log instead of letting a stray rejection kill the whole
// process (which the host reports to clients as a 502 until it restarts).
process.on('unhandledRejection', (reason) => {
  console.error('[server] unhandled rejection:', reason)
})
process.on('uncaughtException', (error) => {
  console.error('[server] uncaught exception:', error)
})

const port = Number(process.env.PORT) || 3001
app.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`)
})

// Runs inside this same process instead of a separate scheduled service —
// Render Cron Jobs require their own paid instance, while this reuses the
// web service's already-running (already-paid-for) compute.
const REMINDER_CHECK_INTERVAL_MS = 15 * 60 * 1000
setInterval(() => {
  sendDueBookingReminders().catch((error) => console.error('[reminders] falha ao verificar lembretes:', error))
}, REMINDER_CHECK_INTERVAL_MS)
setTimeout(() => {
  sendDueBookingReminders().catch((error) => console.error('[reminders] falha ao verificar lembretes:', error))
}, 30_000)
