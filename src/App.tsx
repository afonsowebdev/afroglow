import { Route, Routes } from 'react-router-dom'
import LandingPage from '@/pages/LandingPage'
import BookingPage from '@/pages/BookingPage'
import AdminLoginPage from '@/pages/admin/AdminLoginPage'
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/agendar" element={<BookingPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminDashboardPage />} />
    </Routes>
  )
}
