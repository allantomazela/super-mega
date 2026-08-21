import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import styles from './AuthGoogleScreen.module.css'

const YEAR = new Date().getFullYear()
export const AUTH_BG = `${import.meta.env.BASE_URL}login-bg.jpg`
export const AUTH_LOGO = `${import.meta.env.BASE_URL}logo-mega.svg`

export type AuthModo = 'login' | 'cadastro'

const COPY: Record<
  AuthModo,
  {
    linha: string
    botao: string
    botaoLoading: string
    erroPadrao: string
  }
> = {
  login: {
    linha: 'Entre com Google para acessar seus jogos e histórico.',
    botao: 'Entrar com Google',
    botaoLoading: 'Conectando…',
    erroPadrao: 'Não foi possível iniciar o login com Google.',
  },
  cadastro: {
    linha: 'Crie sua conta com Google em um toque — sem senha extra.',
    botao: 'Cadastrar com Google',
    botaoLoading: 'Abrindo Google…',
    erroPadrao: 'Não foi possível iniciar o cadastro com Google.',
  },
}

interface AuthGoogleScreenProps {
  modo: AuthModo
}

/** Tela de auth centralizada: wallpaper + um card moderno de acesso. */
export function AuthGoogleScreen({ modo }: AuthGoogleScreenProps) {
  const { user, loading, signInGoogle } = useAuth()
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const copy = COPY[modo]

  if (loading) {
    return (
      <div className={styles.screenLoading}>
        <AuthBackdrop />
        <div className={styles.loadingInner}>
          <img src={AUTH_LOGO} alt="" className={styles.loadingLogo} />
          <Loader2 className={styles.spinner} />
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
    <div className={styles.screen}>
      <AuthBackdrop />

      <main className={styles.main}>
        <section className={styles.card} aria-labelledby="auth-brand-title">
          <div className={styles.cardGlow} aria-hidden />

          <div className={styles.brand}>
            <img
              src={AUTH_LOGO}
              alt="MEGA DOS MILIONÁRIOS"
              width={68}
              height={68}
              className={styles.logo}
              decoding="async"
            />
            <h1 id="auth-brand-title" className={styles.brandName}>
              MEGA DOS MILIONÁRIOS
            </h1>
          </div>

          <nav className={styles.tabs} aria-label="Modo de acesso">
            <Link
              to="/login"
              className={modo === 'login' ? styles.tabAtivo : styles.tab}
              aria-current={modo === 'login' ? 'page' : undefined}
            >
              Entrar
            </Link>
            <Link
              to="/cadastro"
              className={modo === 'cadastro' ? styles.tabAtivo : styles.tab}
              aria-current={modo === 'cadastro' ? 'page' : undefined}
            >
              Criar conta
            </Link>
          </nav>

          <p className={styles.linha}>{copy.linha}</p>

          {erro ? (
            <p className={styles.erro} role="alert">
              {erro}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => void continuarComGoogle()}
            disabled={enviando}
            className={styles.cta}
          >
            {enviando ? (
              <Loader2 className={styles.ctaSpinner} />
            ) : (
              <span className={styles.googleBadge}>
                <GoogleIcon />
              </span>
            )}
            {enviando ? copy.botaoLoading : copy.botao}
          </button>
        </section>
      </main>

      <footer className={styles.footer}>
        <p className={styles.disclaimer}>
          Este site/sistema <strong>não garante acertividade</strong> nem prêmios. Ele é baseado em
          cálculos de estatística e probabilidade que ajudam a decidir os números a serem jogados
          para se ter mais chance de premiação.
        </p>
        <p className={styles.copy}>
          © {YEAR} MEGA DOS MILIONÁRIOS. Todos os direitos reservados. Jogue com responsabilidade
          (+18).
        </p>
      </footer>
    </div>
  )
}

function AuthBackdrop() {
  return (
    <>
      <div
        className={styles.backdrop}
        style={{ backgroundImage: `url(${AUTH_BG})` }}
        role="img"
        aria-label="MEGA DOS MILIONÁRIOS"
      />
      <div className={styles.scrim} />
    </>
  )
}

function GoogleIcon() {
  return (
    <svg className={styles.googleSvg} viewBox="0 0 24 24" aria-hidden="true">
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
