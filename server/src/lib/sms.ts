/**
 * Text messages through Twilio's REST API (no SDK). Needs TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and a sender in
 * TWILIO_FROM (a number, or a name such as "AFROGLOW" where the country allows it). Without them nothing is sent.
 */
const sid = process.env.TWILIO_ACCOUNT_SID
const token = process.env.TWILIO_AUTH_TOKEN
const from = process.env.TWILIO_FROM ?? 'AFROGLOW'

export const smsConfigured = () => Boolean(sid && token)

/** "912 345 678", "+351 912345678" or "00351912345678" -> "+351912345678". Null when it does not look like a phone. */
export function toE164(phone: string, defaultCountry = '351') {
  const digits = phone.replace(/[\s().-]/g, '')
  if (/^\+\d{8,15}$/.test(digits)) return digits
  if (/^00\d{8,15}$/.test(digits)) return `+${digits.slice(2)}`
  if (/^[29]\d{8}$/.test(digits)) return `+${defaultCountry}${digits}`
  return null
}

/** Sends one text message. Returns true when Twilio accepted it. */
export async function sendSms(phone: string, body: string) {
  const to = toE164(phone)
  if (!sid || !token || !to) return false
  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    })
    if (!response.ok) {
      console.error(`[sms] Twilio recusou a mensagem (${response.status}): ${await response.text()}`)
      return false
    }
    return true
  } catch (error) {
    console.error('[sms] falha ao enviar mensagem:', error)
    return false
  }
}
