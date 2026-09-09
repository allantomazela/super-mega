import { Outlet, useLocation, Link } from 'react-router-dom'
import { LogOut, User } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { AlertaPremiosHistorico } from '@/components/AlertaPremiosHistorico'
import { AlertaPremiosLotofacil } from '@/modules/lotofacil/components/AlertaPremiosLotofacil'
import { InstalarPwa } from '@/components/InstalarPwa'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LoteriaToggle } from '@/modules/lotofacil/components/LoteriaToggle'
import logoMega from '@/assets/logo-mega.svg'

export default function Layout() {
  const location = useLocation()
  const isLotofacil = location.pathname.startsWith('/lotofacil')
  const isPerfil = location.pathname.startsWith('/perfil')
  const currentYear = new Date().getFullYear()
  const { user, signOut } = useAuth()
  const homeTo = isLotofacil ? '/lotofacil' : '/'

  return (
    <div className="flex flex-col min-h-screen min-h-[100dvh] bg-background text-foreground">
      {isLotofacil ? <AlertaPremiosLotofacil /> : <AlertaPremiosHistorico />}

      <header className="app-shell-header sticky top-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur-md pt-[env(safe-area-inset-top)]">
        <div className="max-w-[1200px] mx-auto px-3 sm:px-6 py-2 sm:py-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Link
              to={homeTo}
              className="flex items-center gap-2 sm:gap-3 min-w-0 group hover:opacity-90"
              title="Voltar ao início"
            >
              <img
                src={logoMega}
                alt="MEGA DOS MILIONÁRIOS"
                className={`w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl border shadow-[0_0_12px_rgba(16,185,129,0.28)] ${
                  isLotofacil ? 'border-violet-500/45' : 'border-emerald-500/40'
                }`}
              />
              <div className="flex flex-col min-w-0">
                <span
                  className="text-[12px] sm:text-sm md:text-base font-extrabold text-foreground tracking-tight leading-[1.15]"
                  style={{ fontFamily: "'Syne', 'Manrope', system-ui, sans-serif" }}
                >
                  <span className="sm:hidden">
                    MEGA DOS
                    <br />
                    MILIONÁRIOS
                  </span>
                  <span className="hidden sm:inline whitespace-nowrap">MEGA DOS MILIONÁRIOS</span>
                </span>
                <span
                  className={`brand-sub text-[10px] sm:text-xs font-medium tracking-wide ${
                    isLotofacil
                      ? 'text-violet-500 dark:text-violet-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {isLotofacil ? 'Lotofácil' : 'Mega-Sena'}
                  {!isPerfil ? (
                    <span className="text-muted-foreground font-normal"> · otimizador</span>
                  ) : null}
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <ThemeToggle />
              <InstalarPwa variante="icone" />
              {user ? (
                <>
                  <Link
                    to="/perfil"
                    className="inline-flex items-center gap-1.5 h-9 px-2 sm:px-2.5 rounded-full bg-card border border-border text-muted-foreground text-xs font-medium hover:text-foreground hover:border-emerald-500/40"
                    title="Meu perfil e histórico"
                  >
                    {user.image ? (
                      <img
                        src={user.image}
                        alt=""
                        className="w-6 h-6 rounded-full border border-border"
                      />
                    ) : (
                      <User className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">Perfil</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-full bg-card border border-border text-muted-foreground text-xs font-medium hover:text-foreground hover:border-zinc-500"
                    title="Sair"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Sair</span>
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {!isPerfil ? (
            <div className="flex justify-stretch sm:justify-center">
              <LoteriaToggle />
            </div>
          ) : null}
        </div>
      </header>

      <main className="app-shell-main flex-1 max-w-[1200px] w-full mx-auto px-3 sm:px-6 py-3 sm:py-8">
        <Outlet />
      </main>

      <footer className="app-shell-footer border-t border-border bg-background/60 py-4 sm:py-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 text-center space-y-2">
          <p className="text-[11px] text-muted-foreground leading-relaxed max-w-3xl mx-auto">
            Este site/sistema{' '}
            <strong className="text-foreground/80">não garante acertividade</strong> nem prêmios. Ele
            é baseado em cálculos de estatística e probabilidade que ajudam a decidir os números a
            serem jogados para se ter mais chance de premiação.
          </p>
          <p className="text-[11px] text-muted-foreground/80">
            © {currentYear} MEGA DOS MILIONÁRIOS. Todos os direitos reservados. Jogue com
            responsabilidade (+18).
          </p>
        </div>
      </footer>
    </div>
  )
}
