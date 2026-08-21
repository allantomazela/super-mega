import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Loader2, Sparkles } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'

const YEAR = new Date().getFullYear()

export default function Login() {
  const { user, loading, signInGoogle } = useAuth()
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0c0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  async function entrarComGoogle() {
    setErro(null)
    setEnviando(true)
    try {
      await signInGoogle()
    } catch (error) {
      setEnviando(false)
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível iniciar o login com Google.',
      )
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0c0f] text-zinc-100 flex flex-col">
      {/* Atmosfera */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(16,185,129,0.22), transparent 55%), radial-gradient(ellipse 60% 40% at 90% 80%, rgba(5,150,105,0.12), transparent 50%), radial-gradient(ellipse 50% 30% at 10% 70%, rgba(245,158,11,0.08), transparent 45%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <main className="relative flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-950/40 text-emerald-300 text-[11px] font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              Otimizador estratégico · Mega-Sena
            </div>
            <h1 className="font-black tracking-tight text-4xl sm:text-5xl leading-[1.05]">
              <span className="bg-gradient-to-br from-emerald-200 via-white to-amber-200 bg-clip-text text-transparent">
                MEGA DOS MILIONÁRIOS
              </span>
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 max-w-md mx-auto leading-relaxed">
              Entre com Google para gerar fechamentos, guardar seu histórico privado e
              receber alertas quando seus jogos forem premiados.
            </p>
          </div>

          <div className="rounded-3xl border border-[#2a313c] bg-[#12161b]/90 backdrop-blur-md p-7 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            <div className="flex flex-col items-center text-center mb-6">
              <img
                src={`${import.meta.env.BASE_URL}favicon.svg`}
                alt=""
                className="w-14 h-14 mb-3 rounded-2xl border border-emerald-500/35 shadow-[0_0_24px_rgba(16,185,129,0.25)]"
              />
              <p className="text-sm text-zinc-300">Acesso exclusivo à sua conta</p>
              <p className="text-[11px] text-zinc-500 mt-1">
                Seu histórico não é compartilhado com outros usuários.
              </p>
            </div>

            {erro ? (
              <p className="mb-4 text-sm text-red-400 text-center" role="alert">
                {erro}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void entrarComGoogle()}
              disabled={enviando}
              className="w-full h-12 rounded-xl bg-white text-zinc-900 font-semibold text-sm flex items-center justify-center gap-3 hover:bg-zinc-100 disabled:opacity-70 transition-colors shadow-lg"
            >
              {enviando ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon />}
              Continuar com Google
            </button>
          </div>
        </div>
      </main>

      <footer className="relative border-t border-[#1e242c] bg-[#0a0c0f]/80 px-4 py-6">
        <div className="max-w-2xl mx-auto text-center space-y-2">
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Este site/sistema <strong className="text-zinc-400">não garante acertividade</strong>{' '}
            nem prêmios. Ele é baseado em cálculos de estatística e probabilidade que ajudam a
            decidir os números a serem jogados para se ter mais chance de premiação — sempre com
            responsabilidade.
          </p>
          <p className="text-[11px] text-zinc-600">
            © {YEAR} MEGA DOS MILIONÁRIOS. Todos os direitos reservados. Jogue com responsabilidade
            (+18).
          </p>
        </div>
      </footer>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}
