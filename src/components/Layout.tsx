import { Outlet, useLocation, Link } from 'react-router-dom'
import { Award, LogOut, User } from 'lucide-react'
import { useMega, MODE_LABELS } from '@/lib/MegaContext'
import { useAuth } from '@/lib/AuthContext'
import { AlertaPremiosHistorico } from '@/components/AlertaPremiosHistorico'
import { InstalarPwa } from '@/components/InstalarPwa'
import logoMega from '@/assets/logo-mega.svg'

export default function Layout() {
  const location = useLocation()
  const isResultsPage = location.pathname.startsWith('/resultados')
  const isPerfil = location.pathname.startsWith('/perfil')
  const currentYear = new Date().getFullYear()
  const { mode } = useMega()
  const modeLabel = MODE_LABELS[mode]
  const { user, signOut } = useAuth()

  return (
    <div className="flex flex-col min-h-screen min-h-[100dvh] bg-[#0d0f12] text-foreground">
      <AlertaPremiosHistorico />

      <header className="sticky top-0 z-40 w-full border-b border-[#262c34] bg-[#0d0f12]/85 backdrop-blur-md pt-[env(safe-area-inset-top)]">
        <div className="max-w-[1200px] mx-auto px-3 sm:px-6 min-h-14 sm:min-h-16 py-2 flex items-center justify-between gap-2">
          <Link
            to="/"
            className="flex items-center gap-2 sm:gap-3 group transition-opacity hover:opacity-90 min-w-0"
            title="Voltar ao início"
          >
            <img
              src={logoMega}
              alt="MEGA DOS MILIONÁRIOS"
              className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-xl border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
            />
            <div className="flex flex-col min-w-0">
              <span
                className="text-[11px] sm:text-sm md:text-base font-extrabold text-white tracking-tight leading-tight truncate"
                style={{ fontFamily: "'Syne', 'Manrope', system-ui, sans-serif" }}
              >
                MEGA DOS MILIONÁRIOS
              </span>
              <span className="hidden min-[400px]:block text-[10px] sm:text-xs text-emerald-400 font-medium tracking-wide">
                Otimizador Mega-Sena
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
            {!isPerfil ? (
              <div className="hidden sm:flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full bg-[#161a1f] border border-[#262c34]">
                <span className={!isResultsPage ? 'text-emerald-400 font-semibold' : 'text-zinc-500'}>
                  Passo 1: Seleção
                </span>
                <span className="text-zinc-600">/</span>
                <span className={isResultsPage ? 'text-emerald-400 font-semibold' : 'text-zinc-500'}>
                  Passo 2: Resultados
                </span>
              </div>
            ) : null}

            <div className="flex items-center gap-1.5 sm:gap-2">
              <InstalarPwa variante="icone" />
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#161a1f] border border-[#262c34] text-zinc-300 text-xs font-medium">
                <span className="font-semibold text-emerald-400">{modeLabel}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-medium shadow-sm">
                <Award className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold hidden sm:inline">Mega-Sena</span>
              </div>
              {user ? (
                <div className="flex items-center gap-2 pl-1">
                  <Link
                    to="/perfil"
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#161a1f] border border-[#262c34] text-zinc-300 text-xs font-medium hover:text-white hover:border-emerald-500/40"
                    title="Meu perfil e histórico"
                  >
                    {user.image ? (
                      <img
                        src={user.image}
                        alt=""
                        className="w-7 h-7 rounded-full border border-[#262c34]"
                      />
                    ) : (
                      <User className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">Perfil</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#161a1f] border border-[#262c34] text-zinc-300 text-xs font-medium hover:text-white hover:border-zinc-500"
                    title="Sair"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Sair</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-3 sm:px-6 py-4 sm:py-8">
        <Outlet />
      </main>

      <footer className="border-t border-[#262c34] bg-[#0d0f12]/60 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 text-center space-y-2">
          <p className="text-[11px] text-zinc-500 leading-relaxed max-w-3xl mx-auto">
            Este site/sistema <strong className="text-zinc-400">não garante acertividade</strong> nem
            prêmios. Ele é baseado em cálculos de estatística e probabilidade que ajudam a decidir
            os números a serem jogados para se ter mais chance de premiação.
          </p>
          <p className="text-[11px] text-zinc-600">
            © {currentYear} MEGA DOS MILIONÁRIOS. Todos os direitos reservados. Jogue com
            responsabilidade (+18).
          </p>
        </div>
      </footer>
    </div>
  )
}
