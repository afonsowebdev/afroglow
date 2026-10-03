import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from '@/site-entry'
import { warmUpApi } from './lib/api.ts'
import { initNativeApp } from './lib/capacitor-bootstrap.ts'
import { CustomerAuthProvider } from './lib/customer-auth.tsx'
import { ThemeProvider } from './lib/theme.tsx'
import './index.css'

// The customer app is its own tree. import.meta.env.MODE is a build-time constant, so
// the website/admin build drops this chunk entirely.
const CustomerApp = import.meta.env.MODE === 'customer' ? lazy(() => import('./customer/CustomerApp.tsx')) : null

void initNativeApp()
warmUpApi()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <CustomerAuthProvider>
        <BrowserRouter>
          {CustomerApp ? (
            <Suspense fallback={null}>
              <CustomerApp />
            </Suspense>
          ) : (
            <App />
          )}
        </BrowserRouter>
      </CustomerAuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
