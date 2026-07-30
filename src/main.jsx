import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { heIL } from '@clerk/localizations'
import './index.css'
import App from './App.jsx'

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

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

// Register the service worker so the app is installable to the home screen.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
