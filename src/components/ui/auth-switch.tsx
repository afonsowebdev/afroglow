import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AccountAuthForm, type AuthMode } from '@/components/ui/account-auth-form'

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

// Sign in / sign up in a single card, centred on the page. All auth logic stays in AccountAuthForm; this
// component only switches the copy and the mode.
export default function AuthSwitch({ onSuccess }: { onSuccess?: () => void }) {
  const [mode, setMode] = useState<AuthMode>('login')
  const copy = COPY[mode]

  return (
    <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-gold/20 bg-white px-6 py-8 shadow-2xl shadow-black/10 sm:px-10 sm:py-10">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="mb-5 text-center"
        >
          <h1 className="font-logo text-3xl text-onyx sm:text-4xl">{copy.title}</h1>
          <p className="mt-2 font-subtitle text-sm font-light text-muted-dark">{copy.text}</p>
        </motion.div>
      </AnimatePresence>

      <AccountAuthForm hideTabs mode={mode} onModeChange={setMode} onSuccess={onSuccess} />

      {mode !== 'verify' && (
        <p className="mt-5 text-center font-subtitle text-sm text-muted-dark">
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
  )
}
