import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/theme.css'
import App from './App.jsx'
import { getInitialTheme } from './hooks/useTheme'
import {
  applyFontScale,
  getInitialFontScale,
  applyReduceMotion,
  getInitialReduceMotion,
} from './hooks/useSettings'

// Apply saved/OS preferences before first paint (no flash of wrong theme/size).
document.documentElement.setAttribute('data-theme', getInitialTheme())
applyFontScale(getInitialFontScale())
applyReduceMotion(getInitialReduceMotion())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
