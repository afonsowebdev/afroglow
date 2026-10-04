import { siteConfig, useBusinessInfo } from '@/lib/site-config'

/**
 * Business details for Google (phone, address, map). Rendered only with what the business has
 * filled in, so search results never show invented information. The static basics live in index.html.
 */
export default function StructuredData() {
  const business = useBusinessInfo()
  if (!business.phone && !business.address && !business.mapUrl) return null

  const data = {
    '@context': 'https://schema.org',
    '@type': 'HairSalon',
    name: siteConfig.name,
    url: 'https://afroglow.pt/',
    image: 'https://afroglow.pt/images/og-image.jpg',
    email: siteConfig.email,
    ...(business.phone && { telephone: business.phone }),
    ...(business.address && {
      address: { '@type': 'PostalAddress', streetAddress: business.address, addressCountry: 'PT' },
    }),
    ...(business.mapUrl && { hasMap: business.mapUrl }),
    sameAs: [siteConfig.instagramUrl],
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}
