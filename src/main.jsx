import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { heIL } from '@clerk/localizations'
import './index.css'
import App from './App.jsx'

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!CLERK_KEY) {
  createRoot(document.getElementById('root')).render(
    <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }} dir="rtl">
      <h2 style={{ color: '#ba1a1a' }}>שגיאת הגדרות (Environment Variables)</h2>
      <p>המפתח <code>VITE_CLERK_PUBLISHABLE_KEY</code> חסר.</p>
      <p>אנא ודאי שהוספת אותו לקובץ <code>.env.local</code> (בסביבת הפיתוח) או להגדרות ה-Environment Variables ב-Vercel (בייצור).</p>
    </div>
  )
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ClerkProvider
        publishableKey={CLERK_KEY}
        localization={heIL}
        appearance={{
          layout: { socialButtonsVariant: 'iconButton' },
        }}
      >
        <App />
      </ClerkProvider>
    </StrictMode>,
  )
}

// Register the service worker so the app is installable to the home screen.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
