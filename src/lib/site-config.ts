export const siteConfig = {
  name: 'AFROGLOW',
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

/** Builds a wa.me link from a customer-entered phone number (assumes PT if no country code was typed). */
export function customerWhatsappUrl(rawPhone: string, message: string) {
  const digits = rawPhone.replace(/\D/g, '')
  const withCountryCode = digits.startsWith('351') ? digits : `351${digits}`
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${withCountryCode}?text=${encoded}`
}
