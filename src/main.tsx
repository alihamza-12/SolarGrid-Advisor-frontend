import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './theme/ThemeContext.tsx'
import { I18nProvider } from './i18n/index.tsx'
import { LLMProvider } from './theme/LLMContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <LLMProvider>
          <App />
        </LLMProvider>
      </I18nProvider>
    </ThemeProvider>
  </StrictMode>,
)
