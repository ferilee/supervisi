import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './readability.css'
import './mobile-nav.css'
import './theme.css'
import './progressive.css'
import './fintech-theme.css'
import './teacher-management.css'
import './print-report.css'
import './post-tabs.css'
import './settings.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
