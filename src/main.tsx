import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initSiteAnalytics } from './site/analytics'
import { redirectAuthCallbackToPortal } from './auth/redirectAuthCallback'

initSiteAnalytics()

// Invite/recovery emails use Site URL (/) — send auth callbacks to /portal?techInvite=1 first.
if (!redirectAuthCallbackToPortal()) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
