import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'
import type { Customer } from '@/lib/types'

interface CustomerAuthContextValue {
  customer: Customer | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  startRegistration: (data: { name: string; email: string; phone: string; password: string }) => Promise<void>
  verifyEmail: (email: string, code: string) => Promise<void>
  resendCode: (email: string) => Promise<void>
  logout: () => Promise<void>
}

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null)

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<Customer>('/account/me')
      setCustomer(data)
    } catch {
      setCustomer(null)
    }
  }, [])

  useEffect(() => {
    void refresh().finally(() => setLoading(false))
  }, [refresh])

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<Customer>('/account/login', { email, password })
    setCustomer(data)
  }, [])

  const startRegistration = useCallback(
    async (data: { name: string; email: string; phone: string; password: string }) => {
      await api.post('/auth/register', data)
    },
    [],
  )

  const verifyEmail = useCallback(async (email: string, code: string) => {
    const customer = await api.post<Customer>('/auth/verify-email', { email, code })
    setCustomer(customer)
  }, [])

  const resendCode = useCallback(async (email: string) => {
    await api.post('/auth/resend-code', { email })
  }, [])

  const logout = useCallback(async () => {
    await api.post('/account/logout')
    setCustomer(null)
  }, [])

  return (
    <CustomerAuthContext.Provider
      value={{ customer, loading, login, startRegistration, verifyEmail, resendCode, logout }}
    >
      {children}
    </CustomerAuthContext.Provider>
  )
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext)
  if (!ctx) throw new Error('useCustomerAuth must be used within a CustomerAuthProvider')
  return ctx
}
