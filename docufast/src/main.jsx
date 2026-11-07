import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { consumeHandoff } from '@/lib/handoff'

// Sign the customer in first when they arrive from the other address (payment hand-off).
consumeHandoff().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
  )
})

// Lets the app be installed and shows an offline page (production only).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
