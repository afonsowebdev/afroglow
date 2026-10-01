import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, ApiError, customerToken } from '@/lib/api'
import type { Customer } from '@/lib/types'

interface CustomerAuthContextValue {
  customer: Customer | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  startRegistration: (data: { name: string; email: string; phone: string; password: string }) => Promise<void>
  verifyEmail: (email: string, code: string) => Promise<void>
  resendCode: (email: string) => Promise<void>
  logout: () => Promise<void>
  // Re-checks the session with the server (e.g. after a request came back 401).
  refresh: () => Promise<void>
}

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null)

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<Customer>('/account/me')
      setCustomer(data)
    } catch (err) {
      // Only a rejected session should drop the stored token — a network
      // blip must not log the customer out.
      if (err instanceof ApiError && err.status === 401) customerToken.set(null)
      setCustomer(null)
    }
  }, [])

  useEffect(() => {
    void refresh().finally(() => setLoading(false))
  }, [refresh])

  const login = useCallback(async (email: string, password: string) => {
    const { sessionToken, ...data } = await api.post<Customer & { sessionToken?: string }>('/account/login', {
      email,
      password,
    })
    customerToken.set(sessionToken ?? null)
    setCustomer(data)
  }, [])

  const startRegistration = useCallback(
    async (data: { name: string; email: string; phone: string; password: string }) => {
      await api.post('/auth/register', data)
    },
    [],
  )

  const verifyEmail = useCallback(async (email: string, code: string) => {
    const { sessionToken, ...data } = await api.post<Customer & { sessionToken?: string }>('/auth/verify-email', {
      email,
      code,
    })
    customerToken.set(sessionToken ?? null)
    setCustomer(data)
  }, [])

  const resendCode = useCallback(async (email: string) => {
    await api.post('/auth/resend-code', { email })
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/account/logout')
    } finally {
      customerToken.set(null)
      setCustomer(null)
    }
  }, [])

  return (
    <CustomerAuthContext.Provider
      value={{ customer, loading, login, startRegistration, verifyEmail, resendCode, logout, refresh }}
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
