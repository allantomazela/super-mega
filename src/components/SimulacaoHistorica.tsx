import React, { useMemo } from 'react'
import { History, Trophy, Wifi, WifiOff, Award, Database } from 'lucide-react'
import {
  montarResumoSimulacao,
  simularConjunto,
  ResumoSimulacao,
  ResultadoJogoSimulacao,
} from '@/data/concursosHistoricos'
import { formatGameString } from '@/lib/megaEngine'
import { useConcursos } from '@/hooks/useConcursos'

/* ============================================================
 * SimulacaoHistorica — compara jogos gerados contra a base
 * real de concursos da Mega-Sena.
 *
 * Suporta dois modos:
 *  - individual: cada jogo é avaliado separadamente (Desdobramento)
 *  - conjunto:   qualquer um dos jogos acertando já conta (5 Jogos)
 * ============================================================ */

interface SimulacaoHistoricaProps {
  /** Jogos a simular. */
  jogos: number[][]
  /** Se true, avalia os jogos em conjunto (Modo 5 Jogos). */
  conjunto?: boolean
}

export const SimulacaoHistorica: React.FC<SimulacaoHistoricaProps> = ({
  jogos,
  conjunto = false,
}) => {
  const { concursos, origem } = useConcursos()

  // Resultado da simulação — sempre calcula quando há jogos, usando os
  // concursos atuais (estáticos ou ao vivo). Não gateia por carregamento.
  const resumo = useMemo<ResumoSimulacao | null>(() => {
    if (jogos.length === 0) return null
    if (conjunto) {
      // Modo conjunto: um único resultado agregado
      const r = simularConjunto(jogos, concursos)
      const agregado: ResumoSimulacao = {
        jogos: [r],
        totalConcursos: concursos.length,
        taxaAcertoMedia: r.taxaAcerto,
        totalQuadras: r.quadras,
        totalQuinas: r.quinas,
        totalSenas: r.senas,
        origem,
      }
      return agregado
    }
    return montarResumoSimulacao(jogos, concursos, origem)
  }, [jogos, concursos, conjunto, origem])

  // Top 10 jogos por taxa de acerto
  const top10 = useMemo<ResultadoJogoSimulacao[]>(() => {
    if (!resumo) return []
    return [...resumo.jogos].sort((a, b) => b.taxaAcerto - a.taxaAcerto).slice(0, 10)
  }, [resumo])

  return (
    <div className="surface-card rounded-2xl p-5 sm:p-6 border border-emerald-500/20 shadow-lg space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-3 border-b border-[#262c34] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              📊 Simulação Histórica
            </h3>
            <p className="text-xs text-zinc-400">
              {conjunto
                ? 'Conjunto de jogos avaliado contra concursos reais'
                : 'Cada jogo avaliado contra concursos reais'}
            </p>
          </div>
        </div>

        {/* Badge de origem dos dados */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold ${
            origem === 'api'
              ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-400'
              : origem === 'neon'
                ? 'bg-cyan-950/50 border-cyan-500/30 text-cyan-400'
                : 'bg-amber-950/50 border-amber-500/30 text-amber-400'
          }`}
        >
          {origem === 'api' ? (
            <Wifi className="w-3 h-3" />
          ) : origem === 'neon' ? (
            <Database className="w-3 h-3" />
          ) : (
            <WifiOff className="w-3 h-3" />
          )}
          <span>
            {origem === 'api'
              ? `${concursos.length} concursos (API)`
              : origem === 'neon'
                ? `${concursos.length} concursos (Neon)`
                : `${concursos.length} concursos (local)`}
          </span>
        </div>
      </div>

      {resumo ? (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <ResumoCard
              icon={<Award className="w-4 h-4" />}
              label="Taxa de Acerto Média"
              value={`${resumo.taxaAcertoMedia}%`}
              accent
            />
            <ResumoCard
              icon={<Trophy className="w-4 h-4" />}
              label="Total de Quadras"
              value={String(resumo.totalQuadras)}
              color="text-orange-400"
            />
            <ResumoCard
              icon={<Trophy className="w-4 h-4" />}
              label="Total de Quinas"
              value={String(resumo.totalQuinas)}
              color="text-amber-400"
            />
            <ResumoCard
              icon={<Trophy className="w-4 h-4" />}
              label="Total de Senas"
              value={String(resumo.totalSenas)}
              color="text-emerald-400"
            />
          </div>

          {/* Tabela Top 10 */}
          {conjunto ? (
            <div className="rounded-xl border border-[#262c34] overflow-hidden">
              <div className="bg-[#161a1f] px-4 py-2.5 border-b border-[#262c34]">
                <span className="text-xs font-semibold text-zinc-300">
                  Resultado do conjunto (qualquer jogo acertando conta)
                </span>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {top10[0]?.jogo.map((n) => (
                    <span
                      key={n}
                      className="px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold"
                    >
                      {n < 10 ? `0${n}` : n}
                    </span>
                  ))}
                  <span className="text-[11px] text-zinc-500 self-center ml-1">
                    (união das dezenas dos {jogos.length} jogos)
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <MiniStat label="Taxa" value={`${top10[0]?.taxaAcerto ?? 0}%`} highlight />
                  <MiniStat label="Quadras" value={String(top10[0]?.quadras ?? 0)} />
                  <MiniStat label="Quinas" value={String(top10[0]?.quinas ?? 0)} />
                  <MiniStat label="Senas" value={String(top10[0]?.senas ?? 0)} />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[#262c34] overflow-hidden">
              <div className="bg-[#161a1f] px-4 py-2.5 border-b border-[#262c34] flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">
                  Top 10 jogos com maior taxa de acerto
                </span>
                <span className="text-[10px] text-zinc-500">
                  de {resumo.jogos.length} jogos avaliados
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#12161b] border-b border-[#262c34]">
                      <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                        #
                      </th>
                      <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                        Jogo
                      </th>
                      <th className="text-center px-2 py-2 text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                        Taxa
                      </th>
                      <th className="text-center px-2 py-2 text-[10px] uppercase tracking-wider text-orange-400 font-semibold">
                        Quadras
                      </th>
                      <th className="text-center px-2 py-2 text-[10px] uppercase tracking-wider text-amber-400 font-semibold">
                        Quinas
                      </th>
                      <th className="text-center px-2 py-2 text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">
                        Senas
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {top10.map((r, idx) => {
                      return (
                        <tr
                          key={idx}
                          className="border-b border-[#262c34]/60 hover:bg-[#161a1f] transition-colors"
                        >
                          <td className="px-3 py-2 text-zinc-400 font-mono text-xs">{idx + 1}</td>
                          <td className="px-3 py-2">
                            <span className="font-mono text-xs text-zinc-200">
                              {formatGameString(r.jogo)}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span className="font-bold text-emerald-400 text-xs">
                              {r.taxaAcerto}%
                            </span>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span className="font-semibold text-orange-400 text-xs">
                              {r.quadras}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span className="font-semibold text-amber-400 text-xs">{r.quinas}</span>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span className="font-semibold text-emerald-400 text-xs">
                              {r.senas}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Nota explicativa */}
          <div className="text-[11px] text-zinc-400 leading-relaxed bg-[#12161b] border border-[#262c34] rounded-xl p-3.5">
            <strong className="text-zinc-200">Como ler:</strong> a simulação compara cada jogo
            gerado contra os {resumo.totalConcursos} últimos concursos reais da Mega-Sena.{' '}
            <strong className="text-orange-400">Quadra</strong> = 4 acertos,{' '}
            <strong className="text-amber-400">Quina</strong> = 5 acertos,{' '}
            <strong className="text-emerald-400">Sena</strong> = 6 acertos. A taxa de acerto mede
            quantos concursos o jogo teria alcançado ao menos a quadra. Sorteios passados não
            influenciam sorteios futuros — isto é apenas uma análise retrospectiva.
          </div>
        </>
      ) : null}
    </div>
  )
}

/* ============================================================
 * Subcomponentes
 * ============================================================ */

const ResumoCard: React.FC<{
  icon: React.ReactNode
  label: string
  value: string
  accent?: boolean
  color?: string
}> = ({ icon, label, value, accent, color }) => (
  <div
    className={`p-3.5 rounded-xl border flex items-center gap-3 ${
      accent ? 'bg-emerald-950/40 border-emerald-500/30' : 'bg-[#161a1f] border-[#262c34]'
    }`}
  >
    <div
      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
        accent
          ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
          : 'bg-[#1a1f2b] border border-[#262c34] text-zinc-400'
      } ${color ?? ''}`}
    >
      {icon}
    </div>
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold truncate">
        {label}
      </div>
      <div
        className={`text-lg font-extrabold ${accent ? 'text-emerald-400' : (color ?? 'text-white')}`}
      >
        {value}
      </div>
    </div>
  </div>
)

const MiniStat: React.FC<{ label: string; value: string; highlight?: boolean }> = ({
  label,
  value,
  highlight,
}) => (
  <div
    className={`p-2 rounded-lg border ${
      highlight ? 'bg-emerald-950/40 border-emerald-500/30' : 'bg-[#161a1f] border-[#262c34]'
    }`}
  >
    <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-semibold">{label}</div>
    <div className={`text-sm font-extrabold ${highlight ? 'text-emerald-400' : 'text-white'}`}>
      {value}
    </div>
  </div>
)
