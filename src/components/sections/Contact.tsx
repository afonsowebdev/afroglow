import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { ButtonWithIcon } from '@/components/ui/button-with-icon'
import { LiquidWordmark } from '@/components/ui/liquid-wordmark'
import { useOpeningStatus } from '@/lib/opening-hours'
import { instagramDmUrl, siteConfig, useBusinessInfo, useWhatsapp } from '@/lib/site-config'

type Channel = { icon: string; name: string; href: string; external: boolean }

const pill =
  'flex h-11 items-center gap-2 rounded-full border border-onyx/15 bg-white/70 px-4 font-subtitle text-sm font-medium text-onyx backdrop-blur-sm transition-colors hover:border-onyx/40'

const reveal = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.4 },
  transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
})

export default function Contact() {
  const whatsapp = useWhatsapp()
  const business = useBusinessInfo()
  const { status } = useOpeningStatus(business.openingHours)
  const navigate = useNavigate()

  const channels: Channel[] = [
    ...(whatsapp.enabled
      ? [
          {
            icon: 'bx bxl-whatsapp',
            name: 'WhatsApp',
            href: whatsapp.url('Olá! Gostaria de marcar uma sessão de tranças.'),
            external: true,
          },
        ]
      : []),
    { icon: 'bx bxl-instagram', name: 'Instagram', href: instagramDmUrl(), external: true },
    { icon: 'bx bx-envelope', name: 'Email', href: `mailto:${siteConfig.email}`, external: false },
  ]

  return (
    <section
      id="contacto"
      className="relative flex flex-col items-center overflow-hidden bg-white px-5 py-24 sm:px-8 md:py-32"
    >
      <motion.div
        {...reveal(0)}
        className="relative z-10 order-1 mx-auto flex w-full max-w-xl flex-col items-center text-center"
      >
        <p className="font-subtitle text-xs font-medium uppercase tracking-[0.18em] text-onyx/50">Contacto</p>
        <h2 className="mt-2 font-logo text-4xl text-onyx sm:text-5xl">Pronta para a tua transformação?</h2>
        <p className="mt-4 max-w-md font-subtitle text-base font-light leading-relaxed text-onyx/60">
          Marca online em poucos minutos ou fala connosco. Ajudamos-te a escolher o estilo certo para ti.
        </p>
      </motion.div>

      {/* AFROGLOW made of particles: a finger or the pointer turns it liquid, and it settles back. */}
      <LiquidWordmark className="order-2 my-6 h-[clamp(120px,24vw,320px)] w-full max-w-6xl sm:my-10" />

      <motion.div
        {...reveal(0.1)}
        className="relative z-10 order-3 mx-auto flex w-full max-w-xl flex-col items-center text-center"
      >
        <ButtonWithIcon solid large label="Agendar a minha sessão" onClick={() => navigate('/agendar')} />

        <div className="mt-10 flex w-full items-center gap-3 font-subtitle text-xs text-onyx/55">
          <span className="h-px flex-1 bg-onyx/15" aria-hidden="true" />
          Preferes falar primeiro?
          <span className="h-px flex-1 bg-onyx/15" aria-hidden="true" />
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {channels.map((channel) => (
            <a
              key={channel.name}
              href={channel.href}
              target={channel.external ? '_blank' : undefined}
              rel={channel.external ? 'noreferrer' : undefined}
              className={pill}
            >
              <i className={`${channel.icon} text-lg`} aria-hidden="true" />
              {channel.name}
            </a>
          ))}
        </div>

        {status && (
          <p className="mt-6 inline-flex items-center gap-2.5 font-subtitle text-xs text-onyx/60">
            <span className="relative flex size-2">
              {status.open && (
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/70 motion-reduce:animate-none" />
              )}
              <span className={`relative size-2 rounded-full ${status.open ? 'bg-emerald-500' : 'bg-onyx/30'}`} />
            </span>
            {status.text}
          </p>
        )}
      </motion.div>
    </section>
  )
}
