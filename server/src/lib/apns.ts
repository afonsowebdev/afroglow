import http2 from 'node:http2'
import jwt from 'jsonwebtoken'
import { prisma } from './prisma.js'

const teamId = process.env.APNS_TEAM_ID
const keyId = process.env.APNS_KEY_ID
const privateKey = process.env.APNS_PRIVATE_KEY?.replace(/\\n/g, '\n')
const ADMIN_BUNDLE_ID = 'com.afroglow.app2'
const CUSTOMER_BUNDLE_ID = 'pt.afroglow.app'
const bundleId = ADMIN_BUNDLE_ID
const PRODUCTION_HOST = 'api.push.apple.com'
const SANDBOX_HOST = 'api.sandbox.push.apple.com'
// Apps installed from Xcode use sandbox tokens, App Store / TestFlight builds use production ones.
// The configured host is tried first and the other one is the fallback (see sendToToken).
const apnsHost = process.env.APNS_PRODUCTION === 'true' ? PRODUCTION_HOST : SANDBOX_HOST

let cachedToken: { token: string; issuedAt: number } | null = null

// APNs provider tokens are meant to be reused for ~an hour, not re-signed per push.
function getProviderToken(): string | null {
  if (!teamId || !keyId || !privateKey) return null
  const now = Math.floor(Date.now() / 1000)
  if (cachedToken && now - cachedToken.issuedAt < 55 * 60) {
    return cachedToken.token
  }
  const token = jwt.sign({ iss: teamId, iat: now }, privateKey, { algorithm: 'ES256', keyid: keyId })
  cachedToken = { token, issuedAt: now }
  return token
}

function sendOnce(
  host: string,
  deviceToken: string,
  topic: string,
  providerToken: string,
  payload: object,
): Promise<{ status: number; reason: string }> {
  return new Promise((resolve) => {
    const client = http2.connect(`https://${host}`)
    client.on('error', (error) => {
      console.error('[apns] connection error:', error)
      resolve({ status: 0, reason: 'connection' })
    })

    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      authorization: `bearer ${providerToken}`,
      'apns-topic': topic,
      'apns-push-type': 'alert',
      'apns-priority': '10',
    })

    let responseBody = ''
    let status = 0
    req.setEncoding('utf8')
    req.on('response', (headers) => {
      status = Number(headers[':status'] ?? 0)
    })
    req.on('data', (chunk: string) => {
      responseBody += chunk
    })
    req.on('end', () => {
      client.close()
      let reason = ''
      try {
        reason = (JSON.parse(responseBody) as { reason?: string }).reason ?? ''
      } catch {
        // empty body on success
      }
      resolve({ status, reason })
    })
    req.on('error', (error) => {
      console.error('[apns] request error:', error)
      client.close()
      resolve({ status: 0, reason: 'request' })
    })

    req.write(JSON.stringify(payload))
    req.end()
  })
}

async function sendToToken(
  deviceToken: string,
  title: string,
  body: string,
  topic: string = ADMIN_BUNDLE_ID,
  data: Record<string, string> = {},
  badge = 1,
): Promise<{ token: string; status: number }> {
  const providerToken = getProviderToken()
  if (!providerToken) return { token: deviceToken, status: 0 }

  // The number on the app icon: notifications this iPhone has received and not opened yet.
  const aps = { alert: { title, body }, sound: 'default', badge }
  const payload = { aps, ...data }
  let result = await sendOnce(apnsHost, deviceToken, topic, providerToken, payload)
  // A token from the other environment (Xcode vs App Store build) is "BadDeviceToken" here: try the other host.
  if (result.status === 400 && result.reason === 'BadDeviceToken') {
    const other = apnsHost === PRODUCTION_HOST ? SANDBOX_HOST : PRODUCTION_HOST
    result = await sendOnce(other, deviceToken, topic, providerToken, payload)
  }
  if (result.status !== 200) {
    console.error(`[apns] push failed (${result.status} ${result.reason}) for a device token`)
  }
  // 410 / BadDeviceToken / Unregistered: the token is dead and should be deleted by the caller.
  const dead = result.status === 410 || (result.status === 400 && result.reason === 'BadDeviceToken')
  return { token: deviceToken, status: dead ? 410 : result.status }
}

/** Temporary diagnostic helper — reports exactly what Apple said, instead of just logging server-side. */
export async function sendTestPushAndReport() {
  const configured = { teamId: Boolean(teamId), keyId: Boolean(keyId), privateKey: Boolean(privateKey) }
  if (!teamId || !keyId || !privateKey) {
    return { configured, error: 'APNs credentials missing on this server' }
  }

  let providerToken: string | null
  try {
    providerToken = getProviderToken()
  } catch (error) {
    return { configured, error: `Failed to sign provider JWT: ${error instanceof Error ? error.message : String(error)}` }
  }

  const tokens = await prisma.pushToken.findMany()
  if (tokens.length === 0) {
    return { configured, error: 'No device tokens registered' }
  }

  const results = await Promise.all(
    tokens.map((t) => sendToToken(t.token, 'Teste de diagnóstico', 'Se vires isto, funciona!')),
  )

  return { configured, apnsHost, bundleId, teamId, keyId, hadProviderToken: Boolean(providerToken), results }
}

export async function sendBookingPushNotification(booking: { customerName: string; serviceName: string }) {
  if (!teamId || !keyId || !privateKey) {
    console.warn('[apns] Push ignorado: APNS_TEAM_ID, APNS_KEY_ID ou APNS_PRIVATE_KEY não configurados.')
    return
  }

  try {
    const tokens = await prisma.pushToken.findMany()
    if (tokens.length === 0) return

    const results = await Promise.all(
      tokens.map(async (t) => {
        const { badge } = await prisma.pushToken.update({ where: { id: t.id }, data: { badge: { increment: 1 } } })
        return sendToToken(t.token, 'Nova marcação', `${booking.customerName} pediu ${booking.serviceName}`, ADMIN_BUNDLE_ID, {}, badge)
      }),
    )

    // 410 = device unregistered (app uninstalled, token expired) — Apple's
    // own signal to stop sending to it. Clean those up so they don't pile up.
    const deadTokens = results.filter((r) => r.status === 410).map((r) => r.token)
    if (deadTokens.length > 0) {
      await prisma.pushToken.deleteMany({ where: { token: { in: deadTokens } } })
    }
  } catch (error) {
    console.error('[apns] Falha ao enviar push de marcação:', error)
  }
}

/** Pushes a message to every iPhone a customer has the app on. No-ops when APNs isn't configured. */
export async function sendCustomerPush(customerId: string, title: string, body: string, data: Record<string, string> = {}) {
  if (!teamId || !keyId || !privateKey) return
  try {
    const tokens = await prisma.customerPushToken.findMany({ where: { customerId } })
    if (tokens.length === 0) return
    const results = await Promise.all(
      tokens.map(async (t) => {
        const { badge } = await prisma.customerPushToken.update({ where: { id: t.id }, data: { badge: { increment: 1 } } })
        return sendToToken(t.token, title, body, CUSTOMER_BUNDLE_ID, data, badge)
      }),
    )
    const dead = results.filter((r) => r.status === 410).map((r) => r.token)
    if (dead.length > 0) await prisma.customerPushToken.deleteMany({ where: { token: { in: dead } } })
  } catch (error) {
    console.error('[apns] Falha ao enviar push ao cliente:', error)
  }
}
