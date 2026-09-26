import { Capacitor } from '@capacitor/core'
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import LandingPage from '@/pages/LandingPage'
import BookingPage from '@/pages/BookingPage'
import CeoPage from '@/pages/CeoPage'

const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage'))
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'))

export default function App() {
  return (
    <Routes>
      <Route path="/" element={Capacitor.isNativePlatform() ? <Navigate to="/admin" replace /> : <LandingPage />} />
      <Route path="/agendar" element={<BookingPage />} />
      <Route path="/ceo" element={<CeoPage />} />
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
    </Routes>
  )
}
