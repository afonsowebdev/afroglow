import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { adminAvailabilityRouter, availabilityRouter } from './routes/availability.js'
import { authRouter } from './routes/auth.js'
import { adminBookingsRouter, bookingsRouter } from './routes/bookings.js'
import { adminServicesRouter, servicesRouter } from './routes/services.js'

const app = express()

// The admin app is a Capacitor iOS shell, not a browser tab — it makes its
// API requests from the `capacitor://localhost` origin (iOS) rather than the
// site's own domain, so that origin needs to be allowed alongside FRONTEND_URL.
const allowedOrigins = [process.env.FRONTEND_URL, 'capacitor://localhost', 'ionic://localhost'].filter(
  (origin): origin is string => Boolean(origin),
)

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
app.use('/api/services', servicesRouter)
app.use('/api/admin/services', adminServicesRouter)
app.use('/api/availability', availabilityRouter)
app.use('/api/admin/availability', adminAvailabilityRouter)
app.use('/api/bookings', bookingsRouter)
app.use('/api/admin/bookings', adminBookingsRouter)

const port = Number(process.env.PORT) || 3001
app.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`)
})
