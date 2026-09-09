import { Link, useLocation } from 'react-router-dom'
import { Award, Grid3x3 } from 'lucide-react'

/** Seletor visual Mega-Sena ↔ Lotofácil — destaque no header. */
export function LoteriaToggle() {
  const { pathname } = useLocation()
  const isLotofacil = pathname.startsWith('/lotofacil')

  return (
    <div
      className="w-full sm:w-auto grid grid-cols-2 gap-1 p-1 rounded-2xl border border-[#2a3140] bg-[#0f1318] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      role="group"
      aria-label="Escolher loteria"
    >
      <Link
        to="/"
        aria-current={!isLotofacil ? 'page' : undefined}
        className={`relative inline-flex items-center justify-center gap-2 min-h-11 px-3 sm:px-5 rounded-xl text-sm font-extrabold tracking-tight transition-all ${
          !isLotofacil
            ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-[0_0_18px_rgba(16,185,129,0.45)] border border-emerald-300/40'
            : 'text-zinc-400 hover:text-white hover:bg-[#1a1f2b]'
        }`}
      >
        <Award className={`w-4 h-4 ${!isLotofacil ? 'text-emerald-100' : 'text-emerald-500/80'}`} />
        Mega-Sena
      </Link>
      <Link
        to="/lotofacil"
        aria-current={isLotofacil ? 'page' : undefined}
        className={`relative inline-flex items-center justify-center gap-2 min-h-11 px-3 sm:px-5 rounded-xl text-sm font-extrabold tracking-tight transition-all ${
          isLotofacil
            ? 'bg-gradient-to-br from-violet-500 to-fuchsia-700 text-white shadow-[0_0_18px_rgba(139,92,246,0.5)] border border-violet-300/40'
            : 'text-zinc-400 hover:text-white hover:bg-[#1a1f2b]'
        }`}
      >
        <Grid3x3 className={`w-4 h-4 ${isLotofacil ? 'text-violet-100' : 'text-violet-400/80'}`} />
        Lotofácil
      </Link>
    </div>
  )
}
