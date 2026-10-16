import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUp } from 'lucide-react'
import { tap } from '@/lib/haptics'
import { useTheme } from '@/lib/theme'
import { useBackdropTone } from '@/lib/use-backdrop-tone'
import { cn } from '@/lib/utils'

/**
 * Round glass button beside the tab bar that takes the page back to the top. It shows once the page has been scrolled
 * down about a screen, and its arrow follows what is behind the glass (white over dark, dark over light).
 */
export function BackToTop({ hidden = false }: { hidden?: boolean }) {
  const [scrolled, setScrolled] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const { theme } = useTheme()
  const visible = scrolled && !hidden
  const tone = useBackdropTone(button, theme === 'dark' ? 'dark' : 'light', visible)

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > window.innerHeight * 0.9)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          ref={button}
          type="button"
          aria-label="Voltar ao topo"
          onClick={() => {
            void tap()
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          className={cn(
            'liquid-glass pointer-events-auto flex size-14 shrink-0 items-center justify-center rounded-full transition-colors duration-300',
            tone === 'dark' ? 'text-[#ffffff]' : 'text-[#1a1008]',
          )}
        >
          <ArrowUp size={24} strokeWidth={2.4} />
        </motion.button>
      )}
    </AnimatePresence>
  )
}
