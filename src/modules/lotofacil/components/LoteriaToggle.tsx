import { Link, useLocation } from 'react-router-dom'
import { Award, Grid3x3 } from 'lucide-react'

/** Alternância Mega-Sena ↔ Lotofácil no header (único ponto compartilhado de navegação). */
export function LoteriaToggle() {
  const { pathname } = useLocation()
  const isLotofacil = pathname.startsWith('/lotofacil')

  return (
    <div
      className="flex items-center rounded-full border border-[#262c34] bg-[#161a1f] p-0.5 text-[11px] sm:text-xs font-semibold"
      role="group"
      aria-label="Escolher loteria"
    >
      <Link
        to="/"
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full transition-colors ${
          !isLotofacil
            ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
            : 'text-zinc-400 hover:text-white'
        }`}
        title="Mega-Sena"
      >
        <Award className="w-3.5 h-3.5" />
        <span className="hidden min-[420px]:inline">Mega-Sena</span>
        <span className="min-[420px]:hidden">Mega</span>
      </Link>
      <Link
        to="/lotofacil"
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full transition-colors ${
          isLotofacil
            ? 'bg-violet-950/80 border border-violet-500/40 text-violet-300'
            : 'text-zinc-400 hover:text-white'
        }`}
        title="Lotofácil"
      >
        <Grid3x3 className="w-3.5 h-3.5" />
        <span className="hidden min-[420px]:inline">Lotofácil</span>
        <span className="min-[420px]:hidden">Loto</span>
      </Link>
    </div>
  )
}
