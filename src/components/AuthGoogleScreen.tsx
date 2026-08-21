import { useState, type ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Loader2, Lock, ShieldCheck, UserPlus, LogIn } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'

const YEAR = new Date().getFullYear()
export const AUTH_BG = `${import.meta.env.BASE_URL}login-bg.jpg`
export const AUTH_LOGO = `${import.meta.env.BASE_URL}logo-mega.svg`

export type AuthModo = 'login' | 'cadastro'

const COPY: Record<
  AuthModo,
  {
    eyebrow: string
    titulo: string
    descricao: string
    selo: string
    botao: string
    botaoLoading: string
    erroPadrao: string
    rodapeAcao: ReactNode
  }
> = {
  login: {
    eyebrow: 'Acesso à sua conta',
    titulo: 'Entrar',
    descricao:
      'Entre com Google para gerar jogos, guardar histórico privado e receber alertas de premiação.',
    selo: 'Login seguro · dados só seus',
    botao: 'Entrar com Google',
    botaoLoading: 'Conectando…',
    erroPadrao: 'Não foi possível iniciar o login com Google.',
    rodapeAcao: (
      <>
        Ainda não tem conta?{' '}
        <Link to="/cadastro" className="text-amber-200 font-semibold hover:text-amber-100 underline-offset-2 hover:underline">
          Criar conta com Google
        </Link>
      </>
    ),
  },
  cadastro: {
    eyebrow: 'Primeiro acesso',
    titulo: 'Criar conta',
    descricao:
      'Cadastre-se com a sua conta Google. Na primeira autorização, seu perfil privado é criado automaticamente — sem senha extra.',
    selo: 'Cadastro seguro via Google',
    botao: 'Cadastrar com Google',
    botaoLoading: 'Abrindo Google…',
    erroPadrao: 'Não foi possível iniciar o cadastro com Google.',
    rodapeAcao: (
      <>
        Já tem conta?{' '}
        <Link to="/login" className="text-amber-200 font-semibold hover:text-amber-100 underline-offset-2 hover:underline">
          Entrar com Google
        </Link>
      </>
    ),
  },
}

interface AuthGoogleScreenProps {
  modo: AuthModo
}

