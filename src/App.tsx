/* Main App Component - Handles routing (using react-router-dom), query client and other providers */
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Index from './pages/Index'
import Resultados from './pages/Resultados'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'
import { MegaProvider } from './lib/MegaContext'

const App = () => (
  <BrowserRouter>
    <TooltipProvider>
      <MegaProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/resultados" element={<Resultados />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MegaProvider>
    </TooltipProvider>
  </BrowserRouter>
)

export default App
