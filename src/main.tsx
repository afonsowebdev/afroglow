import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { warmUpApi } from './lib/api.ts'
import { initNativeApp } from './lib/capacitor-bootstrap.ts'
import { CustomerAuthProvider } from './lib/customer-auth.tsx'
import { ThemeProvider } from './lib/theme.tsx'
import './index.css'

void initNativeApp()
warmUpApi()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <CustomerAuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </CustomerAuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
