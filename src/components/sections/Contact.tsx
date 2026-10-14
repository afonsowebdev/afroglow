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

  const statusLine = status && (
    <p className="inline-flex items-center gap-2.5 font-subtitle text-xs text-onyx/60">
      <span className="relative flex size-2">
        {status.open && (
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/70 motion-reduce:animate-none" />
        )}
        <span className={`relative size-2 rounded-full ${status.open ? 'bg-emerald-500' : 'bg-onyx/30'}`} />
      </span>
      {status.text}
    </p>
  )

  return (
    // A whole screen: a thin line with the label and today's status, AFROGLOW in particles across the whole width
    // (two lines on phones, so it can be larger), then the headline on the left and the ways to book on the right.
    <section id="contacto" className="relative flex min-h-[100svh] flex-col overflow-hidden bg-white py-20 md:py-24">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 border-b border-onyx/10 px-5 pb-4 sm:px-8">
        <p className="font-subtitle text-xs font-medium uppercase tracking-[0.18em] text-onyx/50">Contacto</p>
        {statusLine}
      </div>

      {/* AFROGLOW made of particles: a finger or the pointer turns it liquid, and it settles back. */}
      <LiquidWordmark
        stacked={['AFRO', 'GLOW']}
        className="my-8 h-[min(84vw,26rem)] w-full shrink-0 px-2 sm:my-10 sm:h-[clamp(220px,30vw,520px)]"
      />

      <div className="mx-auto grid w-full max-w-6xl items-end gap-10 px-5 sm:px-8 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
        <motion.h2 {...reveal(0)} className="font-logo text-4xl leading-[1.05] text-onyx sm:text-6xl">
          Pronta para a tua transformação?
        </motion.h2>

        <motion.div {...reveal(0.1)} className="flex flex-col gap-6">
          <p className="max-w-md font-subtitle text-base font-light leading-relaxed text-onyx/60">
            Marca online em poucos minutos ou fala connosco. Ajudamos-te a escolher o estilo certo para ti.
          </p>
          <ButtonWithIcon solid large label="Agendar a minha sessão" onClick={() => navigate('/agendar')} />
          <div>
            <p className="font-subtitle text-xs text-onyx/55">Preferes falar primeiro?</p>
            <div className="mt-3 flex flex-wrap gap-2">
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
          </div>
        </motion.div>
      </div>
    </section>
  )
}
