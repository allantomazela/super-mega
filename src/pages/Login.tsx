import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Loader2, Lock, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'

const YEAR = new Date().getFullYear()
const LOGO = `${import.meta.env.BASE_URL}logo-mega.svg`

const BOLA_SLOTS = [
  { n: '07', top: '12%', left: '8%', delay: '0s', size: '3.25rem' },
  { n: '23', top: '22%', right: '10%', delay: '0.6s', size: '2.75rem' },
  { n: '41', bottom: '28%', left: '6%', delay: '1.1s', size: '3rem' },
  { n: '55', bottom: '18%', right: '8%', delay: '1.7s', size: '2.5rem' },
  { n: '12', top: '48%', left: '4%', delay: '0.3s', size: '2.25rem' },
  { n: '36', top: '58%', right: '5%', delay: '1.4s', size: '2.85rem' },
] as const

export default function Login() {
  const { user, loading, signInGoogle } = useAuth()
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#07090c', fontFamily: "'Outfit', system-ui, sans-serif" }}
      >
        <div className="flex flex-col items-center gap-3">
          <img src={LOGO} alt="" className="w-16 h-16 animate-pulse rounded-2xl" />
          <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
        </div>
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
    <div
      className="min-h-screen relative overflow-hidden flex flex-col text-zinc-100"
      style={{ background: '#07090c', fontFamily: "'Outfit', system-ui, sans-serif" }}
    >
      <style>{`
        @keyframes megaFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(4deg); }
        }
        @keyframes megaGlow {
          0%, 100% { opacity: 0.45; transform: scale(1); }
          50% { opacity: 0.75; transform: scale(1.05); }
        }
        @keyframes megaRise {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .mega-float { animation: megaFloat 5.5s ease-in-out infinite; }
        .mega-glow { animation: megaGlow 4s ease-in-out infinite; }
        .mega-rise { animation: megaRise 0.7s ease-out both; }
      `}</style>

      {/* Fundo atmosférico */}
      <div
        className="pointer-events-none absolute inset-0 mega-glow"
        style={{
          background:
            'radial-gradient(ellipse 90% 55% at 50% -5%, rgba(16,185,129,0.28), transparent 58%), radial-gradient(ellipse 50% 40% at 100% 60%, rgba(245,158,11,0.12), transparent 50%), radial-gradient(ellipse 45% 35% at 0% 80%, rgba(5,150,105,0.16), transparent 50%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.55) 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Bolas flutuantes */}
      {BOLA_SLOTS.map((b) => (
        <div
          key={b.n}
          className="pointer-events-none absolute mega-float hidden sm:flex items-center justify-center rounded-full font-bold text-[#064e3b] shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
          style={{
            top: 'top' in b ? b.top : undefined,
            bottom: 'bottom' in b ? b.bottom : undefined,
            left: 'left' in b ? b.left : undefined,
            right: 'right' in b ? b.right : undefined,
            width: b.size,
            height: b.size,
            fontSize: '0.8rem',
            animationDelay: b.delay,
            background:
              'radial-gradient(circle at 32% 28%, #a7f3d0 0%, #34d399 42%, #059669 100%)',
            border: '2px solid rgba(253,230,138,0.55)',
          }}
          aria-hidden
        >
          {b.n}
        </div>
      ))}

      <main className="relative flex-1 flex items-center justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-md mega-rise">
          {/* Marca */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="relative mb-5">
              <div
                className="absolute inset-[-12px] rounded-[2rem] blur-2xl opacity-60"
                style={{
                  background: 'radial-gradient(circle, rgba(16,185,129,0.55), transparent 70%)',
                }}
              />
              <img
                src={LOGO}
                alt="MEGA DOS MILIONÁRIOS"
                className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-[1.75rem] shadow-[0_12px_40px_rgba(0,0,0,0.5)] ring-1 ring-amber-300/30"
              />
            </div>
            <p className="text-[11px] sm:text-xs tracking-[0.28em] uppercase text-amber-200/80 font-semibold mb-2">
              Loterias · Estratégia · Probabilidade
            </p>
            <h1
              className="text-[2rem] sm:text-[2.65rem] leading-[1.05] font-extrabold tracking-tight"
              style={{ fontFamily: "'Syne', 'Outfit', sans-serif" }}
            >
              <span
                style={{
                  background: 'linear-gradient(135deg, #ecfdf5 0%, #fde68a 48%, #fbbf24 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                MEGA DOS
                <br />
                MILIONÁRIOS
              </span>
            </h1>
            <p className="mt-4 text-sm text-zinc-400 max-w-sm leading-relaxed">
              Monte fechamentos inteligentes, guarde seu histórico privado e acompanhe
              alertas de premiação — tudo com a sua conta Google.
            </p>
          </div>

          {/* Card de login */}
          <div
            className="rounded-[1.75rem] border border-white/10 p-6 sm:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
            style={{
              background:
                'linear-gradient(165deg, rgba(22,28,34,0.95) 0%, rgba(12,16,20,0.98) 100%)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <div className="flex items-center justify-center gap-2 text-[11px] text-emerald-300/90 mb-5">
              <Lock className="w-3.5 h-3.5" />
              <span>Acesso seguro · histórico só seu</span>
            </div>

            {erro ? (
              <p
                className="mb-4 text-sm text-red-300 text-center rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2"
                role="alert"
              >
                {erro}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void entrarComGoogle()}
              disabled={enviando}
              className="group w-full h-[3.25rem] rounded-2xl bg-white text-zinc-900 font-semibold text-[15px] flex items-center justify-center gap-3 hover:bg-zinc-50 disabled:opacity-70 transition-all shadow-[0_8px_30px_rgba(255,255,255,0.12)] hover:shadow-[0_10px_36px_rgba(255,255,255,0.18)] hover:-translate-y-0.5 active:translate-y-0"
            >
              {enviando ? (
                <Loader2 className="w-5 h-5 animate-spin text-zinc-700" />
              ) : (
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-100 group-hover:bg-white border border-zinc-200">
                  <GoogleIcon />
                </span>
              )}
              {enviando ? 'Conectando…' : 'Entrar com Google'}
            </button>

            <div className="mt-5 flex items-start gap-2 text-[11px] text-zinc-500 leading-relaxed">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400/80" />
              <p>
                Usamos o login Google apenas para identificar sua conta. Seus jogos e
                conferências ficam isolados — outros usuários não veem seu perfil.
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-[10px] text-zinc-600 tracking-wide">
            Mega-Sena · +18 · Jogue com responsabilidade
          </p>
        </div>
      </main>

      <footer className="relative border-t border-white/5 bg-black/30 px-4 py-6">
        <div className="max-w-xl mx-auto text-center space-y-2">
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Este site/sistema <strong className="text-zinc-400">não garante acertividade</strong>{' '}
            nem prêmios. Ele é baseado em cálculos de estatística e probabilidade que ajudam a
            decidir os números a serem jogados para se ter mais chance de premiação.
          </p>
          <p className="text-[11px] text-zinc-600">
            © {YEAR} MEGA DOS MILIONÁRIOS. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" aria-hidden="true">
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
