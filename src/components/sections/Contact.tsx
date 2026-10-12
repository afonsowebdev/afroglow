import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { ImageStreamHero, type StreamImage } from '@/components/ui/image-stream-hero'
import { ButtonWithIcon } from '@/components/ui/button-with-icon'
import { useOpeningStatus } from '@/lib/opening-hours'
import { instagramDmUrl, siteConfig, useBusinessInfo, useWhatsapp } from '@/lib/site-config'

const HERO_PHOTOS = [
  '/images/hero/hero-1.jpg',
  '/images/hero/hero-2.jpg',
  '/images/hero/hero-3.jpg',
  '/images/hero/hero-4.jpg',
  '/images/hero/hero-5.jpg',
]

const PLACEHOLDER_IMAGES: StreamImage[] = Array.from({ length: 6 }, (_, index) => ({
  src: HERO_PHOTOS[index % HERO_PHOTOS.length],
  alt: 'Knotless braids com pontas cacheadas',
}))

type Channel = { icon: string; name: string; detail: string; href: string; external: boolean }

/** One way to reach us: the icon, the channel and its handle or address, and an arrow that turns on hover. */
function ChannelLink({ channel }: { channel: Channel }) {
  return (
    <a
      href={channel.href}
      target={channel.external ? '_blank' : undefined}
      rel={channel.external ? 'noreferrer' : undefined}
      className="group flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-onyx/[0.04] sm:flex-col sm:items-start sm:gap-4 sm:p-5"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-onyx text-lg text-white">
        <i className={channel.icon} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-subtitle text-sm font-medium text-onyx">{channel.name}</span>
        <span className="block truncate font-subtitle text-xs text-onyx/55">{channel.detail}</span>
      </span>
      <ArrowUpRight
        size={18}
        className="shrink-0 text-onyx/40 transition-all duration-300 group-hover:rotate-45 group-hover:text-onyx sm:absolute sm:right-4 sm:top-5"
        aria-hidden="true"
      />
    </a>
  )
}

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
            detail: business.phone || 'Enviar mensagem',
            href: whatsapp.url('Olá! Gostaria de marcar uma sessão de tranças.'),
            external: true,
          },
        ]
      : []),
    { icon: 'bx bxl-instagram', name: 'Instagram', detail: `@${siteConfig.instagramHandle}`, href: instagramDmUrl(), external: true },
    { icon: 'bx bx-envelope', name: 'Email', detail: siteConfig.email, href: `mailto:${siteConfig.email}`, external: false },
  ]

  return (
    <section
      id="contacto"
      className="relative flex flex-col items-center overflow-hidden bg-white px-5 py-24 sm:min-h-[760px] sm:justify-center sm:px-8 sm:py-40 md:py-48"
    >
      {/*
        Phones: the corridor is its own band between the title and the buttons, so the photos are seen whole.
        From `sm` it fills the section behind the text, as before. Wider than its box so the photos keep a
        readable size; the box crops the overflow.
      */}
      <div className="relative order-2 -mx-5 my-4 h-52 w-screen overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)] sm:absolute sm:inset-0 sm:m-0 sm:h-auto sm:w-auto sm:[mask-image:none]">
        <ImageStreamHero
          images={PLACEHOLDER_IMAGES}
          className="absolute inset-y-0 left-1/2 w-[320%] -translate-x-1/2 sm:w-[130%] lg:w-full"
        />
      </div>
      {/* Fades the corridor into the sections above and below, and a soft frosted veil behind the text only:
          its edges fade out so the photos stay in view around it. */}
      <div
        className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(to_bottom,var(--color-white)_0%,transparent_22%,transparent_78%,var(--color-white)_100%)] sm:block"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[600px] w-[640px] -translate-x-1/2 lg:h-[640px] lg:w-[820px] -translate-y-1/2 bg-white/60 backdrop-blur-md [mask-image:radial-gradient(closest-side,black_55%,transparent)] sm:block"
        aria-hidden="true"
      />

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

      <motion.div
        {...reveal(0.1)}
        className="relative z-10 order-3 mx-auto flex w-full max-w-xl flex-col items-center text-center sm:mt-9"
      >
        <ButtonWithIcon solid large label="Agendar a minha sessão" onClick={() => navigate('/agendar')} />

        <div className="mt-10 flex w-full items-center gap-3 font-subtitle text-xs text-onyx/55">
          <span className="h-px flex-1 bg-onyx/15" aria-hidden="true" />
          Preferes falar primeiro?
          <span className="h-px flex-1 bg-onyx/15" aria-hidden="true" />
        </div>

        {/* The ways to reach us, as one frosted card: side by side from `sm`, stacked on phones. */}
        <div className="mt-5 flex w-full flex-col divide-y divide-onyx/10 overflow-hidden rounded-3xl border border-onyx/10 bg-white/75 backdrop-blur-md sm:flex-row sm:divide-x sm:divide-y-0 [&>a]:relative">
          {channels.map((channel) => (
            <ChannelLink key={channel.name} channel={channel} />
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
