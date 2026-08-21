import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Filter,
  Scale,
  Calculator,
  Brain,
  ListOrdered,
  Sparkles,
  Loader2,
  RotateCcw,
  CheckCircle2,
  Info,
  Target,
  Download,
  Copy,
  Check,
  Percent,
  AlertCircle,
  BarChart3,
  PieChart,
  Flame,
  Star,
  TrendingUp,
  Gauge,
} from 'lucide-react'
import { useMega, AppMode } from '@/lib/MegaContext'
import {
  formatTwoDigits,
  formatGameString,
  buildJogosTxtCaixa,
  formatCurrencyBRL,
  formatNumberBR,
  optimizeFiveGamesV3,
  calculateGameScore,
  computeScoreV3,
  formatScoreBreakdown,
  SCORE_ELITE_THRESHOLD,
  getScoreColor,
  calcularProbabilidadeCombinada,
  recomputeFiveGamesResult,
  calcularEV,
  FIVE_GAMES_COUNT,
  calcularFrequencias,
  frequenciaMediaGlobal,
  calcularProbabilidadesJogo,
  calcularEVConjunto,
  calcularEVPorReal,
  probExataMegaSena,
  FIVE_GAMES_MAX_SELECTION,
  FiveGamesResult,
  OptimizationMeta,
  META_WEIGHTS,
  DEFAULT_META,
  coverageEfficiency,
} from '@/lib/megaEngine'
import { estimatePopularityFactor } from '@/lib/popularityModel'
import { ToggleSwitch } from '@/components/ToggleSwitch'
import { SimulacaoHistorica } from '@/components/SimulacaoHistorica'
import { ValidacaoHistorica } from '@/components/ValidacaoHistorica'
import { PrintableVersion, jogosComScore } from '@/components/PrintableVersion'
import { ComparacaoConcurso, ConferenciaCallbackPayload } from '@/components/ComparacaoConcurso'
import { GameScoreRadar } from '@/components/RadarChart'
import { HistoricoConferencias } from '@/components/HistoricoConferencias'
import { useHistoricoConferencias } from '@/hooks/useHistoricoConferencias'
import { TorneioMode } from '@/components/TorneioMode'
import { FechamentoPanel } from '@/components/FechamentoPanel'
import { ComparadorOrcamento, type AplicarOrcamentoPayload } from '@/components/ComparadorOrcamento'
import { ModeGuide } from '@/components/ModeGuide'
import { VolanteOficial } from '@/components/VolanteOficial'
import { UltimoSorteio } from '@/components/UltimoSorteio'
import { FechamentoJogos } from '@/components/FechamentoJogos'
import { SeletorAleatorias } from '@/components/SeletorAleatorias'
import { BotaoConfirmarHistorico } from '@/components/BotaoConfirmarHistorico'
import {
  MEGA_MAX_DEZENAS,
  MEGA_MIN_DEZENAS,
  clampDezenasMega,
  precoOficialCaixa,
} from '@/lib/caixaOficial'
import { useConcursos } from '@/hooks/useConcursos'
import { useToast } from '@/hooks/use-toast'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export default function Index() {
  const navigate = useNavigate()
  const {
    selectedNumbers,
    toggleNumber,
    filters,
    toggleFilter,
    setSelectedNumbers,
    mode,
    setMode,
    maxSelection,
    resetAll,
    fechamentoN,
    fechamentoGarantia,
    setFechamentoN,
    setFechamentoGarantia,
  } = useMega()
  const { toast } = useToast()
  const { concursos } = useConcursos()

  const isCincoJogos = mode === 'cinco-jogos'
  const isTorneio = mode === 'torneio'
  const isFechamento = mode === 'fechamento'

  // === Histórico de Conferências (localStorage) ===
  const { historico, adicionar, limpar } = useHistoricoConferencias()
  const handleConferirCincoJogos = useCallback(
    (payload: ConferenciaCallbackPayload) => {
      adicionar({
        modo: 'cinco-jogos',
        dezenasSorteadas: payload.dezenasSorteadas,
        jogos: payload.jogos,
      })
    },
    [adicionar],
  )

  const [isLoading, setIsLoading] = useState(false)
  const [fiveGamesResult, setFiveGamesResult] = useState<FiveGamesResult | null>(null)
  const [editableGames, setEditableGames] = useState<number[][] | null>(null)
  const [exported, setExported] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [meta, setMeta] = useState<OptimizationMeta>(DEFAULT_META)
  const [qtdAleatorias, setQtdAleatorias] = useState(10)
  const [ticketSize, setTicketSize] = useState(MEGA_MIN_DEZENAS)
  const [fechamentoGerado, setFechamentoGerado] = useState(false)
  const fechamentoGenToken = useRef(0)

  const count = selectedNumbers.length

  // === Frequência Histórica (heatmap no grid de seleção) ===
  // Usa a base estática de concursos (a mesma do SimulacaoHistorica).
  const freqMap = useMemo(() => calcularFrequencias(concursos), [concursos])
  const freqMedia = useMemo(() => frequenciaMediaGlobal(freqMap), [freqMap])
  const totalConcursos = concursos.length

  // Resultado "ao vivo" — recalculado a cada edição manual (drag-and-drop).
  // Quando não há edições, equivale ao resultado original otimizado.
  const liveResult = useMemo<FiveGamesResult | null>(() => {
    if (!editableGames || editableGames.length === 0) return fiveGamesResult
    return recomputeFiveGamesResult(editableGames, selectedNumbers)
  }, [editableGames, selectedNumbers, fiveGamesResult])

  // === Limites dinâmicos conforme o modo ativo ===
  const minRequired = isCincoJogos ? ticketSize : isFechamento ? fechamentoN : 6
  const isValidCount = isCincoJogos
    ? count >= ticketSize && count <= FIVE_GAMES_MAX_SELECTION
    : isFechamento
      ? count === fechamentoN
      : count >= 6 && count <= 20
  const isOverLimit = isCincoJogos
    ? count > FIVE_GAMES_MAX_SELECTION
    : isFechamento
      ? count > fechamentoN
      : count > 20
  const isUnderLimit = isCincoJogos
    ? count < ticketSize
    : isFechamento
      ? count < fechamentoN
      : count < 6

  // Circular progress indicator parameters
  const progressMax = maxSelection
  const radius = 22
  const stroke = 3.5
  const normalizedRadius = radius - stroke * 2
  const circumference = normalizedRadius * 2 * Math.PI
  const progressRatio = Math.min(Math.max(count / progressMax, 0), 1)
  const strokeDashoffset = circumference - progressRatio * circumference

  // Arc stroke color
  let strokeColor = '#4b5563' // zinc-600
  let badgeColorClass = 'text-zinc-400 bg-zinc-800/60 border-zinc-700'
  if (isValidCount) {
    strokeColor = '#10b981' // emerald-500
    badgeColorClass = 'text-emerald-400 bg-emerald-950/40 border-emerald-500/40'
  } else if (isOverLimit) {
    strokeColor = '#ef4444' // red-500
    badgeColorClass = 'text-red-400 bg-red-950/40 border-red-500/40'
  } else if (count > 0) {
    strokeColor = '#f59e0b' // amber-500 (em progresso)
    badgeColorClass = 'text-amber-400 bg-amber-950/40 border-amber-500/40'
  }

  const handleGenerateDesdobramento = () => {
    if (count < 6 || count > 20) return
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      navigate('/resultados', {
        state: { selectedNumbers, filters },
      })
    }, 400)
  }

  const handleGenerateFiveGames = () => {
    if (count < ticketSize || count > FIVE_GAMES_MAX_SELECTION) return
    setIsLoading(true)
    setExported(false)
    setTimeout(() => {
      const result = optimizeFiveGamesV3(selectedNumbers, meta, freqMap, ticketSize)
      setFiveGamesResult(result)
      setEditableGames(result.games.map((g) => [...g]))
      setIsLoading(false)
      // Toast de alerta de Score Elite (score ≥ 90%)
      const altaProb = result.scores.filter((s) => s >= SCORE_ELITE_THRESHOLD).length
      if (altaProb > 0) {
        toast({
          title: `${altaProb} jogo${altaProb > 1 ? 's' : ''} com Score Elite (≥90%) 🔥`,
          description: `${altaProb} jogo${altaProb > 1 ? 's atingiram' : ' atingiu'} score ≥ ${SCORE_ELITE_THRESHOLD}% no motor probabilístico avançado.`,
        })
      }
    }, 350)
  }

  // Ao mudar a meta, re-gera automaticamente se já houver jogos
  const handleMetaChange = (next: OptimizationMeta) => {
    if (next === meta) return
    setMeta(next)
    if (fiveGamesResult && count >= ticketSize && count <= FIVE_GAMES_MAX_SELECTION) {
      setIsLoading(true)
      setTimeout(() => {
        const result = optimizeFiveGamesV3(selectedNumbers, next, freqMap, ticketSize)
        setFiveGamesResult(result)
        setEditableGames(result.games.map((g) => [...g]))
        setIsLoading(false)
      }, 250)
    }
  }

  const handleGenerate = () => {
    if (isCincoJogos) handleGenerateFiveGames()
    else handleGenerateDesdobramento()
  }

  const handleAplicarOrcamento = useCallback(
    (payload: AplicarOrcamentoPayload) => {
      setFechamentoGerado(false)
      setIsLoading(false)
      if (payload.modo === 'fechamento') {
        if (payload.fechamentoGarantia) setFechamentoGarantia(payload.fechamentoGarantia)
        if (payload.fechamentoN != null) setFechamentoN(payload.fechamentoN)
        setMode('fechamento')
        toast({
          title: 'Estratégia de fechamento aplicada',
          description: `Grupo ${payload.fechamentoN} · ajuste as dezenas se quiser e clique em Gerar Fechamento.`,
        })
        return
      }
      setMode(payload.modo)
      toast({
        title:
          payload.modo === 'cinco-jogos'
            ? 'Modo 5 Jogos ativado'
            : payload.modo === 'desdobramento'
              ? 'Modo Desdobramento ativado'
              : 'Estratégia aplicada',
        description: 'Monte o grupo e gere os jogos conforme o modo escolhido.',
      })
    },
    [setFechamentoGarantia, setFechamentoN, setMode, toast],
  )


  const handleGenerateFechamento = () => {
    if (count !== fechamentoN) return
    const token = ++fechamentoGenToken.current
    setIsLoading(true)
    window.setTimeout(() => {
      if (token !== fechamentoGenToken.current) return
      setFechamentoGerado(true)
      setIsLoading(false)
      requestAnimationFrame(() => {
        document.getElementById('fechamento-jogos')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      })
    }, 200)
  }

  // Troca de dezenas / n / garantia: invalida resultado e cancela generate pendente
  useEffect(() => {
    fechamentoGenToken.current += 1
    setFechamentoGerado(false)
    setIsLoading(false)
  }, [selectedNumbers, fechamentoN, fechamentoGarantia])

  // Quick helper to fill a random sample of N numbers
  const handleRandomSelect = (total: number) => {
    const capped = Math.min(
      maxSelection,
      Math.max(MEGA_MIN_DEZENAS, Math.min(MEGA_MAX_DEZENAS, total)),
    )
    const all = Array.from({ length: 60 }, (_, i) => i + 1)
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[all[i], all[j]] = [all[j], all[i]]
    }
    const chosen = all.slice(0, capped).sort((a, b) => a - b)
    setSelectedNumbers(chosen)
    if (isCincoJogos) {
      setFiveGamesResult(null)
      setEditableGames(null)
    }
  }

  const handleExportFiveGames = () => {
    if (!liveResult) return
    const content = buildJogosTxtCaixa(liveResult.games)
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = now.getFullYear()
    link.href = url
    link.download = `MegaSena_5Jogos_${day}_${month}_${year}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setExported(true)
    setTimeout(() => setExported(false), 3000)
  }

  const copyGameToClipboard = (game: number[], index: number) => {
    navigator.clipboard.writeText(formatGameString(game))
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 1500)
  }

  // === Drag-and-drop: move uma dezena de um bilhete para outro ===
  const [dragInfo, setDragInfo] = useState<{
    fromIdx: number
    num: number
  } | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const [invalidDropIdx, setInvalidDropIdx] = useState<number | null>(null)

  const handleDragStart = (fromIdx: number, num: number) => {
    // Bloqueia saída se o bilhete de origem ficaria com menos de 5 dezenas
    const jogoOrigem = editableGames?.[fromIdx] ?? []
    if (jogoOrigem.length <= MEGA_MIN_DEZENAS) {
      setInvalidDropIdx(fromIdx)
      setTimeout(() => setInvalidDropIdx(null), 600)
      return
    }
    setDragInfo({ fromIdx, num })
  }

  const handleDragOver = (e: React.DragEvent, toIdx: number) => {
    e.preventDefault()
    if (dragInfo && dragInfo.fromIdx === toIdx) return
    const jogoDestino = editableGames?.[toIdx] ?? []
    // Só marca como drop válido se houver espaço (≤ 5)
    if (jogoDestino.length < ticketSize) {
      setDragOverIdx(toIdx)
    } else {
      setInvalidDropIdx(toIdx)
    }
  }

  const handleDragLeave = (toIdx: number) => {
    setDragOverIdx((prev) => (prev === toIdx ? null : prev))
    setInvalidDropIdx((prev) => (prev === toIdx ? null : prev))
  }

  const handleDrop = (e: React.DragEvent, toIdx: number) => {
    e.preventDefault()
    setDragOverIdx(null)
    if (!dragInfo || !editableGames) {
      setDragInfo(null)
      return
    }
    const { fromIdx, num } = dragInfo

    if (fromIdx === toIdx) {
      setDragInfo(null)
      return
    }

    const jogoDestino = editableGames[toIdx]
    // Bloqueia se destino já tem 5 dezenas
    if (jogoDestino.length >= ticketSize) {
      setInvalidDropIdx(toIdx)
      setTimeout(() => setInvalidDropIdx(null), 600)
      setDragInfo(null)
      return
    }
    // Bloqueia se a dezena já existe no destino
    if (jogoDestino.includes(num)) {
      setInvalidDropIdx(toIdx)
      setTimeout(() => setInvalidDropIdx(null), 600)
      setDragInfo(null)
      return
    }

    const next = editableGames.map((g) => [...g])
    next[fromIdx] = next[fromIdx].filter((n) => n !== num).sort((a, b) => a - b)
    next[toIdx] = [...next[toIdx], num].sort((a, b) => a - b)
    setEditableGames(next)
    setDragInfo(null)
  }

  const handleDragEnd = () => {
    setDragInfo(null)
    setDragOverIdx(null)
  }

  const handleResetJogos = () => {
    setFiveGamesResult(null)
    setEditableGames(null)
    setExported(false)
    setCopiedIndex(null)
    setDragInfo(null)
    setDragOverIdx(null)
    setInvalidDropIdx(null)
  }

  // === Reset completo: limpa dezenas, filtros, resultado 5 jogos e meta ===
  const handleResetAll = () => {
    resetAll()
    setFiveGamesResult(null)
    setEditableGames(null)
    setExported(false)
    setCopiedIndex(null)
    setMeta(DEFAULT_META)
    setDragInfo(null)
    setDragOverIdx(null)
    setInvalidDropIdx(null)
    setTicketSize(MEGA_MIN_DEZENAS)
    setQtdAleatorias(10)
  }

  function handleTicketSizeChange(next: number) {
    const k = clampDezenasMega(next)
    setTicketSize(k)
    if (count < k) {
      setFiveGamesResult(null)
      setEditableGames(null)
      return
    }
    if (!fiveGamesResult) return
    setIsLoading(true)
    setTimeout(() => {
      const result = optimizeFiveGamesV3(selectedNumbers, meta, freqMap, k)
      setFiveGamesResult(result)
      setEditableGames(result.games.map((g) => [...g]))
      setIsLoading(false)
    }, 250)
  }

  const handleModeChange = (next: AppMode) => {
    if (next === mode) return
    // Ao sair do modo 5 jogos, limpa o resultado para não exibir jogos defasados
    if (mode === 'cinco-jogos') {
      setFiveGamesResult(null)
      setEditableGames(null)
    }
    if (mode === 'fechamento' || next === 'fechamento') {
      setFechamentoGerado(false)
    }
    if (next === 'fechamento' && selectedNumbers.length > fechamentoN) {
      setSelectedNumbers(selectedNumbers.slice(0, fechamentoN))
    }
    setMode(next)
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <ModeGuide mode={mode} onChange={handleModeChange} />
      <UltimoSorteio />

      {/* Modo Torneio — renderização própria, independente do grid */}
      {isTorneio ? (
        <TorneioMode />
      ) : (
        <>
          {/* Title & Instructions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#262c34] pb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {isCincoJogos
                  ? 'Otimizador de 5 Jogos'
                  : isFechamento
                    ? 'Fechamento Combinatório Ótimo'
                    : 'Monte seu Grupo de Dezenas'}
              </h1>
              <p className="text-sm sm:text-base text-zinc-400 mt-1">
                {isCincoJogos
                  ? `Selecione de ${ticketSize} a ${FIVE_GAMES_MAX_SELECTION} dezenas e gere 5 jogos oficiais de ${ticketSize} dezenas.`
                  : isFechamento
                    ? `Escolha o tamanho disponível no painel (hoje 10–12 conforme a garantia) e clique em Gerar Fechamento. 13–20 dezenas ainda não têm matriz verificada — use Desdobramento ou 5 Jogos.`
                    : 'Selecione entre 6 e 20 dezenas (limite oficial da Caixa) e aplique os filtros.'}
              </p>
            </div>

            {/* Quick actions: Surpresinha (6–20, padrão Caixa) + Resetar Tudo */}
            <div className="flex items-start gap-2">
              <SeletorAleatorias
                quantidade={qtdAleatorias}
                onQuantidadeChange={setQtdAleatorias}
                onGerar={handleRandomSelect}
                travadoEm={isFechamento ? fechamentoN : undefined}
              />
              <button
                type="button"
                onClick={handleResetAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-500/40 text-xs font-semibold text-red-300 hover:text-white hover:bg-red-900/50 hover:border-red-400 transition-colors"
                title="Limpar tudo: dezenas, filtros, jogos e meta — recomeçar do zero"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resetar Tudo</span>
              </button>
            </div>
          </div>

          {/* Main Grid: Left = 1-60 Grid, Right = Filters / 5 Jogos panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Number Grid & Counter */}
            <section className="lg:col-span-7 xl:col-span-8 space-y-6">
              <div className="surface-card rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
                {/* Ambient emerald gradient top */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

                {/* Grid 01-60 */}
                <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-12 gap-2 sm:gap-2.5">
                  {Array.from({ length: 60 }, (_, i) => i + 1).map((num) => {
                    const isSelected = selectedNumbers.includes(num)
                    const isMaxReached = !isSelected && count >= maxSelection

                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => toggleNumber(num)}
                        disabled={isMaxReached}
                        title={
                          isMaxReached
                            ? `Limite de ${maxSelection} dezenas atingido`
                            : isSelected
                              ? `Remover dezena ${formatTwoDigits(num)}`
                              : `Selecionar dezena ${formatTwoDigits(num)}`
                        }
                        className={`
                      relative aspect-square w-full min-h-[44px] sm:min-h-[48px] rounded-xl font-bold text-sm sm:text-base flex items-center justify-center transition-all duration-150 select-none
                      ${
                        isSelected
                          ? 'emerald-gradient text-white emerald-glow scale-[1.05] z-10 border border-emerald-300/40 ring-1 ring-emerald-400/50 font-extrabold'
                          : 'number-btn-unselected hover:scale-[1.02]'
                      }
                      ${
                        isMaxReached
                          ? 'opacity-35 cursor-not-allowed hover:scale-100 hover:bg-[#1a1f2b] hover:border-[#262c34] hover:text-zinc-500'
                          : 'cursor-pointer'
                      }
                    `}
                      >
                        {formatTwoDigits(num)}
                      </button>
                    )
                  })}
                </div>

                {/* Counter Section Below Grid */}
                <div className="mt-6 pt-5 border-t border-[#262c34] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Circular Progress Arc */}
                    <div className="relative w-12 h-12 flex items-center justify-center flex-shrink-0">
                      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
                        <circle
                          stroke="#262c34"
                          fill="transparent"
                          strokeWidth={stroke}
                          r={normalizedRadius}
                          cx={radius}
                          cy={radius}
                        />
                        <circle
                          stroke={strokeColor}
                          fill="transparent"
                          strokeWidth={stroke}
                          strokeDasharray={`${circumference} ${circumference}`}
                          style={{ strokeDashoffset }}
                          strokeLinecap="round"
                          r={normalizedRadius}
                          cx={radius}
                          cy={radius}
                          className="transition-all duration-300 ease-out"
                        />
                      </svg>
                      <span className="absolute text-xs font-bold text-white">{count}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold text-sm sm:text-base">
                          Dezenas Selecionadas:{' '}
                          <span
                            className={
                              isValidCount
                                ? 'text-emerald-400 font-bold'
                                : isOverLimit
                                  ? 'text-red-400 font-bold'
                                  : 'text-zinc-400'
                            }
                          >
                            {count}
                          </span>
                        </span>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full border ${badgeColorClass}`}
                        >
                          {count < minRequired
                            ? `Faltam ${minRequired - count}`
                            : count <= maxSelection
                              ? `${maxSelection - count} restantes`
                              : 'Excedeu limite'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {isCincoJogos
                          ? `Mínimo ${ticketSize} e máximo ${FIVE_GAMES_MAX_SELECTION} dezenas para otimização de cobertura.`
                          : isFechamento
                            ? `Exatamente ${fechamentoN} dezenas para o fechamento L(${fechamentoN},6,6,t).`
                            : 'Mínimo 6 e máximo 20 dezenas (volante oficial da Mega-Sena).'}
                      </p>
                    </div>
                  </div>

                  {/* Selected numbers chips preview if any */}
                  {count > 0 && (
                    <div className="flex flex-wrap items-center justify-end gap-1 max-w-[280px]">
                      {selectedNumbers.map((n) => (
                        <span
                          key={n}
                          onClick={() => toggleNumber(n)}
                          title="Clique para remover"
                          className="cursor-pointer text-[11px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 hover:bg-red-950/60 hover:border-red-500/40 hover:text-red-300 transition-colors"
                        >
                          {formatTwoDigits(n)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Resultado do Modo 5 Jogos (aparece abaixo do grid) */}
              {isCincoJogos && liveResult && (
                <FiveGamesResultSection
                  result={liveResult}
                  editableGames={editableGames ?? []}
                  copiedIndex={copiedIndex}
                  onCopy={copyGameToClipboard}
                  onExport={handleExportFiveGames}
                  exported={exported}
                  meta={meta}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  onReset={handleResetJogos}
                  dragInfo={dragInfo}
                  dragOverIdx={dragOverIdx}
                  invalidDropIdx={invalidDropIdx}
                  ticketSize={ticketSize}
                />
              )}
              {isCincoJogos && liveResult && <ProbabilisticAnalysis result={liveResult} />}
              {isCincoJogos && liveResult && (
                <ValidacaoHistorica jogos={liveResult.games} />
              )}
              {isCincoJogos && liveResult && (
                <SimulacaoHistorica jogos={liveResult.games} conjunto />
              )}
              {isCincoJogos && liveResult && (
                <>
                  <ComparacaoConcurso
                    jogos={liveResult.games}
                    titulo="Conferir com Sorteio"
                    subtitulo="Digite as 6 dezenas sorteadas para ver quantos acertos cada jogo teria"
                    botaoLabel="Conferir"
                    permitirBuscaConcurso={false}
                    onConferir={handleConferirCincoJogos}
                  />
                  <div className="flex justify-center sm:justify-start gap-2 flex-wrap">
                    <BotaoConfirmarHistorico modo="cinco-jogos" jogos={liveResult.games} />
                    <PrintableVersion jogos={jogosComScore(liveResult.games)} modo="Modo 5 Jogos" />
                  </div>
                </>
              )}
              {isFechamento && fechamentoGerado ? (
                <div id="fechamento-jogos">
                  <FechamentoJogos dezenas={selectedNumbers} />
                </div>
              ) : null}
            </section>

            {/* Right Column: Filters (Desdobramento) / Painel 5 Jogos */}
            <section className="lg:col-span-5 xl:col-span-4 space-y-6">
              {isCincoJogos ? (
                <FiveGamesPanel
                  count={count}
                  isValidCount={isValidCount}
                  isUnderLimit={isUnderLimit}
                  isLoading={isLoading}
                  onGenerate={handleGenerate}
                  result={liveResult}
                  meta={meta}
                  onMetaChange={handleMetaChange}
                  ticketSize={ticketSize}
                  onTicketSizeChange={handleTicketSizeChange}
                />
              ) : isFechamento ? (
                <>
                  <ComparadorOrcamento onAplicar={handleAplicarOrcamento} />
                  <FechamentoPanel
                    dezenas={selectedNumbers}
                    gerado={fechamentoGerado}
                    isLoading={isLoading}
                    onGenerate={handleGenerateFechamento}
                  />
                </>
              ) : (
                <FiltersPanel
                  filters={filters}
                  toggleFilter={toggleFilter}
                  isValidCount={isValidCount}
                  isUnderLimit={isUnderLimit}
                  isLoading={isLoading}
                  onGenerate={handleGenerate}
                />
              )}
            </section>
          </div>
          {/* Fim do bloco não-torneio */}
        </>
      )}
      {/* Histórico de Conferências (Modo 5 Jogos e Desdobramento) */}
      {!isTorneio && isCincoJogos && (
        <HistoricoConferencias historico={historico} onLimpar={limpar} />
      )}
    </div>
  )
}

/* ============================================================
 * Filters panel (Modo Desdobramento) — lógica original preservada
 * ============================================================ */
const FiltersPanel: React.FC<{
  filters: ReturnType<typeof useMega>['filters']
  toggleFilter: ReturnType<typeof useMega>['toggleFilter']
  isValidCount: boolean
  isUnderLimit: boolean
  isLoading: boolean
  onGenerate: () => void
}> = ({ filters, toggleFilter, isValidCount, isUnderLimit, isLoading, onGenerate }) => (
  <div className="surface-card rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
    <div className="space-y-5">
      {/* Filter Panel Header */}
      <div className="border-b border-[#262c34] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Filter className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">Filtros de Redução</h2>
        </div>
        <p className="text-xs text-zinc-400 mt-1.5">Aplique filtros matemáticos e heurísticos</p>
      </div>

      {/* 4 Filter Toggle Cards */}
      <div className="space-y-3">
        {/* 1. Parity Filter */}
        <div
          className={`p-3.5 rounded-xl border transition-colors flex items-start justify-between gap-3 ${
            filters.parity
              ? 'bg-[#19222c] border-emerald-500/30'
              : 'bg-[#161a1f] border-[#262c34] opacity-80'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#1a1f2b] border border-[#262c34] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Scale className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-white">Filtro de Paridade</span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Eliminar jogos com 5 ou 6 números pares ou ímpares. Manter apenas proporções 3/3,
                4/2 ou 2/4.
              </p>
            </div>
          </div>
          <div className="pt-0.5 flex-shrink-0">
            <ToggleSwitch
              id="filter-parity"
              label="Filtro de Paridade"
              checked={filters.parity}
              onChange={() => toggleFilter('parity')}
            />
          </div>
        </div>

        {/* 2. Sum Filter */}
        <div
          className={`p-3.5 rounded-xl border transition-colors flex items-start justify-between gap-3 ${
            filters.sum
              ? 'bg-[#19222c] border-emerald-500/30'
              : 'bg-[#161a1f] border-[#262c34] opacity-80'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#1a1f2b] border border-[#262c34] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Calculator className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-white">Filtro de Soma</span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Eliminar jogos cuja soma das dezenas seja menor que 120 ou maior que 240.
              </p>
            </div>
          </div>
          <div className="pt-0.5 flex-shrink-0">
            <ToggleSwitch
              id="filter-sum"
              label="Filtro de Soma"
              checked={filters.sum}
              onChange={() => toggleFilter('sum')}
            />
          </div>
        </div>

        {/* 3. Expected Value (Dates) Filter */}
        <div
          className={`p-3.5 rounded-xl border transition-colors flex items-start justify-between gap-3 ${
            filters.expectedValue
              ? 'bg-[#19222c] border-emerald-500/30'
              : 'bg-[#161a1f] border-[#262c34] opacity-80'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#1a1f2b] border border-[#262c34] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Brain className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-white">Filtro de Valor Esperado</span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Eliminar jogos com 4 ou mais números entre 1 e 31 (evita jogos baseados em datas de
                aniversário).
              </p>
            </div>
          </div>
          <div className="pt-0.5 flex-shrink-0">
            <ToggleSwitch
              id="filter-expected-value"
              label="Filtro de Valor Esperado"
              checked={filters.expectedValue}
              onChange={() => toggleFilter('expectedValue')}
            />
          </div>
        </div>

        {/* 4. Sequence Filter */}
        <div
          className={`p-3.5 rounded-xl border transition-colors flex items-start justify-between gap-3 ${
            filters.sequence
              ? 'bg-[#19222c] border-emerald-500/30'
              : 'bg-[#161a1f] border-[#262c34] opacity-80'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#1a1f2b] border border-[#262c34] flex items-center justify-center flex-shrink-0 mt-0.5">
              <ListOrdered className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-white">Filtro de Sequência</span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Eliminar jogos com 3 ou mais números em sequência pura (ex: 12, 13, 14).
              </p>
            </div>
          </div>
          <div className="pt-0.5 flex-shrink-0">
            <ToggleSwitch
              id="filter-sequence"
              label="Filtro de Sequência"
              checked={filters.sequence}
              onChange={() => toggleFilter('sequence')}
            />
          </div>
        </div>
      </div>
    </div>

    {/* CTA Button */}
    <div className="mt-6 pt-5 border-t border-[#262c34] space-y-2">
      <button
        type="button"
        onClick={onGenerate}
        disabled={!isValidCount || isLoading}
        className={`
          w-full py-3.5 px-6 rounded-xl font-bold text-white flex items-center justify-center gap-2.5 transition-all duration-200 select-none shadow-lg
          ${
            isValidCount && !isLoading
              ? 'emerald-gradient emerald-glow hover:translate-y-[-2px] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] active:scale-[0.98] cursor-pointer'
              : 'bg-[#1a1f2b] text-zinc-500 border border-[#262c34] opacity-50 cursor-not-allowed'
          }
        `}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin text-white" />
            <span>Processando combinações...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 text-white" />
            <span>Gerar Desdobramento</span>
          </>
        )}
      </button>

      <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
        <span>Máximo de 5.005 combinações</span>
        {isValidCount && (
          <span className="text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Pronto para gerar
          </span>
        )}
        {isUnderLimit && (
          <span className="text-amber-400/80 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Selecione ao menos 6
          </span>
        )}
      </div>
    </div>
  </div>
)

/* ============================================================
 * Painel do Modo 5 Jogos
 * ============================================================ */
const FiveGamesPanel: React.FC<{
  count: number
  isValidCount: boolean
  isUnderLimit: boolean
  isLoading: boolean
  onGenerate: () => void
  result: FiveGamesResult | null
  meta: OptimizationMeta
  onMetaChange: (m: OptimizationMeta) => void
  ticketSize: number
  onTicketSizeChange: (n: number) => void
}> = ({
  count,
  isValidCount,
  isUnderLimit,
  isLoading,
  onGenerate,
  result,
  meta,
  onMetaChange,
  ticketSize,
  onTicketSizeChange,
}) => (

  <div className="surface-card rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
    <div className="space-y-5">
      {/* Header */}
      <div className="border-b border-[#262c34] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Target className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">Otimizador de Cobertura</h2>
        </div>
        <p className="text-xs text-zinc-400 mt-1.5">
          Gera 5 jogos de {ticketSize} dezenas maximizando a cobertura do grupo
        </p>
      </div>

      {/* Resumo / instruções */}
      <div className="space-y-3">
        <div className="p-3.5 rounded-xl bg-[#161a1f] border border-[#262c34]">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-white">Como funciona</span>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                As dezenas selecionadas são distribuídas em 5 jogos oficiais de {ticketSize}{' '}
                dezenas (padrão Caixa: 6 a 20). O algoritmo prioriza cobrir o máximo do grupo.
              </p>
            </div>
          </div>
        </div>

        <label className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-[#161a1f] border border-[#262c34]">
          <span className="text-xs font-semibold text-zinc-300">Dezenas por jogo</span>
          <div className="flex items-center justify-between gap-2">
            <select
              value={ticketSize}
              onChange={(e) => onTicketSizeChange(Number(e.target.value))}
              aria-label="Quantidade de dezenas em cada um dos 5 jogos (6 a 20)"
              className="h-9 rounded-lg bg-[#1a1f2b] border border-[#262c34] text-sm text-zinc-200 px-2 pr-8 focus:outline-none focus:border-emerald-500/60"
            >
              {Array.from({ length: MEGA_MAX_DEZENAS - MEGA_MIN_DEZENAS + 1 }, (_, i) => i + MEGA_MIN_DEZENAS).map(
                (n) => (
                  <option key={n} value={n}>
                    {n} dezenas
                  </option>
                ),
              )}
            </select>
            <span className="text-[11px] text-zinc-500 text-right leading-tight">
              5 × {formatCurrencyBRL(precoOficialCaixa(ticketSize))}
              <br />
              {formatCurrencyBRL(5 * precoOficialCaixa(ticketSize))}
            </span>
          </div>
        </label>

        {/* Controle de Meta de Otimização */}
        <OptimizationMetaControl meta={meta} onChange={onMetaChange} />

        {result && (
          <div className="grid grid-cols-2 gap-2.5">
            <StatBox
              icon={<Percent className="w-4 h-4" />}
              label="Cobertura"
              value={`${result.coveragePercent}%`}
              accent={meta === 'cobertura'}
              highlight={meta === 'cobertura'}
            />
            <StatBox
              icon={<CheckCircle2 className="w-4 h-4" />}
              label="Cobertas / Fora"
              value={`${result.covered.length} / ${result.uncovered.length}`}
            />
          </div>
        )}
      </div>
    </div>

    {/* CTA Button */}
    <div className="mt-6 pt-5 border-t border-[#262c34] space-y-2">
      <button
        type="button"
        onClick={onGenerate}
        disabled={!isValidCount || isLoading}
        className={`
          w-full py-3.5 px-6 rounded-xl font-bold text-white flex items-center justify-center gap-2.5 transition-all duration-200 select-none shadow-lg
          ${
            isValidCount && !isLoading
              ? 'emerald-gradient emerald-glow hover:translate-y-[-2px] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] active:scale-[0.98] cursor-pointer'
              : 'bg-[#1a1f2b] text-zinc-500 border border-[#262c34] opacity-50 cursor-not-allowed'
          }
        `}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin text-white" />
            <span>Otimizando jogos...</span>
          </>
        ) : (
          <>
            <Target className="w-5 h-5 text-white" />
            <span>Gerar 5 Jogos</span>
          </>
        )}
      </button>

      <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
        <span>{count} dezenas no grupo</span>
        {isValidCount && (
          <span className="text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Pronto para gerar
          </span>
        )}
        {isUnderLimit && (
          <span className="text-amber-400/80 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Selecione ao menos {ticketSize}
          </span>
        )}
      </div>
    </div>
  </div>
)

const StatBox: React.FC<{
  icon: React.ReactNode
  label: string
  value: string
  accent?: boolean
  highlight?: boolean
}> = ({ icon, label, value, accent, highlight }) => (
  <div
    className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all ${
      accent ? 'bg-emerald-950/40 border-emerald-500/30' : 'bg-[#161a1f] border-[#262c34]'
    } ${highlight ? 'ring-1 ring-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.15)]' : ''}`}
  >
    <div
      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
        accent
          ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
          : 'bg-[#1a1f2b] border border-[#262c34] text-zinc-400'
      }`}
    >
      {icon}
    </div>
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
        {label}
      </div>
      <div className={`text-sm font-extrabold ${accent ? 'text-emerald-400' : 'text-white'}`}>
        {value}
      </div>
    </div>
  </div>
)

/* ============================================================
 * Controle de Meta de Otimização (pills)
 * ============================================================ */
const OptimizationMetaControl: React.FC<{
  meta: OptimizationMeta
  onChange: (m: OptimizationMeta) => void
}> = ({ meta, onChange }) => {
  const opcoes: {
    key: OptimizationMeta
    label: string
    desc: string
    icon: React.ReactNode
  }[] = [
    {
      key: 'cobertura',
      label: 'Máxima Cobertura',
      desc: 'Prioriza cobrir todo o grupo',
      icon: <Percent className="w-3.5 h-3.5" />,
    },
    {
      key: 'equilibrado',
      label: 'Equilibrado',
      desc: 'Cobertura + score (padrão)',
      icon: <Scale className="w-3.5 h-3.5" />,
    },
    {
      key: 'score',
      label: 'Melhor Score',
      desc: 'Maximiza o score mínimo entre os 5 jogos (maximin)',
      icon: <BarChart3 className="w-3.5 h-3.5" />,
    },
    {
      key: 'elite',
      label: 'Score Elite',
      desc: 'Prioriza jogos com score máximo (≥90%), sacrificando cobertura',
      icon: <Star className="w-3.5 h-3.5" />,
    },
  ]

  return (
    <div className="p-3.5 rounded-xl bg-[#161a1f] border border-[#262c34]">
      <div className="flex items-center gap-2 mb-2.5">
        <Target className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-xs font-semibold text-white">Meta de Otimização</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {opcoes.map((opt) => {
          const active = meta === opt.key
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.key)}
              className={`
                flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg border transition-all text-center
                ${
                  active
                    ? 'emerald-gradient text-white border-emerald-300/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                    : 'bg-[#1a1f2b] border-[#262c34] text-zinc-400 hover:text-white hover:border-zinc-600'
                }
              `}
              title={opt.desc}
            >
              <span className={active ? 'text-white' : 'text-emerald-400'}>{opt.icon}</span>
              <span className="text-[10px] font-bold leading-tight">{opt.label}</span>
            </button>
          )
        })}
      </div>
      <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed">
        {meta === 'elite'
          ? 'Pesos: score ×9 · cobertura ×0.2 · sobreposição ×0.5 — foco total no score'
          : META_WEIGHTS[meta].score === 5
            ? 'Pesos: score ×5 · cobertura ×1 · sobreposição ×1 — maximiza o score mínimo (maximin)'
            : META_WEIGHTS[meta].cobertura === 6
              ? 'Pesos: score ×1 · cobertura ×6 · sobreposição ×2'
              : 'Pesos: score ×2 · cobertura ×4 · sobreposição ×1'}
      </p>
    </div>
  )
}

