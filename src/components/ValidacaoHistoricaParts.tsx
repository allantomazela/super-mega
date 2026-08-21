import { Loader2, Database, Wifi, WifiOff } from 'lucide-react'
import type { AcertoHistoricoConcurso, FaixaPremioHistorico } from '@/lib/validacaoHistorica'
import { formatGameString, formatTwoDigits } from '@/lib/megaEngine'

export type FiltroFaixa = 'todas' | FaixaPremioHistorico

export const FAIXA_LABEL: Record<FaixaPremioHistorico, string> = {
  quadra: 'Quadra',
  quina: 'Quina',
  sena: 'Sena',
}

export const FAIXA_CLASS: Record<FaixaPremioHistorico, string> = {
  quadra: 'text-orange-400 border-orange-500/30 bg-orange-950/40',
  quina: 'text-amber-400 border-amber-500/30 bg-amber-950/40',
  sena: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40',
}

export const CHIP_ATIVO: Record<FiltroFaixa, string> = {
  todas: 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200',
  quadra: 'bg-orange-500/20 border-orange-400/50 text-orange-200',
  quina: 'bg-amber-500/20 border-amber-400/50 text-amber-200',
  sena: 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200',
}

export const FILTROS: { id: FiltroFaixa; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'quadra', label: 'Quadras' },
  { id: 'quina', label: 'Quinas' },
  { id: 'sena', label: 'Senas' },
]

export function AcertoItem({ item }: { item: AcertoHistoricoConcurso }) {
  const setAcertadas = new Set(item.acertadas)
  return (
    <li className="px-4 py-3 space-y-2 hover:bg-[#161a1f]/80">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-white">#{item.concurso.numero}</span>
          <span className="text-zinc-500">{item.concurso.data}</span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${FAIXA_CLASS[item.faixa]}`}
          >
            {FAIXA_LABEL[item.faixa]} · {item.melhorAcertos} acertos
          </span>
        </div>
        <span className="text-[10px] text-zinc-500">
          Jogo {formatTwoDigits(item.jogoIndex + 1)}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {item.concurso.dezenas.map((n) => {
          const hit = setAcertadas.has(n)
          return (
            <span
              key={n}
              className={`w-7 h-7 rounded-full text-[11px] font-bold inline-flex items-center justify-center ${
                hit
                  ? 'bg-emerald-500/25 border border-emerald-400/50 text-emerald-200'
                  : 'bg-[#1a1f2b] border border-[#262c34] text-zinc-500'
              }`}
            >
              {formatTwoDigits(n)}
            </span>
          )
        })}
      </div>
      <p className="text-[10px] text-zinc-500 font-mono">{formatGameString(item.jogo)}</p>
    </li>
  )
}

export function StatCard({
  label,
  value,
  hint,
  accent,
  color,
  active,
  onClick,
}: {
  label: string
  value: string
  hint?: string
  accent?: boolean
  color?: string
  active?: boolean
  onClick?: () => void
}) {
  const clickable = Boolean(onClick)
  const className = `p-3.5 rounded-xl border text-left transition-colors ${
    active
      ? 'bg-cyan-950/50 border-cyan-400/45 ring-1 ring-cyan-400/30'
      : accent
        ? 'bg-cyan-950/35 border-cyan-500/30'
        : 'bg-[#161a1f] border-[#262c34]'
  } ${clickable ? 'hover:border-cyan-500/40 cursor-pointer' : ''}`

  const body = (
    <>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">{label}</div>
      <div
        className={`text-lg font-extrabold mt-0.5 ${
          active || accent ? 'text-cyan-300' : (color ?? 'text-white')
        }`}
      >
        {value}
      </div>
      {hint ? <div className="text-[10px] text-zinc-500 mt-0.5">{hint}</div> : null}
    </>
  )

  if (clickable) {
    return (
      <button type="button" onClick={onClick} className={className} aria-pressed={active}>
        {body}
      </button>
    )
  }

  return <div className={className}>{body}</div>
}

export function OrigemBadge({
  origem,
  total,
  carregando,
}: {
  origem: 'api' | 'neon' | 'estatica'
  total: number
  carregando: boolean
}) {
  const label =
    origem === 'api'
      ? `${total} concursos`
      : origem === 'neon'
        ? `${total} (histórico)`
        : `${total} (local)`
  return (
    <div
      className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold ${
        origem === 'api'
          ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-400'
          : origem === 'neon'
            ? 'bg-cyan-950/50 border-cyan-500/30 text-cyan-400'
            : 'bg-amber-950/50 border-amber-500/30 text-amber-400'
      }`}
    >
      {carregando ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : origem === 'api' ? (
        <Wifi className="w-3 h-3" />
      ) : origem === 'neon' ? (
        <Database className="w-3 h-3" />
      ) : (
        <WifiOff className="w-3 h-3" />
      )}
      <span>{label}</span>
    </div>
  )
}
