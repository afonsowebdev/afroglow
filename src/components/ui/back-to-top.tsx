import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUp } from 'lucide-react'
import { tap } from '@/lib/haptics'
import { useTheme } from '@/lib/theme'
import { ROUND_SAMPLES, useBackdropTone } from '@/lib/use-backdrop-tone'
import { cn } from '@/lib/utils'

/**
 * Round glass button beside the tab bar that takes the page back to the top. It shows once the page has been scrolled
 * down about a screen, and its arrow follows what is behind the glass (white over dark, dark over light).
 *
 * `admin`: the admin's way: it comes as soon as the page starts to scroll, close beside the tab bar (the parent leaves
 * no gap of its own, so the room opens smoothly from nothing), and glides in from the bar's side with a soft spring.
 */
export function BackToTop({ hidden = false, admin = false }: { hidden?: boolean; admin?: boolean }) {
  const [scrolled, setScrolled] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const { theme } = useTheme()
  const visible = scrolled && !hidden
  const tone = useBackdropTone(button, theme === 'dark' ? 'dark' : 'light', visible, ROUND_SAMPLES)

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > (admin ? 48 : window.innerHeight * 0.9))
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [admin])

  // One gentle ease for both: the room beside the tab bar opens (so the bar glides aside rather than jumping) while
  // the button fades in from a slight blur; leaving does the same in reverse.
  const ease = { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const }
  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          key="back-to-top"
          className="pointer-events-auto shrink-0"
          initial={{ width: 0, marginLeft: 0 }}
          animate={{ width: admin ? 62 : 56, marginLeft: admin ? 8 : 10 }}
          exit={{ width: 0, marginLeft: 0 }}
          transition={admin ? { duration: 0.6, ease: [0.22, 1, 0.36, 1] } : ease}
        >
          <motion.button
            ref={button}
            type="button"
            aria-label="Voltar ao topo"
            onClick={() => {
              void tap()
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            initial={admin ? { opacity: 0, scale: 0.6, x: -18, filter: 'blur(4px)' } : { opacity: 0, scale: 0.85, filter: 'blur(6px)' }}
            animate={{ opacity: 1, scale: 1, x: 0, filter: 'blur(0px)' }}
            exit={admin ? { opacity: 0, scale: 0.6, x: -18, filter: 'blur(4px)' } : { opacity: 0, scale: 0.85, filter: 'blur(6px)' }}
            whileTap={{ scale: 0.94 }}
            transition={
              admin
                ? { type: 'spring', stiffness: 260, damping: 24, mass: 0.9, opacity: { duration: 0.35 }, filter: { duration: 0.35 } }
                : ease
            }
            className={cn(
              cn('flex items-center justify-center rounded-full transition-colors duration-300', admin ? 'glass-clear relative size-[62px]' : 'liquid-glass size-14'),
              tone === 'dark' ? 'text-[#ffffff]' : 'text-[#1a1008]',
            )}
          >
            <ArrowUp size={24} strokeWidth={2.4} />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
