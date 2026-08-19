import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'

/** Qualquer rota desconhecida após o Google Auth volta para o app, não para o 404 do GitHub. */
export function PostAuthRedirect() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0f12] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    )
  }

  return <Navigate to={user ? '/' : '/login'} replace />
}
