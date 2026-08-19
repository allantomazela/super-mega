/* Main entry point for the application - renders the root React component */
import { patchAuthFetch } from '@/lib/patchAuthFetch'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './main.css'

patchAuthFetch()

createRoot(document.getElementById('root')!).render(<App />)
