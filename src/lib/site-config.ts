/**
 * Business contact data. Everything optional below is hidden on the site and in the app
 * until it is filled in, so no placeholder is ever shown to customers.
 */
export const siteConfig = {
  name: 'AFROGLOW',
  instagramHandle: 'afroogloww',
  instagramUrl: 'https://www.instagram.com/afroogloww',
  location: 'Portugal',
  email: 'geral@afroglow.pt',

  // TODO(cliente): fill these in — each one switches on the matching button/section.
  /** International format, digits only, e.g. '351912345678'. */
  whatsappNumber: '351967022608',
  /** Public phone number, e.g. '+351 912 345 678'. */
  phone: '',
  /** Street address, e.g. 'Rua Exemplo 12, 4000-000 Porto'. */
  address: '',
  /** Link to the place on a map (Google Maps / Apple Maps "share" link). */
  mapUrl: '',
  /** Opening hours, e.g. [{ days: 'Terça a sábado', hours: '09:00 – 18:00' }]. */
  openingHours: [] as Array<{ days: string; hours: string }>,
  /** The business's cancellation policy, in its own words. Shown before a booking is confirmed. */
  cancellationPolicy: '',
}

export const hasWhatsapp = siteConfig.whatsappNumber.replace(/\D/g, '').length >= 9

export function instagramDmUrl() {
  return siteConfig.instagramUrl
}

export function whatsappUrl(message: string) {
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${siteConfig.whatsappNumber.replace(/\D/g, '')}?text=${encoded}`
}

/** Builds a wa.me link from a customer-entered phone number (assumes PT if no country code was typed). */
export function customerWhatsappUrl(rawPhone: string, message: string) {
  const digits = rawPhone.replace(/\D/g, '')
  const withCountryCode = digits.startsWith('351') ? digits : `351${digits}`
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${withCountryCode}?text=${encoded}`
}
