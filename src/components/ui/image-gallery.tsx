import { cn } from '@/lib/utils'

export interface ImageGalleryItem {
  src?: string
  alt: string
}

interface ImageGalleryProps {
  items: ImageGalleryItem[]
  className?: string
}

function GalleryTile({ item }: { item: ImageGalleryItem }) {
  return (
    <>
      {item.src ? (
        <img
          src={item.src}
          alt={item.alt}
          loading="lazy"
          className="h-full w-full object-cover object-center"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center bg-muted/30"
          role="img"
          aria-label={item.alt}
        >
          <i className="bx bx-image text-2xl text-onyx/30" aria-hidden="true" />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gold/0 transition-colors duration-300 group-hover:bg-gold/10" />
    </>
  )
}

export function ImageGrid({ items, className }: ImageGalleryProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4', className)}>
      {items.map((item, idx) => (
        <div key={idx} className="group relative aspect-square overflow-hidden rounded-sm">
          <GalleryTile item={item} />
        </div>
      ))}
    </div>
  )
}

export function ImageGallery({ items, className }: ImageGalleryProps) {
  return (
    <div className={cn(className)}>
      <div className="grid grid-cols-2 gap-3 md:hidden">
        {items.map((item, idx) => (
          <div key={idx} className="group relative aspect-square overflow-hidden rounded-sm">
            <GalleryTile item={item} />
          </div>
        ))}
      </div>

      <div className="hidden h-[400px] items-stretch gap-2 md:flex">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="group relative h-full w-56 flex-grow overflow-hidden rounded-sm transition-all duration-500 ease-out hover:w-full"
          >
            <GalleryTile item={item} />
          </div>
        ))}
      </div>
    </div>
  )
}
