import { Link } from 'react-router-dom'
import { ArrowLeft, Copy, Check, History } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLotofacil } from '@/modules/lotofacil/hooks/LotofacilContext'
import { useLotofacilConcursos } from '@/modules/lotofacil/hooks/useLotofacilConcursos'
import {
  formatGameString,
  formatTwoDigits,
} from '@/modules/lotofacil/utils/math/combinacoes'
import { avaliarFiltros, scoreFiltros } from '@/modules/lotofacil/utils/math/filtros'
import { formatCurrencyBRL } from '@/modules/lotofacil/utils/math/caixaOficial'
import { LF_PRECO_SIMPLES } from '@/modules/lotofacil/utils/math/constants'
import { compararComHistorico } from '@/modules/lotofacil/utils/math/analiseHistorica'

export default function LotofacilResultados() {
  const { jogosGerados, selected, filtros } = useLotofacil()
  const { concursos } = useLotofacilConcursos()
  const anterior = concursos[0]?.dezenas ?? null
  const [copied, setCopied] = useState<number | null>(null)
  const [jogoCmp, setJogoCmp] = useState(0)

  const comparativo = useMemo(() => {
    const jogo = jogosGerados[jogoCmp]
    if (!jogo) return []
    return compararComHistorico(jogo, concursos, 15)
  }, [jogosGerados, jogoCmp, concursos])

  if (!jogosGerados.length) {
    return (
      <div className="space-y-4 animate-fade-in">
        <p className="text-zinc-400 text-sm">Nenhum jogo Lotofácil gerado ainda.</p>
        <Link
          to="/lotofacil"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar à seleção
        </Link>
      </div>
    )
  }

  const custo = jogosGerados.length * LF_PRECO_SIMPLES

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <section className="surface-card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-violet-500/20">
        <div>
          <Link
            to="/lotofacil"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-300 hover:text-white mb-2"
          >
            <ArrowLeft className="w-4 h-4 text-violet-400" />
            Voltar e editar
          </Link>
          <h1 className="text-lg sm:text-xl font-bold text-white">
            {jogosGerados.length} volante{jogosGerados.length === 1 ? '' : 's'} ·{' '}
            {formatCurrencyBRL(custo)}
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Pool: {selected.map(formatTwoDigits).join(' · ')}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {jogosGerados.map((jogo, idx) => {
          const av = avaliarFiltros(jogo, filtros, anterior)
          const score = scoreFiltros(jogo, filtros, anterior)
          const isCopied = copied === idx
          const ativo = jogoCmp === idx
          return (
            <div
              key={idx}
              role="button"
              tabIndex={0}
              onClick={() => setJogoCmp(idx)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setJogoCmp(idx)
              }}
              className={`surface-card rounded-xl p-3.5 border space-y-2.5 cursor-pointer transition-colors ${
                ativo
                  ? 'border-violet-500/60 ring-1 ring-violet-400/30'
                  : 'border-[#262c34] hover:border-violet-500/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-violet-300">Jogo {idx + 1}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500">Score {score}%</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      void navigator.clipboard.writeText(formatGameString(jogo))
                      setCopied(idx)
                      setTimeout(() => setCopied(null), 1200)
                    }}
                    className="text-zinc-400 hover:text-white"
                    title="Copiar"
                  >
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {jogo.map((n) => (
                  <span
                    key={n}
                    className="w-7 h-7 rounded-lg bg-violet-950/60 border border-violet-500/30 text-violet-200 text-[11px] font-bold flex items-center justify-center"
                  >
                    {formatTwoDigits(n)}
                  </span>
                ))}
              </div>
              <div className="text-[10px] text-zinc-500 leading-relaxed">
                Moldura {av.metricas.moldura} · Ímpares {av.metricas.impares} · Primos{' '}
                {av.metricas.primos} · Fib {av.metricas.fibonacci} · Soma {av.metricas.soma}
                {anterior ? ` · Rep ${av.metricas.repetidosAnterior}` : ''}
                {!av.ok ? (
                  <span className="block text-amber-400/90 mt-1">{av.motivos.join(' · ')}</span>
                ) : (
                  <span className="block text-emerald-400/80 mt-1">Dentro das faixas</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {comparativo.length > 0 ? (
        <section className="surface-card rounded-2xl p-4 border border-violet-500/20 space-y-3">
          <h2 className="text-sm font-bold text-white inline-flex items-center gap-2">
            <History className="w-4 h-4 text-violet-400" />
            Jogo {jogoCmp + 1} × últimos {comparativo.length} concursos
          </h2>
          <div className="overflow-x-auto rounded-xl border border-[#262c34]">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#12161b] text-zinc-500">
                  <th className="text-left px-3 py-2">Concurso</th>
                  <th className="text-center px-2 py-2">Acertos</th>
                  <th className="text-left px-3 py-2">Acertadas</th>
                </tr>
              </thead>
              <tbody>
                {comparativo.map((c) => (
                  <tr key={c.numero} className="border-t border-[#262c34]">
                    <td className="px-3 py-2 text-white font-semibold">
                      {c.numero}{' '}
                      <span className="text-zinc-500 font-normal">{c.data}</span>
                    </td>
                    <td className="px-2 py-2 text-center font-bold text-violet-300">{c.acertos}</td>
                    <td className="px-3 py-2 text-zinc-400">
                      {c.dezenasAcertadas.map(formatTwoDigits).join(' · ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  )
}