/* ============================================================
 * Seção de resultado do Modo 5 Jogos (cards de bilhete com
 * chips arrastáveis — HTML5 Drag and Drop nativo)
 * ============================================================ */
const FiveGamesResultSection: React.FC<{
  result: FiveGamesResult
  editableGames: number[][]
  copiedIndex: number | null
  onCopy: (game: number[], index: number) => void
  onExport: () => void
  exported: boolean
  meta: OptimizationMeta
  onDragStart: (fromIdx: number, num: number) => void
  onDragOver: (e: React.DragEvent, toIdx: number) => void
  onDragLeave: (toIdx: number) => void
  onDrop: (e: React.DragEvent, toIdx: number) => void
  onDragEnd: () => void
  onReset: () => void
  dragInfo: { fromIdx: number; num: number } | null
  dragOverIdx: number | null
  invalidDropIdx: number | null
  ticketSize: number
}> = ({
  result,
  editableGames,
  copiedIndex,
  onCopy,
  onExport,
  exported,
  meta,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onReset,
  dragInfo,
  dragOverIdx,
  invalidDropIdx,
  ticketSize,
}) => {
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header + Export + Reset */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#262c34] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              5 Jogos Otimizados
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#1a1f2b] border border-[#262c34] text-emerald-400">
                5 jogos × {ticketSize} dezenas
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              Arraste as dezenas entre os bilhetes para ajustar manualmente
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onReset}
            className="px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-sm bg-[#1a1f2b] text-zinc-300 border border-[#262c34] hover:text-white hover:border-emerald-500/50 hover:bg-[#202735] active:scale-[0.98] transition-all"
            title="Limpar os 5 jogos gerados e voltar à seleção"
          >
            <RotateCcw className="w-4 h-4 text-emerald-400" />
            <span>Resetar Jogos</span>
          </button>
          <VolanteOficial jogos={editableGames} />
          <button
            type="button"
            onClick={onExport}
            className="emerald-gradient text-white font-bold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 emerald-glow hover:translate-y-[-2px] hover:shadow-[0_0_18px_rgba(16,185,129,0.5)] active:scale-[0.98] transition-all shadow-md text-sm"
          >
            {exported ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            <span>{exported ? 'Exportado!' : 'Exportar (.txt)'}</span>
          </button>
        </div>
      </div>

      {/* Estatísticas de cobertura + Score médio + Schönheim */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div
          className={`surface-card rounded-xl p-4 border flex items-center gap-3 transition-all ${
            meta === 'cobertura'
              ? 'border-emerald-500/40 ring-1 ring-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
              : 'border-[#262c34]'
          }`}
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Percent className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
              Cobertura
            </div>
            <div className="text-lg font-extrabold text-emerald-400">{result.coveragePercent}%</div>
          </div>
        </div>
        <div className="surface-card rounded-xl p-4 border border-[#262c34] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
              Dezenas cobertas
            </div>
            <div className="text-lg font-extrabold text-white">
              {result.covered.length}
              <span className="text-xs text-zinc-500 font-medium"> / {result.groupSize}</span>
            </div>
          </div>
        </div>
        <div className="surface-card rounded-xl p-4 border border-[#262c34] flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              result.uncovered.length > 0
                ? 'bg-amber-950/50 border border-amber-500/30 text-amber-400'
                : 'bg-[#1a1f2b] border border-[#262c34] text-zinc-400'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
              Dezenas de fora
            </div>
            <div
              className={`text-lg font-extrabold ${
                result.uncovered.length > 0 ? 'text-amber-400' : 'text-white'
              }`}
            >
              {result.uncovered.length}
            </div>
          </div>
        </div>
        <AverageScoreCard scores={result.scores} highlight={meta === 'score' || meta === 'elite'} />
        <SchonheimCard groupSize={result.groupSize} ticketSize={ticketSize} />
      </div>

      {/* Cards dos 5 jogos — chips arrastáveis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {editableGames.map((game, idx) => {
          const isCopied = copiedIndex === idx
          const isDragOver = dragOverIdx === idx
          const isInvalid = invalidDropIdx === idx
          const isFull = game.length >= ticketSize
          return (
            <div
              key={idx}
              onDragOver={(e) => onDragOver(e, idx)}
              onDragLeave={() => onDragLeave(idx)}
              onDrop={(e) => onDrop(e, idx)}
              className={`surface-card rounded-xl p-4 border transition-all group relative ${
                isInvalid
                  ? 'border-red-500 animate-pulse'
                  : isDragOver
                    ? 'border-dashed border-emerald-400 bg-emerald-950/20'
                    : 'border-[#262c34] hover:border-emerald-500/50 hover:shadow-[0_4px_20px_rgba(16,185,129,0.15)]'
              } ${calculateGameScore(game) >= SCORE_ELITE_THRESHOLD ? 'high-score-glow' : ''}`}
            >
              {/* Badge "Score Elite" no canto do card (score ≥ 90%) */}
              {calculateGameScore(game) >= SCORE_ELITE_THRESHOLD && (
                <span
                  className="absolute -top-2 -right-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold text-white emerald-gradient border border-emerald-300/50 shadow-[0_0_10px_rgba(16,185,129,0.6)] whitespace-nowrap"
                  title="Jogo com score ≥ 90% — Score Elite"
                >
                  <Flame className="w-3 h-3" />
                  Score Elite
                </span>
              )}
              {/* Cabeçalho do bilhete */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  Jogo #{String(idx + 1).padStart(2, '0')}
                  <span className="text-[10px] text-zinc-500 font-normal ml-1">
                    ({game.length}/{ticketSize})
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onCopy(game, idx)}
                  className="text-zinc-500 hover:text-emerald-400 p-1 rounded transition-colors"
                  title="Copiar jogo"
                >
                  {isCopied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Chips arrastáveis das dezenas */}
              <div className="flex flex-wrap gap-1.5 min-h-[44px]">
                {game.map((num) => {
                  const isDragging = dragInfo?.fromIdx === idx && dragInfo?.num === num
                  return (
                    <div
                      key={num}
                      draggable
                      onDragStart={() => onDragStart(idx, num)}
                      onDragEnd={onDragEnd}
                      title={`Arraste a dezena ${formatTwoDigits(num)} para outro bilhete`}
                      className={`px-2.5 py-1.5 rounded-lg font-mono text-sm font-bold border select-none transition-all ${
                        isDragging
                          ? 'opacity-50 cursor-grabbing bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                          : 'cursor-grab bg-[#1a1f2b] border-[#262c34] group-hover:border-emerald-500/30 text-white hover:bg-emerald-950/40 hover:border-emerald-500/40 active:cursor-grabbing'
                      }`}
                    >
                      {formatTwoDigits(num)}
                    </div>
                  )
                })}
                {game.length === 0 && (
                  <span className="text-[11px] text-zinc-600 italic">Bilhete vazio</span>
                )}
              </div>

              {/* Aviso de bilhete cheio */}
              {isFull && (
                <div className="mt-2 text-[10px] text-amber-400/70 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Bilhete cheio — não aceita novas dezenas
                </div>
              )}

              {/* String formatada */}
              <div className="mt-3 pt-2 border-t border-[#262c34]/60 text-[11px] text-zinc-400 font-mono text-center tracking-tight">
                {formatGameString(game)}
              </div>

              {/* Score de Acertividade */}
              <FiveGameScoreBar game={game} />
            </div>
          )
        })}
      </div>

      {/* Dezenas não cobertas (se houver) */}
      {result.uncovered.length > 0 && (
        <div className="surface-card rounded-xl p-4 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
            <AlertCircle className="w-4 h-4" />
            <span>Dezenas fora da cobertura:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {result.uncovered.map((n) => (
              <span
                key={n}
                className="px-2 py-0.5 rounded-md bg-amber-950/50 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold"
              >
                {formatTwoDigits(n)}
              </span>
            ))}
          </div>
          <p className="text-xs text-zinc-500 sm:ml-auto">
            Aumente o grupo para melhorar a cobertura destas dezenas.
          </p>
        </div>
      )}
    </div>
  )
}

