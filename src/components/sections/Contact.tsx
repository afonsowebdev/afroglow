import { ImageStreamHero, type StreamImage } from '@/components/ui/image-stream-hero'
import { MotionButton } from '@/components/ui/motion-button'
import { instagramDmUrl, whatsappUrl } from '@/lib/site-config'

const PLACEHOLDER_IMAGES: StreamImage[] = Array.from({ length: 6 }, (_, index) => ({
  alt: `Em breve ${index + 1}`,
}))

export default function Contact() {
  return (
    <section
      id="contacto"
      className="relative flex min-h-[640px] items-center overflow-hidden bg-white px-5 py-32 sm:min-h-[760px] sm:px-8 sm:py-40 md:py-48"
    >
      <ImageStreamHero images={PLACEHOLDER_IMAGES} className="absolute inset-0" />

      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center text-center">
        <h2 className="font-logo text-4xl sm:text-5xl">Pronta para a tua transformação?</h2>
        <p className="mt-5 font-subtitle text-lg font-light text-muted-dark">Marca a tua sessão agora.</p>

        <div className="mt-10 flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row">
          <MotionButton
            label="Contactar no Instagram"
            variant="primary"
            icon={<i className="bx bxl-instagram text-lg" aria-hidden="true" />}
            href={instagramDmUrl()}
            target="_blank"
            rel="noreferrer"
          />
          <MotionButton
            label="Enviar mensagem"
            variant="secondary"
            icon={<i className="bx bxl-whatsapp text-lg" aria-hidden="true" />}
            href={whatsappUrl('Olá! Gostaria de marcar uma sessão de tranças.')}
            target="_blank"
            rel="noreferrer"
          />
        </div>
      </div>
    </section>
  )
}