/** Tela pública de auth (login ou cadastro) — ambos usam OAuth Google do Neon Auth. */
export function AuthGoogleScreen({ modo }: AuthGoogleScreenProps) {
  const { user, loading, signInGoogle } = useAuth()
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const copy = COPY[modo]
  const IconModo = modo === 'cadastro' ? UserPlus : LogIn

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center relative"
        style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${AUTH_BG})` }}
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative flex flex-col items-center gap-3">
          <img src={AUTH_LOGO} alt="" className="w-16 h-16 animate-pulse rounded-2xl" />
          <Loader2 className="w-6 h-6 text-amber-200 animate-spin" />
        </div>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  async function continuarComGoogle() {
    setErro(null)
    setEnviando(true)
    try {
      await signInGoogle()
    } catch (error) {
      setEnviando(false)
      setErro(error instanceof Error ? error.message : copy.erroPadrao)
    }
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden flex flex-col text-zinc-100"
      style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}
    >
      <style>{`
        @keyframes megaRise {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .mega-rise { animation: megaRise 0.75s ease-out both; }
      `}</style>

      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${AUTH_BG})` }}
        role="img"
        aria-label="MEGA DOS MILIONÁRIOS"
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.25) 55%, rgba(3,10,8,0.82) 78%, rgba(2,6,5,0.94) 100%)',
        }}
      />

      <main className="relative flex-1 flex flex-col justify-end sm:justify-center items-center px-4 pb-8 pt-[42vh] sm:pt-8 sm:pb-10">
        <div className="w-full max-w-md mega-rise">
          {/* Toggle visual Login | Cadastro */}
          <div className="mb-3 flex rounded-2xl border border-white/10 bg-black/35 p-1 backdrop-blur-sm">
            <Link
              to="/login"
              className={`flex-1 h-10 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors ${
                modo === 'login'
                  ? 'bg-amber-400/90 text-[#0a1f14] shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Entrar
            </Link>
            <Link
              to="/cadastro"
              className={`flex-1 h-10 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors ${
                modo === 'cadastro'
                  ? 'bg-amber-400/90 text-[#0a1f14] shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Criar conta
            </Link>
          </div>

          <div
            className="rounded-[1.75rem] border border-amber-200/20 p-6 sm:p-7 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
            style={{
              background:
                'linear-gradient(165deg, rgba(8,18,14,0.88) 0%, rgba(4,12,10,0.94) 100%)',
              backdropFilter: 'blur(18px)',
            }}
          >
            <div className="text-center mb-5">
              <p
                className="text-[11px] tracking-[0.22em] uppercase text-amber-200/85 font-semibold mb-1"
                style={{ fontFamily: "'Syne', 'Outfit', sans-serif" }}
              >
                {copy.eyebrow}
              </p>
              <h1
                className="text-xl sm:text-2xl font-extrabold text-white mb-2"
                style={{ fontFamily: "'Syne', 'Outfit', sans-serif" }}
              >
                {copy.titulo}
              </h1>
              <p className="text-sm text-zinc-300 leading-relaxed">{copy.descricao}</p>
            </div>

            {modo === 'cadastro' ? (
              <ul className="mb-5 space-y-2 text-[11px] text-zinc-400">
                <li className="flex gap-2">
                  <span className="text-amber-300">✓</span>
                  Perfil privado vinculado ao seu Google
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-300">✓</span>
                  Histórico de jogos e alertas de premiação
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-300">✓</span>
                  Sem criar senha — autenticação oficial do Google
                </li>
              </ul>
            ) : null}

            <div className="flex items-center justify-center gap-2 text-[11px] text-emerald-300/90 mb-4">
              <Lock className="w-3.5 h-3.5" />
              <span>{copy.selo}</span>
            </div>

            {erro ? (
              <p
                className="mb-4 text-sm text-red-200 text-center rounded-xl border border-red-400/30 bg-red-950/50 px-3 py-2"
                role="alert"
              >
                {erro}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void continuarComGoogle()}
              disabled={enviando}
              className="group w-full h-[3.25rem] rounded-2xl bg-white text-zinc-900 font-semibold text-[15px] flex items-center justify-center gap-3 hover:bg-zinc-50 disabled:opacity-70 transition-all shadow-[0_8px_30px_rgba(255,255,255,0.14)] hover:-translate-y-0.5 active:translate-y-0"
            >
              {enviando ? (
                <Loader2 className="w-5 h-5 animate-spin text-zinc-700" />
              ) : (
                <>
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200">
                    <GoogleIcon />
                  </span>
                  <IconModo className="w-4 h-4 text-zinc-500 hidden sm:block" />
                </>
              )}
              {enviando ? copy.botaoLoading : copy.botao}
            </button>

            <div className="mt-4 flex items-start gap-2 text-[11px] text-zinc-400 leading-relaxed">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400/90" />
              <p>
                {modo === 'cadastro'
                  ? 'Ao continuar, você autoriza o MEGA DOS MILIONÁRIOS a usar sua identidade Google para criar/acessar o perfil. Não pedimos senha própria.'
                  : 'Seu histórico fica isolado por conta Google. Outros usuários não têm acesso ao seu perfil.'}
              </p>
            </div>

            <p className="mt-5 text-center text-[12px] text-zinc-400">{copy.rodapeAcao}</p>
          </div>
        </div>
      </main>

      <footer className="relative border-t border-white/10 bg-black/50 backdrop-blur-sm px-4 py-5">
        <div className="max-w-xl mx-auto text-center space-y-2">
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Este site/sistema <strong className="text-zinc-300">não garante acertividade</strong> nem
            prêmios. Ele é baseado em cálculos de estatística e probabilidade que ajudam a decidir
            os números a serem jogados para se ter mais chance de premiação.
          </p>
          <p className="text-[11px] text-zinc-500">
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
