import { Capacitor } from '@capacitor/core'
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import LandingPage from '@/pages/LandingPage'
import AccountAuthPage from '@/pages/AccountAuthPage'
import AccountPage from '@/pages/AccountPage'
import BookingPage from '@/pages/BookingPage'
import CeoPage from '@/pages/CeoPage'
import NotFoundPage from '@/pages/NotFoundPage'
import PrivacyPage from '@/pages/PrivacyPage'

const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage'))
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'))

export default function App() {
  return (
    <Routes>
      <Route path="/" element={Capacitor.isNativePlatform() ? <Navigate to="/admin" replace /> : <LandingPage />} />
      <Route path="/agendar" element={<BookingPage />} />
      <Route path="/entrar" element={<AccountAuthPage />} />
      <Route path="/conta" element={<AccountPage />} />
      <Route path="/ceo" element={<CeoPage />} />
      <Route path="/privacidade" element={<PrivacyPage />} />
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
  )
}
