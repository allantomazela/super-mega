import React, { useMemo, useState, useCallback } from 'react'
import {
  Trophy,
  Swords,
  Target,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  Dices,
  Percent,
  CheckCircle2,
  BarChart3,
  Star,
  Flame,
  Crown,
} from 'lucide-react'
import {
  formatTwoDigits,
  formatGameString,
  calculateGameScore,
  SCORE_ELITE_THRESHOLD,
  getScoreColor,
  optimizeFiveGamesV3,
  FiveGamesResult,
} from '@/lib/megaEngine'
import { simularConjunto } from '@/data/concursosHistoricos'
import { useConcursos } from '@/hooks/useConcursos'
import { ComparacaoConcurso, ConferenciaCallbackPayload } from '@/components/ComparacaoConcurso'
import { GameScoreRadar } from '@/components/RadarChart'
import { HistoricoConferencias } from '@/components/HistoricoConferencias'
import { useHistoricoConferencias } from '@/hooks/useHistoricoConferencias'
import { useToast } from '@/hooks/use-toast'
import { SeletorAleatorias } from '@/components/SeletorAleatorias'
import { MEGA_MAX_DEZENAS, MEGA_MIN_DEZENAS } from '@/lib/caixaOficial'

/* ============================================================
 * TorneioMode — compara dois grupos de dezenas (Grupo A e
 * Grupo B) lado a lado. Gera os 5 jogos otimizados para cada
 * grupo e exibe:
 *  - Scores médios
 *  - Cobertura
 *  - Simulação histórica comparativa
 *  - Conferência com sorteio lado a lado
 *  - Destaque visual do grupo vencedor (borda verde, badge 🏆)
 *
 * Os grupos são independentes: selecionar dezenas no Grupo A
 * não afeta o Grupo B.
 * ============================================================ */

const MAX_SELECTION = 25
const MIN_SELECTION = 5

type GrupoId = 'A' | 'B'

interface GrupoState {
  selected: number[]
  result: FiveGamesResult | null
}

const emptyGrupo: GrupoState = { selected: [], result: null }

