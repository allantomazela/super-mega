import { Outlet, useLocation, Link } from 'react-router-dom'
import { Award, LogOut } from 'lucide-react'
import { useMega, MODE_LABELS } from '@/lib/MegaContext'
import { useAuth } from '@/lib/AuthContext'

export default function Layout() {
  const location = useLocation()
  const isResultsPage = location.pathname.startsWith('/resultados')
  const currentYear = new Date().getFullYear()
  const { mode } = useMega()
  const modeLabel = MODE_LABELS[mode]
  const { user, signOut } = useAuth()

  return (
    <div className="flex flex-col min-h-screen bg-[#0d0f12] text-foreground">
      {/* Sticky Header with Backdrop Blur */}
      <header className="sticky top-0 z-40 w-full border-b border-[#262c34] bg-[#0d0f12]/85 backdrop-blur-md">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo + Title */}
          <Link
            to="/"
            className="flex items-center gap-3 group transition-opacity hover:opacity-90"
            title="Voltar ao início"
          >
            <img
              src={`${import.meta.env.BASE_URL}favicon.svg`}
              alt="Otimizador Mega-Sena"
              className="w-10 h-10 rounded-xl border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
            />
            <div className="flex flex-col">
              <span className="text-sm sm:text-base font-semibold text-white tracking-tight leading-tight">
                Otimizador Estratégico
              </span>
              <span className="text-xs text-emerald-400 font-medium tracking-wide">Mega-Sena</span>
            </div>
          </Link>

          {/* Right Side: Step breadcrumb + Badge */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Subtle Breadcrumb (Desktop/Tablet) */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full bg-[#161a1f] border border-[#262c34]">
              <span className={!isResultsPage ? 'text-emerald-400 font-semibold' : 'text-zinc-500'}>
                Passo 1: Seleção
              </span>
              <span className="text-zinc-600">/</span>
              <span className={isResultsPage ? 'text-emerald-400 font-semibold' : 'text-zinc-500'}>
                Passo 2: Resultados
              </span>
            </div>

            {/* Mega-Sena Badge + Modo ativo */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#161a1f] border border-[#262c34] text-zinc-300 text-xs font-medium">
                <span className="font-semibold text-emerald-400">{modeLabel}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-medium shadow-sm">
                <Award className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold">Mega-Sena</span>
              </div>
              {user ? (
                <div className="flex items-center gap-2 pl-1">
                  {user.image ? (
                    <img
                      src={user.image}
                      alt=""
                      className="w-8 h-8 rounded-full border border-[#262c34]"
                    />
                  ) : null}
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

      {/* Main Container */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-[#262c34] bg-[#0d0f12]/60 py-5">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 text-center text-xs text-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Ferramenta de estudo e otimização — não há garantia de prêmios.</span>
          <span className="text-zinc-600">
            © {currentYear} Otimizador Estratégico Mega-Sena. Jogue com responsabilidade (+18).
          </span>
        </div>
      </footer>
    </div>
  )
}
