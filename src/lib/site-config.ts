export const siteConfig = {
  name: 'AfroGlow',
  instagramHandle: 'afroogloww',
  instagramUrl: 'https://www.instagram.com/afroogloww',
  // TODO(cliente): substituir pelo número real, formato internacional sem espaços (ex: 351912345678)
  whatsappNumber: '351900000000',
  location: 'Portugal',
}

export function instagramDmUrl() {
  return siteConfig.instagramUrl
}

export function whatsappUrl(message: string) {
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${siteConfig.whatsappNumber}?text=${encoded}`
}
