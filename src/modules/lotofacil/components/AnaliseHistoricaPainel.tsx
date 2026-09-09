import { useMemo, useState } from 'react'
import { BarChart3, History } from 'lucide-react'
import type { ConcursoLotofacil } from '@/modules/lotofacil/types'
import { formatTwoDigits } from '@/modules/lotofacil/utils/math/combinacoes'
import {
  calcularFrequencias,
  compararComHistorico,
  resumoPadroes,
  topAtrasadas,
  topQuentes,
} from '@/modules/lotofacil/utils/math/analiseHistorica'

interface AnaliseHistoricaPainelProps {
  concursos: ConcursoLotofacil[]
  selected: number[]
  onToggleDezena?: (n: number) => void
}

export function AnaliseHistoricaPainel({
  concursos,
  selected,
  onToggleDezena,
}: AnaliseHistoricaPainelProps) {
  const [janela, setJanela] = useState(50)
  const stats = useMemo(() => calcularFrequencias(concursos, janela), [concursos, janela])
  const padroes = useMemo(() => resumoPadroes(concursos, janela), [concursos, janela])
  const quentes = useMemo(() => topQuentes(stats, 10), [stats])
  const frias = useMemo(() => topAtrasadas(stats, 10), [stats])
  const comparativo = useMemo(
    () => (selected.length >= 15 ? compararComHistorico(selected, concursos, 12) : []),
    [selected, concursos],
  )

  if (concursos.length === 0) {
    return (
      <div className="surface-card rounded-2xl p-4 border border-violet-500/20 text-sm text-zinc-400">
        Sem histórico suficiente para análise. Rode o sync Lotofácil no Neon.
      </div>
    )
  }

  return (
    <section className="surface-card rounded-2xl p-4 sm:p-5 border border-violet-500/20 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-white inline-flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-violet-400" />
          Análise histórica
        </h2>
        <label className="text-[11px] text-zinc-400 flex items-center gap-2">
          Janela
          <select
            value={janela}
            onChange={(e) => setJanela(Number(e.target.value))}
            className="h-8 rounded-lg bg-[#1a1f2b] border border-[#262c34] px-2 text-zinc-200"
          >
            {[30, 50, 100, 200, 500, 1000].map((n) => (
              <option key={n} value={n} disabled={n > concursos.length && n > 50}>
                {n} concursos
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-[11px] text-zinc-500 leading-relaxed">
        Quentes/frias e médias ajudam a montar o grupo. Com 15+ dezenas selecionadas, a tabela
        mostra quantos acertos seu grupo teria tido nos últimos sorteios (visão retrospectiva).
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <MiniStat label="Moldura méd." value={padroes.mediaMoldura.toFixed(1)} />
        <MiniStat label="Ímpares méd." value={padroes.mediaImpares.toFixed(1)} />
        <MiniStat label="Primos méd." value={padroes.mediaPrimos.toFixed(1)} />
        <MiniStat label="Soma méd." value={padroes.mediaSoma.toFixed(0)} />
        <MiniStat label="Repetência" value={padroes.mediaRepetencia.toFixed(1)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ChipGroup
          title="Mais sorteadas (quentes)"
          items={quentes.map((s) => ({
            n: s.dezena,
            hint: `${s.frequencia}×`,
          }))}
          selected={selected}
          onToggle={onToggleDezena}
          accent="violet"
        />
        <ChipGroup
          title="Mais atrasadas (frias)"
          items={frias.map((s) => ({
            n: s.dezena,
            hint: `${s.atraso} atr.`,
          }))}
          selected={selected}
          onToggle={onToggleDezena}
          accent="amber"
        />
      </div>

      {comparativo.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 inline-flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" />
            Seu grupo × últimos {comparativo.length} sorteios
          </h3>
          <div className="overflow-x-auto rounded-xl border border-[#262c34]">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#12161b] text-zinc-500">
                  <th className="text-left px-3 py-2 font-semibold">Concurso</th>
                  <th className="text-left px-2 py-2 font-semibold">Data</th>
                  <th className="text-center px-2 py-2 font-semibold">Acertos</th>
                  <th className="text-left px-3 py-2 font-semibold">Dezenas</th>
                </tr>
              </thead>
              <tbody>
                {comparativo.map((c) => (
                  <tr key={c.numero} className="border-t border-[#262c34]">
                    <td className="px-3 py-2 text-white font-semibold">{c.numero}</td>
                    <td className="px-2 py-2 text-zinc-400">{c.data}</td>
                    <td className="px-2 py-2 text-center">
                      <span
                        className={`inline-flex min-w-[2rem] justify-center px-2 py-0.5 rounded-full font-bold ${
                          c.acertos >= 14
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : c.acertos >= 11
                              ? 'bg-violet-500/20 text-violet-300'
                              : 'bg-[#1a1f2b] text-zinc-400'
                        }`}
                      >
                        {c.acertos}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {c.dezenas.map((n) => {
                          const hit = c.dezenasAcertadas.includes(n)
                          return (
                            <span
                              key={n}
                              className={`w-6 h-6 rounded-md text-[10px] font-bold flex items-center justify-center ${
                                hit
                                  ? 'bg-violet-500 text-white'
                                  : 'bg-[#161a1f] text-zinc-500 border border-[#262c34]'
                              }`}
                            >
                              {formatTwoDigits(n)}
                            </span>
                          )
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-zinc-500">
            Acertos = quantas dezenas do seu grupo atual apareceram naquele concurso (simulação
            retrospectiva).
          </p>
        </div>
      ) : (
        <p className="text-[11px] text-zinc-500">
          Selecione 15+ dezenas para comparar o grupo com os sorteios anteriores.
        </p>
      )}
    </section>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#262c34] bg-[#161a1f] px-2.5 py-2 text-center">
      <div className="text-[9px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="text-sm font-extrabold text-violet-300 tabular-nums">{value}</div>
    </div>
  )
}

function ChipGroup({
  title,
  items,
  selected,
  onToggle,
  accent,
}: {
  title: string
  items: { n: number; hint: string }[]
  selected: number[]
  onToggle?: (n: number) => void
  accent: 'violet' | 'amber'
}) {
  return (
    <div className="rounded-xl border border-[#262c34] bg-[#12161b] p-3 space-y-2">
      <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => {
          const on = selected.includes(it.n)
          return (
            <button
              key={it.n}
              type="button"
              disabled={!onToggle}
              onClick={() => onToggle?.(it.n)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                on
                  ? accent === 'violet'
                    ? 'bg-violet-600 border-violet-400/50 text-white'
                    : 'bg-amber-600 border-amber-400/50 text-white'
                  : 'bg-[#1a1f2b] border-[#262c34] text-zinc-300 hover:border-zinc-500'
              } ${!onToggle ? 'cursor-default' : ''}`}
              title={onToggle ? 'Incluir/remover da seleção' : undefined}
            >
              {formatTwoDigits(it.n)}
              <span className="opacity-70 font-medium">{it.hint}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
