import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { migrateLegacyStorage } from './lib/storage'
import './styles.css'

// Carries pre-rename data across before anything reads a key.
migrateLegacyStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
