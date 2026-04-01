import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// StrictMode intentionally disabled: React 18+ strict mode double-invokes effects in dev,
// which causes concurrent Firestore watch stream conflicts against the emulator (ca9/b815
// assertion failures). This only affects dev builds; production is unaffected.
createRoot(document.getElementById('root')!).render(
  <App />
)

// Fade out splash screen after a minimum display time
const splash = document.getElementById('splash')
if (splash) {
  setTimeout(() => {
    splash.classList.add('fade-out')
    splash.addEventListener('transitionend', () => splash.remove())
  }, 1200)
}
