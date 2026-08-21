/* Main App Component - Handles routing (using react-router-dom), query client and other providers */
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Index from './pages/Index'
import Resultados from './pages/Resultados'
import Login from './pages/Login'
import Perfil from './pages/Perfil'
import Layout from './components/Layout'
import { RequireAuth } from './components/RequireAuth'
import { PostAuthRedirect } from './components/PostAuthRedirect'
import { MegaProvider } from './lib/MegaContext'
import { AuthProvider } from './lib/AuthContext'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

const App = () => (
  <BrowserRouter basename={basename || undefined}>
    <TooltipProvider>
      <AuthProvider>
        <MegaProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<RequireAuth />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Index />} />
                <Route path="/resultados" element={<Resultados />} />
                <Route path="/perfil" element={<Perfil />} />
              </Route>
            </Route>
            <Route path="*" element={<PostAuthRedirect />} />
          </Routes>
        </MegaProvider>
      </AuthProvider>
    </TooltipProvider>
  </BrowserRouter>
)

export default App