/* ============================================================
 * Score de Acertividade — barra de progresso por jogo (5 Jogos)
 * ============================================================ */
const FiveGameScoreBar: React.FC<{ game: number[] }> = ({ game }) => {
  const score = calculateGameScore(game)
  const { textColor, bgClass, label } = getScoreColor(score)
  const breakdown = computeScoreV3(game)
  const breakdownStr = formatScoreBreakdown(breakdown)
  const isElite = score >= SCORE_ELITE_THRESHOLD
  const evJogo = calcularEV(game)
  const popularidade = estimatePopularityFactor(game)

  return (
    <div className="mt-2 pt-2 border-t border-[#262c34]/60 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
          Score de Acertividade
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={`text-[11px] font-extrabold ${textColor} cursor-help underline decoration-dotted underline-offset-2 ${
                isElite ? 'animate-pulse' : ''
              }`}
              title="Passe o mouse para ver o breakdown do score"
            >
              {score}%
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="bg-[#12161b] border-emerald-500/40 text-zinc-200 max-w-[280px] text-[11px] leading-relaxed shadow-[0_0_18px_rgba(16,185,129,0.25)]"
          >
            <div className="font-semibold text-emerald-400 mb-1">Breakdown do Score (v3)</div>
            <div className="font-mono text-[10px]">{breakdownStr}</div>
            <div className="text-[10px] text-zinc-400 mt-1">
              A) Hipergeométrica · B) Uniformidade KS · C) Gaps · D) Soma Normal · E) Entropia · F)
              Anti-Popularidade
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="h-1 w-full rounded-full bg-[#1a1f2b] overflow-hidden">
        <div
          className={`h-full rounded-full ${bgClass} transition-all duration-300`}
          style={{ width: `${score}%` }}
        />
      </div>
      {/* Card "Score Médio" — média dos 5 scores com cor correspondente */}
      <div className={`text-[10px] font-bold ${textColor}`}>
        {label}
        {isElite && (
          <span className="ml-1.5 inline-flex items-center gap-0.5 text-emerald-400">
            <Star className="w-2.5 h-2.5 fill-emerald-400" />
            Alta Performance
          </span>
        )}
      </div>
      {/* Linha sutil: EV por jogo + Popularidade */}
      <div className="text-[10px] text-zinc-500 flex items-center gap-1.5">
        <span>
          EV: <span className="text-zinc-400">{formatCurrencyBRL(evJogo)}</span>
        </span>
        <span className="text-zinc-600">•</span>
        <span>
          Popularidade: <span className="text-zinc-400">{popularidade.toFixed(1)}</span>
        </span>
      </div>
      <GameScoreRadar game={game} />
    </div>
  )
}

