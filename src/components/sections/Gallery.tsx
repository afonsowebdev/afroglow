import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { ImageGallery, ImageGrid, type ImageGalleryItem } from '@/components/ui/image-gallery'
import { MotionButton } from '@/components/ui/motion-button'
import { instagramDmUrl } from '@/lib/site-config'

const featuredItems: ImageGalleryItem[] = [
  { alt: 'Box braids longas com acabamento dourado' },
  { alt: 'Detalhe de cornrows geométricas' },
  { alt: 'Knotless braids em movimento' },
  { alt: 'Fulani braids com contas' },
  { alt: 'Goddess braids volumosas' },
  { alt: 'Feed-in braids acabamento natural' },
]

const moreItems: ImageGalleryItem[] = [
  { alt: 'Penteado finalizado em estúdio' },
  { alt: 'Cliente sorrindo após sessão' },
  { alt: 'Tranças com acabamento brilhante' },
  { alt: 'Detalhe de contas douradas nas pontas' },
  { alt: 'Styling de box braids em ambiente natural' },
  { alt: 'Cliente com penteado protetor completo' },
]

export default function Gallery() {
  const [showMore, setShowMore] = useState(false)

  return (
    <section id="galeria" className="bg-cream px-5 py-24 sm:px-8 md:py-32">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center font-logo text-4xl sm:text-5xl">O nosso trabalho</h2>

        <div className="mt-16">
          <ImageGallery items={featuredItems} />
        </div>

        <AnimatePresence>
          {showMore && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="mt-4">
                <ImageGrid items={moreItems} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-14 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          {showMore ? (
            <MotionButton
              label="Ver menos"
              variant="secondary"
              icon={<i className="bx bx-chevron-up text-xl" aria-hidden="true" />}
              onClick={() => setShowMore(false)}
            />
          ) : (
            <MotionButton label="Ver mais imagens" variant="secondary" onClick={() => setShowMore(true)} />
          )}
          <MotionButton
            label="Ver no Instagram"
            variant="primary"
            className="w-60"
            icon={<i className="bx bxl-instagram text-lg" aria-hidden="true" />}
            href={instagramDmUrl()}
            target="_blank"
            rel="noreferrer"
          />
        </div>
      </div>
    </section>
  )
}
