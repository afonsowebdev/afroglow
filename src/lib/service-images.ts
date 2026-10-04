import { assetUrl } from './api'
import type { Service } from './types'

export const serviceImageUrl = (serviceId: string, imageId: string) =>
  assetUrl(`/services/${serviceId}/images/${imageId}`)

/** URLs of a service's photos, cover first. */
export const serviceImageUrls = (service: Service) =>
  (service.images ?? []).map((image) => serviceImageUrl(service.id, image.id))
