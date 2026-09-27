import http2 from 'node:http2'
import jwt from 'jsonwebtoken'
import { prisma } from './prisma.js'

const teamId = process.env.APNS_TEAM_ID
const keyId = process.env.APNS_KEY_ID
const privateKey = process.env.APNS_PRIVATE_KEY?.replace(/\\n/g, '\n')
const bundleId = 'com.afroglow.app'
const apnsHost = process.env.APNS_PRODUCTION === 'true' ? 'api.push.apple.com' : 'api.sandbox.push.apple.com'

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

function sendToToken(deviceToken: string, title: string, body: string): Promise<{ token: string; status: number }> {
  const providerToken = getProviderToken()
  if (!providerToken) return Promise.resolve({ token: deviceToken, status: 0 })

  return new Promise((resolve) => {
    const client = http2.connect(`https://${apnsHost}`)
    client.on('error', (error) => {
      console.error('[apns] connection error:', error)
      resolve({ token: deviceToken, status: 0 })
    })

    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      authorization: `bearer ${providerToken}`,
      'apns-topic': bundleId,
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
      if (status !== 200) {
        console.error(`[apns] push failed (${status}) for a device token:`, responseBody)
      }
      client.close()
      resolve({ token: deviceToken, status })
    })
    req.on('error', (error) => {
      console.error('[apns] request error:', error)
      client.close()
      resolve({ token: deviceToken, status: 0 })
    })

    req.write(JSON.stringify({ aps: { alert: { title, body }, sound: 'default', badge: 1 } }))
    req.end()
  })
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
      tokens.map((t) => sendToToken(t.token, 'Nova marcação', `${booking.customerName} pediu ${booking.serviceName}`)),
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
