import { AnimatePresence, motion } from 'motion/react'
import { useTheme } from '@/lib/theme'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      className={`relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-muted/50 text-muted-dark transition-colors duration-300 hover:border-muted-dark hover:bg-muted-dark hover:text-cream ${className ?? ''}`}
    >
      <AnimatePresence initial={false}>
        <motion.span
          key={isDark ? 'sun' : 'moon'}
          className="absolute inset-0 flex items-center justify-center"
          initial={{ rotate: -90, opacity: 0, scale: 0.4 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.4 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
        >
          <i className={isDark ? 'bx bx-sun' : 'bx bx-moon'} aria-hidden="true" />
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