export const TorneioMode: React.FC = () => {
  const [grupos, setGrupos] = useState<{ A: GrupoState; B: GrupoState }>({
    A: { ...emptyGrupo },
    B: { ...emptyGrupo },
  })
  const [ativo, setAtivo] = useState<GrupoId>('A')
  const [copied, setCopied] = useState<{ grupo: GrupoId; idx: number } | null>(null)
  const [qtdAleatorias, setQtdAleatorias] = useState(10)
  const { toast } = useToast()
  const { historico, adicionar, limpar } = useHistoricoConferencias()
  const { concursos } = useConcursos()

  const toggleNumber = (grupo: GrupoId, n: number) => {
    setGrupos((prev) => {
      const g = prev[grupo]
      if (g.selected.includes(n)) {
        return { ...prev, [grupo]: { ...g, selected: g.selected.filter((x) => x !== n) } }
      }
      if (g.selected.length >= MAX_SELECTION) return prev
      return {
        ...prev,
        [grupo]: { ...g, selected: [...g.selected, n].sort((a, b) => a - b) },
      }
    })
  }

  const clearGrupo = (grupo: GrupoId) => {
    setGrupos((prev) => ({ ...prev, [grupo]: { ...emptyGrupo } }))
  }

  const randomFill = (grupo: GrupoId, total: number) => {
    const capped = Math.min(MAX_SELECTION, Math.max(MEGA_MIN_DEZENAS, Math.min(MEGA_MAX_DEZENAS, total)))
    const all = Array.from({ length: 60 }, (_, i) => i + 1)
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[all[i], all[j]] = [all[j], all[i]]
    }
    const chosen = all.slice(0, capped).sort((a, b) => a - b)
    setGrupos((prev) => ({ ...prev, [grupo]: { selected: chosen, result: null } }))
  }

  const gerarJogos = (grupo: GrupoId) => {
    const g = grupos[grupo]
    if (g.selected.length < MIN_SELECTION || g.selected.length > MAX_SELECTION) return
    const result = optimizeFiveGamesV3(g.selected, 'equilibrado')
    setGrupos((prev) => ({ ...prev, [grupo]: { ...g, result } }))
    const elite = result.scores.filter((s) => s >= SCORE_ELITE_THRESHOLD).length
    if (elite > 0) {
      toast({
        title: `Grupo ${grupo}: ${elite} jogo${elite > 1 ? 's' : ''} com Score Elite 🔥`,
        description: `${elite} jogo${elite > 1 ? 's atingiram' : ' atingiu'} score ≥ ${SCORE_ELITE_THRESHOLD}%.`,
      })
    }
  }

  const gerarAmbos = () => {
    gerarJogos('A')
    gerarJogos('B')
  }

  // === Métricas comparativas ===
  const metricas = useMemo(() => {
    const calc = (g: GrupoState) => {
      const result = g.result
      const avgScore =
        result && result.scores.length > 0
          ? Math.round(result.scores.reduce((a, s) => a + s, 0) / result.scores.length)
          : 0
      const coverage = result?.coveragePercent ?? 0
      return { avgScore, coverage, hasResult: !!result }
    }
    const a = calc(grupos.A)
    const b = calc(grupos.B)
    return { a, b }
  }, [grupos])

  // === Simulação histórica comparativa ===
  const simulacao = useMemo(() => {
    const calc = (g: GrupoState) => {
      if (!g.result) return null
      return simularConjunto(g.result.games, concursos)
    }
    const a = calc(grupos.A)
    const b = calc(grupos.B)
    return { a, b }
  }, [grupos, concursos])

  // === Vencedor (pelo score médio; empate considera cobertura) ===
  const vencedor = useMemo<GrupoId | null>(() => {
    if (!metricas.a.hasResult || !metricas.b.hasResult) return null
    if (metricas.a.avgScore > metricas.b.avgScore) return 'A'
    if (metricas.b.avgScore > metricas.a.avgScore) return 'B'
    // Empate por score: decide por cobertura
    if (metricas.a.coverage > metricas.b.coverage) return 'A'
    if (metricas.b.coverage > metricas.a.coverage) return 'B'
    return null
  }, [metricas])

  const handleConferir = useCallback(
    (grupo: GrupoId, payload: ConferenciaCallbackPayload) => {
      adicionar({
        modo: 'torneio',
        grupo: `Grupo ${grupo}`,
        dezenasSorteadas: payload.dezenasSorteadas,
        jogos: payload.jogos,
      })
    },
    [adicionar],
  )

  const copyGame = (grupo: GrupoId, game: number[], idx: number) => {
    navigator.clipboard.writeText(formatGameString(game))
    setCopied({ grupo, idx })
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#262c34] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <Swords className="w-7 h-7 text-emerald-400" />
            Modo Torneio
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 mt-1">
            Monte dois grupos independentes e compare-os lado a lado. Quem leva a melhor?
          </p>
        </div>
        <div className="flex items-start gap-2">
          <SeletorAleatorias
            quantidade={qtdAleatorias}
            onQuantidadeChange={setQtdAleatorias}
            onGerar={(n) => {
              randomFill('A', n)
              randomFill('B', n)
            }}
          />
          <button
            type="button"
            onClick={() => {
              setGrupos({ A: { ...emptyGrupo }, B: { ...emptyGrupo } })
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-500/40 text-xs font-semibold text-red-300 hover:text-white hover:bg-red-900/50 hover:border-red-400 transition-colors"
            title="Limpar ambos os grupos"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Resetar</span>
          </button>
        </div>
      </div>

      {/* Painel comparativo (dois grupos lado a lado) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {(['A', 'B'] as GrupoId[]).map((gid) => (
          <GrupoPanel
            key={gid}
            gid={gid}
            grupo={grupos[gid]}
            ativo={ativo === gid}
            onFocus={() => setAtivo(gid)}
            onToggle={(n) => toggleNumber(gid, n)}
            onClear={() => clearGrupo(gid)}
            onRandom={() => randomFill(gid, qtdAleatorias)}
            onGerar={() => gerarJogos(gid)}
            onCopy={(game, idx) => copyGame(gid, game, idx)}
            copiedIdx={copied?.grupo === gid ? copied.idx : null}
            isVencedor={vencedor === gid}
          />
        ))}
      </div>

      {/* Comparação de métricas */}
      {metricas.a.hasResult && metricas.b.hasResult && (
        <section className="surface-card rounded-2xl p-5 sm:p-6 border border-emerald-500/20 shadow-lg space-y-4">
          <div className="flex items-center gap-2.5 border-b border-[#262c34] pb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                🏆 Comparação de Grupos
              </h3>
              <p className="text-xs text-zinc-400">
                Scores médios, cobertura e simulação histórica
              </p>
            </div>
            {vencedor && (
              <span className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-extrabold text-white emerald-gradient border border-emerald-300/50 shadow-[0_0_14px_rgba(16,185,129,0.5)] animate-pulse">
                <Crown className="w-4 h-4" />
                Vencedor: Grupo {vencedor}
              </span>
            )}
          </div>

          {/* Tabela comparativa */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#12161b] border-b border-[#262c34]">
                  <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                    Métrica
                  </th>
                  <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                    Grupo A
                  </th>
                  <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                    Grupo B
                  </th>
                  <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">
                    Melhor
                  </th>
                </tr>
              </thead>
              <tbody>
                <ComparacaoRow
                  label="Score Médio"
                  valorA={`${metricas.a.avgScore}%`}
                  valorB={`${metricas.b.avgScore}%`}
                  vencedor={vencedor}
                  maiorMelhor
                />
                <ComparacaoRow
                  label="Cobertura"
                  valorA={`${metricas.a.coverage}%`}
                  valorB={`${metricas.b.coverage}%`}
                  vencedor={vencedor}
                  maiorMelhor
                  criterioDesempate
                />
                {simulacao.a && simulacao.b && (
                  <>
                    <ComparacaoRow
                      label="Taxa de Acerto (histórico)"
                      valorA={`${simulacao.a.taxaAcerto}%`}
                      valorB={`${simulacao.b.taxaAcerto}%`}
                      vencedor={simulacao.a.taxaAcerto >= simulacao.b.taxaAcerto ? 'A' : 'B'}
                      maiorMelhor
                    />
                    <ComparacaoRow
                      label="Quadras (histórico)"
                      valorA={String(simulacao.a.quadras)}
                      valorB={String(simulacao.b.quadras)}
                      vencedor={simulacao.a.quadras >= simulacao.b.quadras ? 'A' : 'B'}
                      maiorMelhor
                    />
                    <ComparacaoRow
                      label="Quinas (histórico)"
                      valorA={String(simulacao.a.quinas)}
                      valorB={String(simulacao.b.quinas)}
                      vencedor={simulacao.a.quinas >= simulacao.b.quinas ? 'A' : 'B'}
                      maiorMelhor
                    />
                    <ComparacaoRow
                      label="Senas (histórico)"
                      valorA={String(simulacao.a.senas)}
                      valorB={String(simulacao.b.senas)}
                      vencedor={simulacao.a.senas >= simulacao.b.senas ? 'A' : 'B'}
                      maiorMelhor
                    />
                  </>
                )}
              </tbody>
            </table>
          </div>
          <div className="text-[11px] text-zinc-400 leading-relaxed bg-[#12161b] border border-[#262c34] rounded-xl p-3">
            <strong className="text-zinc-200">Critério do vencedor:</strong> o grupo com maior score
            médio vence. Em caso de empate, prevalece a maior cobertura. As métricas históricas
            (quadras/quinas/senas) são exibidas como referência retrospectiva contra os últimos{' '}
            {concursos.length} concursos reais.
          </div>
        </section>
      )}

      {/* Conferência lado a lado */}
      {grupos.A.result && grupos.B.result && (
        <section className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Conferir com Sorteio — Lado a Lado
              </h2>
              <p className="text-xs text-zinc-400">
                Digite as 6 dezenas sorteadas e veja os acertos de cada grupo simultaneamente
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ComparacaoConcurso
              jogos={grupos.A.result.games}
              titulo={`Grupo A — Conferir`}
              subtitulo="Conferência do Grupo A"
              botaoLabel="Conferir A"
              permitirBuscaConcurso={false}
              onConferir={(p) => handleConferir('A', p)}
            />
            <ComparacaoConcurso
              jogos={grupos.B.result.games}
              titulo={`Grupo B — Conferir`}
              subtitulo="Conferência do Grupo B"
              botaoLabel="Conferir B"
              permitirBuscaConcurso={false}
              onConferir={(p) => handleConferir('B', p)}
            />
          </div>
        </section>
      )}

      {/* Histórico de conferências */}
      <HistoricoConferencias historico={historico} onLimpar={limpar} />
    </div>
  )
}

/* ============================================================
 * Tabela — linha comparativa entre grupos
 * ============================================================ */
const ComparacaoRow: React.FC<{
  label: string
  valorA: string
  valorB: string
  vencedor: GrupoId | null
  maiorMelhor: boolean
  criterioDesempate?: boolean
}> = ({ label, valorA, valorB, vencedor, criterioDesempate }) => {
  const aMelhor = parseFloat(valorA) > parseFloat(valorB)
  const bMelhor = parseFloat(valorB) > parseFloat(valorA)
  return (
    <tr className="border-b border-[#262c34]/60">
      <td className="px-3 py-2 text-xs font-semibold text-zinc-300">
        {label}
        {criterioDesempate && <span className="ml-1 text-[9px] text-zinc-500">(desempate)</span>}
      </td>
      <td
        className={`px-3 py-2 text-center text-sm font-extrabold ${
          aMelhor ? 'text-emerald-400' : 'text-zinc-300'
        }`}
      >
        {valorA}
      </td>
      <td
        className={`px-3 py-2 text-center text-sm font-extrabold ${
          bMelhor ? 'text-emerald-400' : 'text-zinc-300'
        }`}
      >
        {valorB}
      </td>
      <td className="px-3 py-2 text-center">
        {aMelhor ? (
          <span className="text-xs font-bold text-emerald-400">Grupo A</span>
        ) : bMelhor ? (
          <span className="text-xs font-bold text-emerald-400">Grupo B</span>
        ) : (
          <span className="text-xs text-zinc-500">Empate</span>
        )}
      </td>
    </tr>
  )
}

/* ============================================================
 * GrupoPanel — painel de um grupo (seleção + 5 jogos)
 * ============================================================ */
const GrupoPanel: React.FC<{
  gid: GrupoId
  grupo: GrupoState
  ativo: boolean
  onFocus: () => void
  onToggle: (n: number) => void
  onClear: () => void
  onRandom: () => void
  onGerar: () => void
  onCopy: (game: number[], idx: number) => void
  copiedIdx: number | null
  isVencedor: boolean
}> = ({
  gid,
  grupo,
  ativo,
  onFocus,
  onToggle,
  onClear,
  onRandom,
  onGerar,
  onCopy,
  copiedIdx,
  isVencedor,
}) => {
  const { selected, result } = grupo
  const count = selected.length
  const isValid = count >= MIN_SELECTION && count <= MAX_SELECTION
  const accent = gid === 'A' ? 'emerald' : 'sky'
  const accentText = gid === 'A' ? 'text-emerald-400' : 'text-sky-400'
  const accentBorder = gid === 'A' ? 'border-emerald-500/40' : 'border-sky-500/40'

  return (
    <div
      className={`surface-card rounded-2xl p-5 sm:p-6 shadow-xl border-2 transition-all relative overflow-hidden ${
        isVencedor
          ? 'border-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.35)]'
          : ativo
            ? accentBorder
            : 'border-[#262c34]'
      }`}
      onMouseDown={onFocus}
    >
      {/* Badge vencedor */}
      {isVencedor && (
        <span className="absolute -top-2 -right-2 z-20 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-extrabold text-white emerald-gradient border border-emerald-300/50 shadow-[0_0_14px_rgba(16,185,129,0.6)] whitespace-nowrap">
          <Trophy className="w-3.5 h-3.5" />🏆 Vencedor
        </span>
      )}

      {/* Header do grupo */}
      <div className="flex items-center justify-between border-b border-[#262c34] pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-white ${
              gid === 'A' ? 'emerald-gradient' : 'bg-sky-500'
            }`}
          >
            {gid}
          </div>
          <div>
            <h3 className={`text-base font-bold tracking-tight ${accentText}`}>Grupo {gid}</h3>
            <p className="text-xs text-zinc-400">
              {count} dezena{count !== 1 ? 's' : ''} selecionada{count !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onRandom}
            className="px-2.5 py-1.5 rounded-lg bg-[#1a1f2b] border border-[#262c34] text-[11px] text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors flex items-center gap-1"
            title="Sortear dezenas aleatórias na quantidade escolhida no topo"
          >
            <Dices className="w-3 h-3 text-emerald-400" />
            Aleatório
          </button>
          <button
            type="button"
            onClick={onClear}
            className="px-2.5 py-1.5 rounded-lg bg-[#1a1f2b] border border-[#262c34] text-[11px] text-zinc-300 hover:text-white hover:border-red-500/50 transition-colors flex items-center gap-1"
            title="Limpar grupo"
          >
            <RotateCcw className="w-3 h-3" />
            Limpar
          </button>
        </div>
      </div>

      {/* Grid 01-60 */}
      <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5">
        {Array.from({ length: 60 }, (_, i) => i + 1).map((num) => {
          const isSelected = selected.includes(num)
          const isMaxReached = !isSelected && count >= MAX_SELECTION
          return (
            <button
              key={num}
              type="button"
              onClick={() => onToggle(num)}
              disabled={isMaxReached}
              className={`relative aspect-square min-h-[32px] rounded-lg font-bold text-[11px] sm:text-xs flex items-center justify-center transition-all select-none
                ${
                  isSelected
                    ? gid === 'A'
                      ? 'emerald-gradient text-white scale-[1.05] border border-emerald-300/40 font-extrabold'
                      : 'bg-sky-500 text-white scale-[1.05] border border-sky-300/40 font-extrabold'
                    : 'bg-[#1a1f2b] border border-[#262c34] text-zinc-400 hover:text-white hover:border-zinc-600'
                }
                ${isMaxReached ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {formatTwoDigits(num)}
            </button>
          )
        })}
      </div>

      {/* CTA Gerar */}
      <div className="mt-4 pt-4 border-t border-[#262c34]">
        <button
          type="button"
          onClick={onGerar}
          disabled={!isValid}
          className={`w-full py-3 px-6 rounded-xl font-bold text-white flex items-center justify-center gap-2.5 transition-all text-sm
            ${
              isValid
                ? 'emerald-gradient emerald-glow hover:translate-y-[-2px] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] active:scale-[0.98] cursor-pointer'
                : 'bg-[#1a1f2b] text-zinc-500 border border-[#262c34] opacity-50 cursor-not-allowed'
            }
          `}
        >
          <Target className="w-4 h-4" />
          <span>Gerar 5 Jogos do Grupo {gid}</span>
        </button>
        {!isValid && (
          <p className="text-[10px] text-amber-400/80 mt-1.5 text-center">
            Selecione entre {MIN_SELECTION} e {MAX_SELECTION} dezenas
          </p>
        )}
      </div>

      {/* Resultado (5 jogos) */}
      {result && (
        <div className="mt-5 space-y-3 animate-fade-in-up">
          {/* Métricas rápidas */}
          <div className="grid grid-cols-3 gap-2">
            <MiniMetric
              icon={<BarChart3 className="w-3.5 h-3.5" />}
              label="Score Médio"
              value={`${Math.round(result.scores.reduce((a, s) => a + s, 0) / result.scores.length)}%`}
              accent
            />
            <MiniMetric
              icon={<Percent className="w-3.5 h-3.5" />}
              label="Cobertura"
              value={`${result.coveragePercent}%`}
            />
            <MiniMetric
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
              label="Cobertas"
              value={`${result.covered.length}/${result.groupSize}`}
            />
          </div>

          {/* Cards dos 5 jogos */}
          <div className="space-y-2">
            {result.games.map((game, idx) => {
              const isCopied = copiedIdx === idx
              const isElite = calculateGameScore(game) >= SCORE_ELITE_THRESHOLD
              return (
                <div
                  key={idx}
                  className={`rounded-xl p-3 border relative ${
                    isElite
                      ? 'bg-[#19222c] border-emerald-500/50 high-score-glow'
                      : 'bg-[#161a1f] border-[#262c34]'
                  }`}
                >
                  {isElite && (
                    <span className="absolute -top-2 -right-2 z-10 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-extrabold text-white emerald-gradient border border-emerald-300/50 whitespace-nowrap">
                      <Flame className="w-2.5 h-2.5" />
                      Elite
                    </span>
                  )}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      Jogo #{String(idx + 1).padStart(2, '0')}
                    </span>
                    <button
                      type="button"
                      onClick={() => onCopy(game, idx)}
                      className="text-zinc-500 hover:text-emerald-400 p-0.5 rounded transition-colors"
                      title="Copiar jogo"
                    >
                      {isCopied ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {game.map((n) => (
                      <span
                        key={n}
                        className="px-1.5 py-0.5 rounded font-mono text-[11px] font-bold border bg-[#1a1f2b] border-[#262c34] text-white"
                      >
                        {formatTwoDigits(n)}
                      </span>
                    ))}
                  </div>
                  {/* Score bar + radar */}
                  <TorneioScoreBar game={game} />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================================================
 * MiniMetric — card de métrica compacto
 * ============================================================ */
const MiniMetric: React.FC<{
  icon: React.ReactNode
  label: string
  value: string
  accent?: boolean
}> = ({ icon, label, value, accent }) => (
  <div
    className={`p-2 rounded-lg border flex items-center gap-2 ${
      accent ? 'bg-emerald-950/40 border-emerald-500/30' : 'bg-[#12161b] border-[#262c34]'
    }`}
  >
    <div
      className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${
        accent ? 'text-emerald-400' : 'text-zinc-400'
      }`}
    >
      {icon}
    </div>
    <div className="min-w-0">
      <div className="text-[8px] uppercase tracking-wider text-zinc-500 font-semibold truncate">
        {label}
      </div>
      <div className={`text-xs font-extrabold ${accent ? 'text-emerald-400' : 'text-white'}`}>
        {value}
      </div>
    </div>
  </div>
)

/* ============================================================
 * TorneioScoreBar — barra de score + radar expansível
 * ============================================================ */
const TorneioScoreBar: React.FC<{ game: number[] }> = ({ game }) => {
  const score = calculateGameScore(game)
  const { textColor, bgClass, label } = getScoreColor(score)
  const isElite = score >= SCORE_ELITE_THRESHOLD

  return (
    <div className="mt-2 pt-2 border-t border-[#262c34]/60 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
          Score
        </span>
        <span className={`text-[11px] font-extrabold ${textColor}`}>{score}%</span>
      </div>
      <div className="h-1 w-full rounded-full bg-[#1a1f2b] overflow-hidden">
        <div
          className={`h-full rounded-full ${bgClass} transition-all duration-300`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-bold ${textColor}`}>
          {label}
          {isElite && (
            <span className="ml-1 inline-flex items-center gap-0.5 text-emerald-400">
              <Star className="w-2.5 h-2.5 fill-emerald-400" />
            </span>
          )}
        </span>
        <GameScoreRadar game={game} />
      </div>
    </div>
  )
}
