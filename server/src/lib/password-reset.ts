import { createHmac, timingSafeEqual } from 'node:crypto'

// Password-reset codes are derived, not stored: HMAC(server secret, customer id +
// current password hash + 15-minute window), reduced to 6 digits. Because the
// password hash is part of the input, a code stops working the moment the password
// changes (single use), and no database table is needed.
const WINDOW_MS = 15 * 60 * 1000

function secret() {
  const value = process.env.JWT_SECRET
  if (!value) throw new Error('JWT_SECRET environment variable is required')
  return value
}

function codeFor(customer: { id: string; passwordHash: string }, windowIndex: number) {
  const digest = createHmac('sha256', secret())
    .update(`reset:${customer.id}:${customer.passwordHash}:${windowIndex}`)
    .digest()
  return String(digest.readUInt32BE(0) % 1_000_000).padStart(6, '0')
}

export function currentResetCode(customer: { id: string; passwordHash: string }, now = Date.now()) {
  return codeFor(customer, Math.floor(now / WINDOW_MS))
}

/** Accepts the current window and the previous one, so a code is valid for 15–30 minutes. */
export function isValidResetCode(customer: { id: string; passwordHash: string }, code: string, now = Date.now()) {
  const window = Math.floor(now / WINDOW_MS)
  const given = Buffer.from(code)
  return [window, window - 1].some((w) => {
    const expected = Buffer.from(codeFor(customer, w))
    return expected.length === given.length && timingSafeEqual(expected, given)
  })
}
