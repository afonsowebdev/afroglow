import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AccountAuthForm, type AuthMode } from '@/components/ui/account-auth-form'

const EASE = [0.76, 0, 0.24, 1] as const

function useIsDesktop() {
  const query = '(min-width: 768px)'
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return matches
}

const COPY = {
  login: {
    title: 'Bem-vinda de volta',
    text: 'Entra para gerires as tuas marcações.',
  },
  register: {
    title: 'Criar conta',
    text: 'Marca, reagenda e acompanha as tuas sessões num só sítio.',
  },
  verify: {
    title: 'Confirmar email',
    text: 'Falta só um passo para activares a tua conta.',
  },
} as const

// Split-screen sign in / sign up: a gold overlay panel slides across the card
// while the form panel slides the opposite way. All auth logic stays in
// AccountAuthForm; this component only handles the choreography.
export default function AuthSwitch({ onSuccess }: { onSuccess?: () => void }) {
  const [mode, setMode] = useState<AuthMode>('login')
  const isDesktop = useIsDesktop()
  const signUpSide = mode !== 'login'
  const copy = COPY[mode]

  return (
    <div className="relative overflow-hidden rounded-3xl border border-gold/20 bg-white shadow-2xl shadow-black/10 md:h-[min(580px,calc(100vh-9rem))] md:min-h-[500px]">
      {/* Form panel */}
      <motion.div
        initial={false}
        animate={{ x: isDesktop ? (signUpSide ? '0%' : '100%') : '0%' }}
        transition={{ duration: 0.9, ease: EASE }}
        className="relative z-10 flex items-center justify-center px-6 py-8 sm:px-10 md:absolute md:inset-y-0 md:left-0 md:w-1/2 md:overflow-y-auto"
      >
        <div className="my-auto w-full max-w-md">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="mb-5"
            >
              <h1 className="font-logo text-3xl text-onyx sm:text-4xl">{copy.title}</h1>
              <p className="mt-2 font-subtitle text-sm font-light text-muted-dark">{copy.text}</p>
            </motion.div>
          </AnimatePresence>

          <AccountAuthForm hideTabs mode={mode} onModeChange={setMode} onSuccess={onSuccess} />

          {mode !== 'verify' && (
            <p className="mt-5 text-center font-subtitle text-sm text-muted-dark md:hidden">
              {mode === 'login' ? 'Ainda não tens conta?' : 'Já tens conta?'}{' '}
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="text-gold-deep underline-offset-4 hover:underline"
              >
                {mode === 'login' ? 'Criar conta' : 'Entrar'}
              </button>
            </p>
          )}
        </div>
      </motion.div>

      {/* Overlay panel (desktop only) */}
      <motion.div
        aria-hidden={!isDesktop}
        initial={false}
        animate={{ x: signUpSide ? '100%' : '0%' }}
        transition={{ duration: 0.9, ease: EASE }}
        className="absolute inset-y-0 left-0 z-20 hidden w-1/2 overflow-hidden bg-cream md:block"
      >
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,var(--color-gold)_0%,transparent_60%)] opacity-15" />
        <span className="pointer-events-none absolute -bottom-28 -right-24 h-72 w-72 rounded-full border border-gold/30" />
        <span className="pointer-events-none absolute -bottom-16 -right-12 h-48 w-48 rounded-full border border-gold/20" />
        <span
          className={`pointer-events-none absolute inset-y-0 w-px bg-gold/25 ${signUpSide ? 'left-0' : 'right-0'}`}
        />

        <div className="relative flex h-full flex-col items-center justify-center px-12 text-center">
          <span className="font-logo text-5xl leading-none tracking-wide text-gold-deep">AFROGLOW</span>
          <span className="mt-5 h-px w-10 bg-gold" />

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={signUpSide ? 'has-account' : 'new-here'}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              className="mt-5 flex flex-col items-center"
            >
              <h2 className="font-display text-3xl text-onyx">
                {signUpSide ? 'Já és das nossas?' : 'Primeira vez aqui?'}
              </h2>
              <p className="mt-3 max-w-xs font-subtitle text-sm font-light leading-relaxed text-muted-dark">
                {signUpSide
                  ? 'Bem-vinda de volta. Entra para continuares a cuidar das tuas tranças.'
                  : 'Cria a tua conta em segundos e marca a tua próxima sessão.'}
              </p>
              <button
                type="button"
                onClick={() => setMode(signUpSide ? 'login' : 'register')}
                className="mt-7 rounded-full border border-gold-deep px-8 py-2.5 font-subtitle text-xs uppercase tracking-[0.2em] text-gold-deep transition-colors duration-300 hover:bg-gold-deep hover:text-white"
              >
                {signUpSide ? 'Entrar' : 'Criar conta'}
              </button>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
