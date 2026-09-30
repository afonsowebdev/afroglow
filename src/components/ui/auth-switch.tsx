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
    <div className="relative overflow-hidden rounded-3xl border border-gold/20 bg-white shadow-2xl shadow-black/10 md:min-h-[680px]">
      {/* Form panel */}
      <motion.div
        initial={false}
        animate={{ x: isDesktop ? (signUpSide ? '0%' : '100%') : '0%' }}
        transition={{ duration: 0.9, ease: EASE }}
        className="relative z-10 flex items-center justify-center px-6 py-10 sm:px-10 md:absolute md:inset-y-0 md:left-0 md:w-1/2 md:overflow-y-auto"
      >
        <div className="my-auto w-full max-w-sm">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="mb-8"
            >
              <h1 className="font-logo text-4xl text-onyx">{copy.title}</h1>
              <p className="mt-2 font-subtitle text-sm font-light text-muted-dark">{copy.text}</p>
            </motion.div>
          </AnimatePresence>

          <AccountAuthForm hideTabs mode={mode} onModeChange={setMode} onSuccess={onSuccess} />

          {mode !== 'verify' && (
            <p className="mt-8 text-center font-subtitle text-sm text-muted-dark md:hidden">
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
        className="absolute inset-y-0 left-0 z-20 hidden w-1/2 overflow-hidden bg-gradient-to-br from-[#8c6a24] via-[#6b4f1b] to-[#3b1f0e] text-[#f5efdf] md:block"
      >
        <span className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#c9a84c]/20 blur-2xl" />
        <span className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full border border-[#c9a84c]/30" />
        <span className="pointer-events-none absolute -bottom-20 -right-8 h-56 w-56 rounded-full border border-[#c9a84c]/20" />

        <div className="relative flex h-full flex-col items-center justify-center px-10 text-center">
          <span className="font-logo text-5xl leading-none tracking-wide">AFROGLOW</span>
          <span className="mt-6 h-px w-12 bg-[#c9a84c]/60" />

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={signUpSide ? 'has-account' : 'new-here'}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              className="mt-6 flex flex-col items-center"
            >
              <h2 className="font-display text-3xl">{signUpSide ? 'Já és das nossas?' : 'Primeira vez aqui?'}</h2>
              <p className="mt-3 max-w-xs font-subtitle text-sm font-light leading-relaxed text-[#f5efdf]/80">
                {signUpSide
                  ? 'Bem-vinda de volta. Entra para continuares a cuidar das tuas tranças.'
                  : 'Cria a tua conta em segundos e marca a tua próxima sessão.'}
              </p>
              <button
                type="button"
                onClick={() => setMode(signUpSide ? 'login' : 'register')}
                className="mt-8 rounded-full border border-[#f5efdf]/70 px-8 py-3 font-subtitle text-xs uppercase tracking-[0.2em] transition-colors duration-300 hover:bg-[#f5efdf] hover:text-[#3b1f0e]"
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
