import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { MotionButton } from '@/components/ui/motion-button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { instagramDmUrl, whatsappUrl } from '@/lib/site-config'

const NAV_LINKS = [
  { label: 'Início', href: '#top' },
  { label: 'Sobre', href: '#sobre' },
  { label: 'Serviços', href: '#servicos' },
  { label: 'Galeria', href: '#galeria' },
  { label: 'Contacto', href: '#contacto' },
]

const SOCIAL_LINKS = [
  { label: 'Instagram', href: instagramDmUrl(), icon: 'bx bxl-instagram' },
  { label: 'WhatsApp', href: whatsappUrl('Olá! Gostaria de saber mais sobre os vossos serviços.'), icon: 'bx bxl-whatsapp' },
]

function SocialIcons({ className }: { className?: string }) {
  return (
    <div className={className}>
      {SOCIAL_LINKS.map((social) => (
        <a
          key={social.label}
          href={social.href}
          target="_blank"
          rel="noreferrer"
          aria-label={social.label}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-muted/50 text-muted-dark transition-colors duration-300 hover:border-muted-dark hover:bg-muted-dark hover:text-cream"
        >
          <i className={social.icon} aria-hidden="true" />
        </a>
      ))}
    </div>
  )
}

function BookButton({ size, onClick }: { size?: 'default' | 'sm'; onClick?: () => void }) {
  return <MotionButton label="Agendar" size={size} href="/agendar" onClick={onClick} />
}

const SECTION_IDS = NAV_LINKS.map((link) => link.href.slice(1))

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('top')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null)

    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (mostVisible) {
          setActiveSection(mostVisible.target.id)
        }
      },
      { rootMargin: '-40% 0px -40% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
    )

    for (const section of sections) observer.observe(section)
    return () => observer.disconnect()
  }, [])

  const pillClasses = `flex items-center rounded-full bg-white/95 shadow-lg shadow-black/10 backdrop-blur transition-shadow duration-500 ${
    scrolled ? 'shadow-xl shadow-black/15' : ''
  }`

  return (
    <div className="fixed inset-x-0 top-0 z-50 mt-4 px-4 sm:mt-6 sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <a href="#top" className={`px-5 py-3 sm:px-6 ${pillClasses}`}>
          <span className="font-logo text-2xl leading-none tracking-wide text-gold-deep">AfroGlow</span>
        </a>

        <div className={`gap-4 px-4 py-2 sm:px-6 sm:py-3 ${pillClasses}`}>
          <ul className="hidden items-center gap-1 font-body text-sm text-onyx md:flex">
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.href.slice(1)
              return (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className={`inline-block rounded-full border px-4 py-1.5 transition-colors duration-300 ${
                      isActive
                        ? 'border-onyx/40 text-onyx'
                        : 'border-transparent text-onyx/60 hover:border-onyx/20 hover:text-onyx'
                    }`}
                  >
                    {link.label}
                  </a>
                </li>
              )
            })}
          </ul>

          <SocialIcons className="hidden items-center gap-2 md:flex" />

          <div className="hidden md:block">
            <ThemeToggle />
          </div>

          <div className="hidden md:block">
            <BookButton size="sm" />
          </div>

          <button
            type="button"
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="relative flex h-10 w-10 flex-col items-center justify-center gap-[6px] md:hidden"
          >
            <motion.span
              className="h-[1.5px] w-6 bg-onyx"
              animate={{ rotate: open ? 45 : 0, y: open ? 7.5 : 0 }}
              transition={{ duration: 0.25 }}
            />
            <motion.span
              className="h-[1.5px] w-6 bg-onyx"
              animate={{ opacity: open ? 0 : 1 }}
              transition={{ duration: 0.2 }}
            />
            <motion.span
              className="h-[1.5px] w-6 bg-onyx"
              animate={{ rotate: open ? -45 : 0, y: open ? -7.5 : 0 }}
              transition={{ duration: 0.25 }}
            />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-10 bg-white md:hidden"
          >
            <ul className="flex flex-col items-center gap-3">
              {NAV_LINKS.map((link, index) => {
                const isActive = activeSection === link.href.slice(1)
                return (
                  <motion.li
                    key={link.href}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.08 + index * 0.05, ease: 'easeOut' }}
                  >
                    <a
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-baseline gap-3 px-2 py-1.5 transition-colors duration-300 ${
                        isActive ? 'text-onyx' : 'text-onyx/50'
                      }`}
                    >
                      <span
                        className={`font-logo text-sm transition-colors duration-300 ${
                          isActive ? 'text-gold-deep' : 'text-onyx/30'
                        }`}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="font-subtitle text-2xl">{link.label}</span>
                    </a>
                  </motion.li>
                )
              })}
            </ul>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 + NAV_LINKS.length * 0.05, ease: 'easeOut' }}
              className="flex items-center gap-4"
            >
              <SocialIcons className="flex items-center gap-4" />
              <ThemeToggle />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.13 + NAV_LINKS.length * 0.05, ease: 'easeOut' }}
            >
              <BookButton onClick={() => setOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
