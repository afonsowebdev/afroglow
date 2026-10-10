import { useEffect, useState } from 'react'
import { api, assetUrl } from '@/lib/api'

export interface WorkItem {
  key: string
  kind: 'IMAGE' | 'VIDEO'
  src: string
  alt: string
}

export type PortfolioFilter = 'todos' | 'IMAGE' | 'VIDEO'

// Fetched once per visit: the home page preview and the portfolio page share it.
let request: Promise<WorkItem[] | null> | null = null
function loadPortfolio() {
  request ??= api
    .get<Array<{ id: string; kind: 'IMAGE' | 'VIDEO' }>>('/portfolio')
    .then((list) =>
      list.map((item) => ({
        key: item.id,
        kind: item.kind as WorkItem['kind'],
        src: assetUrl(`/portfolio/${item.id}/file`),
        alt: item.kind === 'VIDEO' ? 'Vídeo do nosso trabalho' : 'Foto do nosso trabalho',
      })),
    )
    .catch(() => null)
  return request
}

/**
 * The studio's photos and videos, added in the admin app (Portfólio), with how many of each. `loaded` stays false
 * until the list has arrived, so an empty portfolio is only announced once it really is empty.
 */
export function usePortfolio() {
  const [items, setItems] = useState<WorkItem[]>([])
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    let live = true
    void loadPortfolio().then((list) => {
      if (!live) return
      if (list) setItems(list)
      setLoaded(true)
    })
    return () => {
      live = false
    }
  }, [])
  const photoCount = items.filter((i) => i.kind === 'IMAGE').length
  const videoCount = items.length - photoCount
  return { items, loaded, photoCount, videoCount, hasBoth: photoCount > 0 && videoCount > 0 }
}
