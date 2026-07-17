import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { sweepLegacyLocalWork } from './utils/inquiryDraft'

// Learner work moved from localStorage to sessionStorage (2026-07-17); purge
// what older visits left behind so stale notes can't resurface into the sheet.
sweepLegacyLocalWork()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
