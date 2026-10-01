// Render sets RENDER=true on its services. Relying on NODE_ENV alone meant a
// missing/removed NODE_ENV silently switched off both trust-proxy (breaking the
// per-IP rate limits) and cross-site cookies (breaking admin sessions).
export const isHosted = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true'
