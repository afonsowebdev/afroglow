import { useEffect, useState } from 'react'
import { api, assetUrl } from '@/lib/api'

export interface WorkItem {
  key: string
  kind: 'IMAGE' | 'VIDEO'
  src: string
  alt: string
}

export type PortfolioFilter = 'todos' | 'IMAGE' | 'VIDEO'

// Shown until the studio adds its own photos and videos in the admin app (Portfólio), as in the customer app.
const SAMPLE_WORK: WorkItem[] = [
  { src: '/images/hero/hero-1.jpg', alt: 'Knotless braids com pontas cacheadas' },
  { src: '/images/hero/hero-2.jpg', alt: 'Detalhe de knotless braids com pontas cacheadas' },
  { src: '/images/hero/hero-3.jpg', alt: 'Vista lateral de knotless braids com pontas cacheadas' },
  { src: '/images/hero/hero-4.jpg', alt: 'Padrão de repartição triangular em knotless braids' },
  { src: '/images/hero/hero-5.jpg', alt: 'Detalhe do couro cabeludo com repartição triangular' },
].map((photo) => ({ key: photo.src, kind: 'IMAGE', ...photo }))

// Fetched once per visit: the home page preview and the portfolio page share it.
let request: Promise<WorkItem[] | null> | null = null
function loadPortfolio() {
  request ??= api
    .get<Array<{ id: string; kind: 'IMAGE' | 'VIDEO' }>>('/portfolio')
    .then((list) =>
      list.length > 0
        ? list.map((item) => ({
            key: item.id,
            kind: item.kind,
            src: assetUrl(`/portfolio/${item.id}/file`),
            alt: item.kind === 'VIDEO' ? 'Vídeo do nosso trabalho' : 'Foto do nosso trabalho',
          }))
        : null,
    )
    .catch(() => null)
  return request
}

/** The studio's photos and videos (or the sample photos until there are some), with how many of each. */
export function usePortfolio() {
  const [items, setItems] = useState<WorkItem[]>(SAMPLE_WORK)
  useEffect(() => {
    let live = true
    void loadPortfolio().then((list) => live && list && setItems(list))
    return () => {
      live = false
    }
  }, [])
  const photoCount = items.filter((i) => i.kind === 'IMAGE').length
  const videoCount = items.length - photoCount
  return { items, photoCount, videoCount, hasBoth: photoCount > 0 && videoCount > 0 }
}
