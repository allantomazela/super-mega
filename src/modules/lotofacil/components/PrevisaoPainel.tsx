import { useMemo, useState } from 'react'
import { Sparkles, Wand2 } from 'lucide-react'
import type { ConcursoLotofacil, FiltrosLotofacil } from '@/modules/lotofacil/types'
import { formatTwoDigits } from '@/modules/lotofacil/utils/math/combinacoes'
import {
  PREVISAO_VERSAO,
  type PerfilPrevisao,
  preverProximasDezenas,
} from '@/modules/lotofacil/utils/math/analiseHistorica'
import { LF_TICKET } from '@/modules/lotofacil/utils/math/constants'
import { avaliarFiltros } from '@/modules/lotofacil/utils/math/filtros'

interface PrevisaoPainelProps {
  concursos: ConcursoLotofacil[]
  filtros: FiltrosLotofacil
  onAplicar: (dezenas: number[]) => void
}

const PERFIS: { id: PerfilPrevisao; label: string; hint: string }[] = [
  { id: 'equilibrado', label: 'Equilibrado', hint: 'Freq. + atraso + recente' },
  { id: 'quente', label: 'Quentes', hint: 'Prioriza as mais sorteadas' },
  { id: 'fria', label: 'Frias', hint: 'Prioriza as mais atrasadas' },
  { id: 'recente', label: 'Recente', hint: 'Prioriza presença nos últimos jogos' },
]

const JANELAS = [50, 100, 120, 200, 500] as const

export function PrevisaoPainel({ concursos, filtros, onAplicar }: PrevisaoPainelProps) {
  const [perfil, setPerfil] = useState<PerfilPrevisao>('equilibrado')
  const [janela, setJanela] = useState<number>(120)

  const previsao = useMemo(
    () => preverProximasDezenas(concursos, LF_TICKET, janela, perfil),
    [concursos, janela, perfil],
  )
  const anterior = concursos[0]?.dezenas ?? null
  const avaliacao = useMemo(
    () => avaliarFiltros(previsao.dezenas, filtros, anterior),
    [previsao.dezenas, filtros, anterior],
  )

  const topSugestao = previsao.ranking.slice(0, 15)

  if (concursos.length < 5) {
    return (
      <div className="surface-card rounded-2xl p-4 border border-violet-500/20 text-sm text-zinc-400">
        Histórico curto demais para montar a sugestão estatística.
      </div>
    )
  }

  return (
    <section className="surface-card rounded-2xl p-4 sm:p-5 border border-fuchsia-500/25 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-white inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-fuchsia-400" />
            Sugestão para o próximo concurso
          </h2>
          <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed max-w-xl">
            Heurística v{PREVISAO_VERSAO} sobre {previsao.janela} concursos. Use “Aplicar na grade”
            como ponto de partida e refine com análise histórica + filtros.{' '}
            <strong className="text-zinc-300">Não prevê o futuro</strong> nem garante prêmio — serve
            para aumentar a aderência da sua escolha.
          </p>
        </div>
        <label className="text-[11px] text-zinc-400 flex items-center gap-2">
          Janela
          <select
            value={janela}
            onChange={(e) => setJanela(Number(e.target.value))}
            className="h-8 rounded-lg bg-[#1a1f2b] border border-[#262c34] px-2 text-zinc-200"
          >
            {JANELAS.map((n) => (
              <option key={n} value={n} disabled={n > concursos.length && n !== 50}>
                {n} concursos
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {PERFIS.map((p) => {
          const ativo = perfil === p.id
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPerfil(p.id)}
              title={p.hint}
              className={`rounded-xl px-2.5 py-2 text-left border transition-colors ${
                ativo
                  ? 'bg-fuchsia-600/25 border-fuchsia-400/50 text-white'
                  : 'bg-[#161a1f] border-[#262c34] text-zinc-400 hover:text-white hover:border-zinc-500'
              }`}
            >
              <div className="text-xs font-bold">{p.label}</div>
              <div className="text-[10px] opacity-70 leading-tight">{p.hint}</div>
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {previsao.dezenas.map((n) => (
          <span
            key={n}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white text-xs font-extrabold flex items-center justify-center shadow-[0_0_12px_rgba(168,85,247,0.35)]"
          >
            {formatTwoDigits(n)}
          </span>
        ))}
      </div>

      <div className="text-[11px] text-zinc-400">
        Moldura {avaliacao.metricas.moldura} · Ímpares {avaliacao.metricas.impares} · Primos{' '}
        {avaliacao.metricas.primos} · Fib {avaliacao.metricas.fibonacci} · Soma{' '}
        {avaliacao.metricas.soma}
        {anterior ? ` · Rep ${avaliacao.metricas.repetidosAnterior}` : ''}
        {avaliacao.ok ? (
          <span className="text-emerald-400"> · dentro das faixas</span>
        ) : (
          <span className="text-amber-400"> · {avaliacao.motivos[0]}</span>
        )}
      </div>

      <button
        type="button"
        onClick={() => onAplicar(previsao.dezenas)}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-bold"
      >
        <Wand2 className="w-4 h-4" />
        Aplicar estas 15 na grade
      </button>

      <div className="rounded-xl border border-[#262c34] overflow-hidden">
        <div className="bg-[#12161b] px-3 py-2 text-[10px] uppercase tracking-wide text-zinc-500 font-semibold">
          Ranking das 15 mais pontuadas · perfil {perfil}
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-px bg-[#262c34]">
          {topSugestao.map((r, idx) => (
            <div key={r.dezena} className="bg-[#161a1f] px-2 py-2 text-center">
              <div className="text-[9px] text-zinc-500">#{idx + 1}</div>
              <div className="text-sm font-extrabold text-violet-300">
                {formatTwoDigits(r.dezena)}
              </div>
              <div className="text-[10px] text-zinc-500 tabular-nums">
                {(r.score * 100).toFixed(0)} pts
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
