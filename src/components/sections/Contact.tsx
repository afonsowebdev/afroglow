import { Button } from '@/components/ui/button'
import { instagramDmUrl, whatsappUrl } from '@/lib/site-config'

export default function Contact() {
  return (
    <section id="contacto" className="bg-white px-5 py-24 sm:px-8 md:py-32">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <h2 className="font-logo text-4xl sm:text-5xl">
          Pronta para a tua transformação?
        </h2>
        <p className="mt-5 font-subtitle text-lg font-light text-muted-dark">Marca a tua sessão agora.</p>

        <div className="mt-10 flex w-full flex-col gap-4 sm:w-auto sm:flex-row">
          <Button asChild>
            <a href={instagramDmUrl()} target="_blank" rel="noreferrer">
              <i className="bx bxl-instagram text-lg" aria-hidden="true" />
              Contactar no Instagram
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a
              href={whatsappUrl('Olá! Gostaria de marcar uma sessão de tranças.')}
              target="_blank"
              rel="noreferrer"
            >
              <i className="bx bxl-whatsapp text-lg" aria-hidden="true" />
              Enviar mensagem
            </a>
          </Button>
        </div>
      </div>
    </section>
  )
}
