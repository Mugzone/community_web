import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { SessionProvider } from './components/SessionProvider'
import { I18nProvider } from './i18n'
import { installWindowUrls } from './lib/urls'

installWindowUrls()

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <BrowserRouter>
        <SessionProvider>
          <I18nProvider>
            <App />
          </I18nProvider>
        </SessionProvider>
      </BrowserRouter>
    </React.StrictMode>,
  )
}
