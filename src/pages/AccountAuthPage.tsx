import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AccountAuthForm } from '@/components/ui/account-auth-form'
import { useCustomerAuth } from '@/lib/customer-auth'

export default function AccountAuthPage() {
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
    <div className="min-h-screen bg-white">
      <div className="fixed inset-x-0 top-0 z-50 mt-[calc(1rem+env(safe-area-inset-top))] px-4 sm:mt-[calc(1.5rem+env(safe-area-inset-top))] sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link to="/" className={`px-5 py-3 sm:px-6 ${pillClasses}`}>
            <span className="font-logo text-2xl leading-none tracking-wide text-gold-deep">AFROGLOW</span>
          </Link>

          <Link
            to="/"
            className={`gap-2 px-5 py-3 text-sm text-onyx transition-colors duration-300 hover:text-gold-deep sm:px-6 ${pillClasses}`}
          >
            <span>Sair</span>
            <i className="bx bx-x text-xl" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-md px-5 pb-24 pt-[calc(7rem+env(safe-area-inset-top))] sm:px-8 sm:pt-[calc(8rem+env(safe-area-inset-top))]">
        <h1 className="font-logo text-4xl text-onyx sm:text-5xl">A tua conta</h1>
        <p className="mt-4 font-subtitle text-lg font-light text-muted-dark">
          Entra ou cria uma conta para marcar, gerir e reagendar as tuas sessões.
        </p>

        <div className="mt-12">
          <AccountAuthForm onSuccess={() => navigate('/conta')} />
        </div>
      </main>
    </div>
  )
}