/* ============================================================
 * Card "Eficiência Schönheim" — proximidade do limite teórico
 * ============================================================ */
const SchonheimCard: React.FC<{ groupSize: number; ticketSize: number }> = ({
  groupSize,
  ticketSize,
}) => {
  const eficiencia = coverageEfficiency(groupSize, FIVE_GAMES_COUNT, ticketSize, 2)
  const colorClass =
    eficiencia >= 60 ? 'text-emerald-400' : eficiencia >= 30 ? 'text-amber-400' : 'text-orange-400'

  return (
    <div className="surface-card rounded-xl p-4 border border-[#262c34] flex items-center gap-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-9 h-9 rounded-lg bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-center text-emerald-400 cursor-help">
            <Target className="w-4 h-4" />
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-[#12161b] border-emerald-500/40 text-zinc-200 max-w-[280px] text-[11px] leading-relaxed shadow-[0_0_18px_rgba(16,185,129,0.25)]"
        >
          O limite de Schönheim define o número mínimo teórico de bilhetes para garantir cobertura
          total de pares (t=2). A eficiência mede quão perto o conjunto está desse limite teórico.
        </TooltipContent>
      </Tooltip>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
          Eficiência Schönheim
        </div>
        <div className={`text-lg font-extrabold ${colorClass}`}>{eficiencia.toFixed(1)}%</div>
      </div>
    </div>
  )
}

/* ============================================================
 * Card "Score Médio" — média dos 5 scores com cor correspondente============================================================
 * Card "Score Médio" — média dos 5 scores com cor correspondente
 * ============================================================ */
const AverageScoreCard: React.FC<{ scores: number[]; highlight?: boolean }> = ({
  scores,
  highlight,
}) => {
  const avg =
    scores.length > 0 ? Math.round(scores.reduce((acc, s) => acc + s, 0) / scores.length) : 0
  const { textColor, label } = getScoreColor(avg)

  return (
    <div
      className={`surface-card rounded-xl p-4 border flex items-center gap-3 transition-all ${
        highlight
          ? 'border-emerald-500/40 ring-1 ring-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
          : 'border-[#262c34]'
      }`}
    >
      <div className="w-9 h-9 rounded-lg bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
        <BarChart3 className="w-4 h-4" />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
          Score Médio
        </div>
        <div className={`text-lg font-extrabold ${textColor}`}>
          {avg}%<span className={`text-[10px] font-bold ml-1.5 ${textColor}`}>{label}</span>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
 * Análise Probabilística — seção abaixo dos 5 bilhetes
 * ============================================================ */
const ProbabilisticAnalysis: React.FC<{ result: FiveGamesResult }> = ({ result }) => {
  // Probabilidade combinada (Bonferroni 2ª ordem) — motor v3
  const probCombinada = calcularProbabilidadeCombinada(result.games)
  const probPercent = (probCombinada.peloMenosQuadra * 100).toFixed(4)
  // Valor Esperado (EV) total + EV por real — motor v3
  const evTotal = calcularEVConjunto(result.games)
  const evPorReal = calcularEVPorReal(result.games)
  // Probabilidade de um único jogo de 6 dezenas (referência Mega-Sena)
  const probSingleQuadra =
    (binomialCoefficientLocal(6, 4) * binomialCoefficientLocal(54, 2)) /
    binomialCoefficientLocal(60, 6)
  const probSingleQuadraPercent = (probSingleQuadra * 100).toFixed(4)

  return (
    <div className="surface-card rounded-2xl p-5 sm:p-6 border border-emerald-500/20 shadow-lg space-y-4">
      <div className="flex items-center gap-2.5 border-b border-[#262c34] pb-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <PieChart className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">Análise Probabilística</h3>
          <p className="text-xs text-zinc-400">
            Cálculos rigorosos por distribuição hipergeométrica
          </p>
        </div>
      </div>

      {/* Métricas do conjunto: EV Total, Prob. ≥Quadra, EV por real */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-[#161a1f] border border-[#262c34]">
          <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">
            EV Total
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">
            {formatCurrencyBRL(evTotal)}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">
            Valor esperado agregado dos 5 jogos (soma dos EVs individuais).
          </p>
        </div>
        <div className="p-4 rounded-xl bg-[#161a1f] border border-[#262c34]">
          <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">
            Prob. ≥ Quadra
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">{probPercent}%</div>
          <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">
            Bonferroni 2ª ordem (inclusão-exclusão) — probabilidade de ao menos 1 jogo acertar
            quadra ou mais.
          </p>
        </div>
        <div className="p-4 rounded-xl bg-[#161a1f] border border-[#262c34]">
          <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">
            EV por real
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">{evPorReal.toFixed(3)}</div>
          <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">
            Razão entre o EV total e o custo da aposta — quanto cada real apostado renderia em valor
            esperado.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-4 rounded-xl bg-[#161a1f] border border-[#262c34]">
          <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">
            Probabilidade de ao menos 1 jogo acertar 4+ números
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">{probPercent}%</div>
          <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">
            Considerando a união das dezenas dos 5 jogos. Estimativa via produto dos complementos (1
            − Π(1 − pᵢ)) das probabilidades hipergeométricas de cada jogo.
          </p>
        </div>
        <div className="p-4 rounded-xl bg-[#161a1f] border border-[#262c34]">
          <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">
            Referência: 1 bilhete simples de 6 dezenas (quadra)
          </div>
          <div className="text-2xl font-extrabold text-zinc-300">{probSingleQuadraPercent}%</div>
          <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">
            Probabilidade oficial de acertar a quadra com um único jogo de 6 dezenas: C(6,4)·C(54,2)
            / C(60,6). Serve como base de comparação para o conjunto de 5 jogos.
          </p>
        </div>
      </div>

      <div className="text-[11px] text-zinc-400 leading-relaxed bg-[#12161b] border border-[#262c34] rounded-xl p-3.5">
        <strong className="text-zinc-200">Como interpretar:</strong> a probabilidade de ao menos um
        dos 5 jogos acertar 4 ou mais dezenas cresce em relação a um bilhete isolado porque há mais
        dezenas em jogo. No entanto, lembre-se de que cada sorteio da Mega-Sena é um evento
        independente e uniforme — nenhum método elimina a aleatoriedade. O score probabilístico mede
        o quão alinhado cada jogo está com as distribuições teóricas esperadas (paridade
        hipergeométrica, soma gaussiana, entropia de décadas, regularidade de gaps), e não a chance
        real de premiação.
      </div>
    </div>
  )
}

// Helper local para evitar import circular dentro do JSX
function binomialCoefficientLocal(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  if (k === 0 || k === n) return 1
  const kk = Math.min(k, n - k)
  let r = 1
  for (let i = 1; i <= kk; i++) {
    r = (r * (n - kk + i)) / i
  }
  return Math.round(r)
}
