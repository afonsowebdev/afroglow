import { Capacitor } from '@capacitor/core'
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import LandingPage from '@/pages/LandingPage'

const AccountAuthPage = lazy(() => import('@/pages/AccountAuthPage'))
const AccountPage = lazy(() => import('@/pages/AccountPage'))
const BookingPage = lazy(() => import('@/pages/BookingPage'))
const BookingsPage = lazy(() => import('@/pages/BookingsPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const CeoPage = lazy(() => import('@/pages/CeoPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'))
const TermsPage = lazy(() => import('@/pages/TermsPage'))
const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage'))
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'))

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={Capacitor.isNativePlatform() ? <Navigate to="/admin" replace /> : <LandingPage />} />
        <Route path="/agendar" element={<BookingPage />} />
        <Route path="/entrar" element={<AccountAuthPage />} />
        <Route path="/conta" element={<AccountPage />} />
        <Route path="/marcacoes" element={<BookingsPage />} />
        <Route path="/definicoes" element={<SettingsPage />} />
        <Route path="/ceo" element={<CeoPage />} />
        <Route path="/privacidade" element={<PrivacyPage />} />
        <Route path="/termos" element={<TermsPage />} />
        <Route
          path="/admin/login"
          element={
            <Suspense fallback={null}>
              <AdminLoginPage />
            </Suspense>
          }
        />
        <Route
          path="/admin"
          element={
            <Suspense fallback={null}>
              <AdminDashboardPage />
            </Suspense>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
