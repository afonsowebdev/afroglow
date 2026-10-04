import { useEffect } from 'react'

const DEFAULT_TITLE = 'AFROGLOW | Tranças Afro em Portugal'

/** Sets the browser tab / search-result title for a page, and optionally keeps it out of search results. */
export function usePageTitle(title: string, options: { noindex?: boolean } = {}) {
  const { noindex = false } = options
  useEffect(() => {
    document.title = `${title} | AFROGLOW`
    let robots: HTMLMetaElement | null = null
    if (noindex) {
      robots = document.createElement('meta')
      robots.name = 'robots'
      robots.content = 'noindex'
      document.head.appendChild(robots)
    }
    return () => {
      document.title = DEFAULT_TITLE
      robots?.remove()
    }
  }, [title, noindex])
}
