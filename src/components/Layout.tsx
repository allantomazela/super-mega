import { Outlet, useLocation, Link } from 'react-router-dom'
import { Clover, Award } from 'lucide-react'
import { useMega, MODE_LABELS } from '@/lib/MegaContext'

export default function Layout() {
  const location = useLocation()
  const isResultsPage = location.pathname.startsWith('/resultados')
  const currentYear = new Date().getFullYear()
  const { mode } = useMega()
  const modeLabel = MODE_LABELS[mode]

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
            <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/25 transition-colors shadow-[0_0_12px_rgba(16,185,129,0.3)]">
              <Clover className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
            </div>
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
