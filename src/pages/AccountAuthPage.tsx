import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import AuthSwitch from '@/components/ui/auth-switch'
import { useCustomerAuth } from '@/lib/customer-auth'
import { usePageTitle } from '@/lib/page-title'

export default function AccountAuthPage({ embedded = false }: { embedded?: boolean } = {}) {
  usePageTitle('Entrar', { noindex: true })
  const { customer, loading } = useCustomerAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && customer) {
      navigate('/conta', { replace: true })
    }
  }, [loading, customer, navigate])

  const pillClasses =
    'flex items-center rounded-full bg-white/95 shadow-lg shadow-black/10 backdrop-blur transition-shadow duration-500'

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white">
      <motion.span
        aria-hidden="true"
        animate={{ opacity: [0.035, 0.07, 0.035], scale: [1, 1.04, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute inset-0 flex select-none items-center justify-center whitespace-nowrap font-logo text-[20vw] leading-none tracking-tight text-onyx"
      >
        AFROGLOW
      </motion.span>

      {!embedded && (
      <div className="fixed inset-x-0 top-0 z-50 mt-[calc(1rem+env(safe-area-inset-top))] px-4 sm:mt-[calc(1.5rem+env(safe-area-inset-top))] sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link to="/" className={`px-5 py-3 sm:px-6 ${pillClasses}`}>
            <span className="font-logo text-2xl leading-none tracking-wide text-gold-ink">AFROGLOW</span>
          </Link>

          <Link
            to="/"
            className={`gap-2 px-5 py-3 text-sm text-onyx transition-colors duration-300 hover:text-gold-ink sm:px-6 ${pillClasses}`}
          >
            <span>Sair</span>
            <i className="bx bx-x text-xl" aria-hidden="true" />
          </Link>
        </div>
      </div>
      )}

      <main className={`relative mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-5 pb-8 ${embedded ? 'pt-[calc(1.5rem+env(safe-area-inset-top))]' : 'pt-[calc(5.5rem+env(safe-area-inset-top))] sm:pt-[calc(6.5rem+env(safe-area-inset-top))]'} sm:px-8`}>
        <AuthSwitch onSuccess={() => navigate('/conta')} />
      </main>
    </div>
  )
}
