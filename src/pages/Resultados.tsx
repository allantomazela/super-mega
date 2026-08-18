import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Sigma,
  Filter as FilterIcon,
  PiggyBank,
  Banknote,
  Download,
  List,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle2,
  Copy,
  Sparkles,
  ArrowUpDown,
  BarChart3,
  SlidersHorizontal,
  Star,
  Flame,
} from 'lucide-react'
import { useMega } from '@/lib/MegaContext'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  FilterOptions,
  PRICE_PER_GAME,
  generateCombinations,
  applyFilters,
  formatTwoDigits,
  formatCurrencyBRL,
  formatNumberBR,
  formatGameString,
  calculateGameScore,
  computeScoreV2,
  formatScoreBreakdown,
  SCORE_ELITE_THRESHOLD,
  getScoreColor,
} from '@/lib/megaEngine'
import { ScoreHistogram } from '@/components/ScoreHistogram'
import { SimulacaoHistorica } from '@/components/SimulacaoHistorica'
import { PrintableVersion, jogosComScore } from '@/components/PrintableVersion'
import { ComparacaoConcurso, ConferenciaCallbackPayload } from '@/components/ComparacaoConcurso'
import { GameScoreRadar } from '@/components/RadarChart'
import { HistoricoConferencias } from '@/components/HistoricoConferencias'
import { useHistoricoConferencias } from '@/hooks/useHistoricoConferencias'

const ITEMS_PER_PAGE = 24

export default function Resultados() {
  const location = useLocation()
  const navigate = useNavigate()
  const { selectedNumbers: contextNumbers, filters: contextFilters } = useMega()

  // Grab state if present or fall back to context/session
  const stateData = location.state as
    | { selectedNumbers?: number[]; filters?: FilterOptions }
    | undefined

  const selectedNumbers = stateData?.selectedNumbers || contextNumbers
  const filters = stateData?.filters || contextFilters

  const [currentPage, setCurrentPage] = useState(1)
  const [showToast, setShowToast] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [sortByScore, setSortByScore] = useState(false)
  // Filtro por score mínimo (slider 0-100, step 5). 0 = mostra todos.
  const [minScore, setMinScore] = useState(0)

  // === Histórico de Conferências (localStorage) ===
  const { historico, adicionar, limpar } = useHistoricoConferencias()

  const handleConferir = useCallback(
    (payload: ConferenciaCallbackPayload) => {
      adicionar({
        modo: 'desdobramento',
        dezenasSorteadas: payload.dezenasSorteadas,
        jogos: payload.jogos,
      })
    },
    [adicionar],
  )

  // Redirect to / if no valid numbers selected
  useEffect(() => {
    if (!selectedNumbers || selectedNumbers.length < 6) {
      navigate('/', { replace: true })
    }
  }, [selectedNumbers, navigate])

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter(Boolean).length
  }, [filters])

  // Combinatorics computation with useMemo
  const { totalRaw, rawCombinations, filteredCombinations, economy, totalCost } = useMemo(() => {
    if (!selectedNumbers || selectedNumbers.length < 6) {
      return {
        totalRaw: 0,
        rawCombinations: [],
        filteredCombinations: [],
        economy: 0,
        totalCost: 0,
      }
    }

    const raw = generateCombinations(selectedNumbers, 6)
    const filtered = applyFilters(raw, filters)
    const rawCount = raw.length
    const filteredCount = filtered.length
    const eco = (rawCount - filteredCount) * PRICE_PER_GAME
    const cost = filteredCount * PRICE_PER_GAME

    return {
      totalRaw: rawCount,
      rawCombinations: raw,
      filteredCombinations: filtered,
      economy: eco,
      totalCost: cost,
    }
  }, [selectedNumbers, filters])

  // === Aplicação do filtro por score mínimo (slider) ===
  // Filtra os jogos que passaram pelos filtros originais mantendo apenas
  // aqueles cujo score ≥ minScore. Reflete em métricas, histograma e
  // exportação.
  const scoreFilteredCombinations = useMemo(() => {
    if (minScore <= 0) return filteredCombinations
    return filteredCombinations.filter((g) => calculateGameScore(g) >= minScore)
  }, [filteredCombinations, minScore])

  // Contagem de jogos com Score Elite (≥ 90%) — para o banner no topo
  const eliteCount = useMemo(() => {
    if (scoreFilteredCombinations.length === 0) return 0
    return scoreFilteredCombinations.filter((g) => calculateGameScore(g) >= SCORE_ELITE_THRESHOLD)
      .length
  }, [scoreFilteredCombinations])

  // Métricas dinâmicas conforme o filtro de score
  const scoreFilteredEconomy = useMemo(() => {
    return (totalRaw - scoreFilteredCombinations.length) * PRICE_PER_GAME
  }, [totalRaw, scoreFilteredCombinations.length])

  const scoreFilteredCost = useMemo(() => {
    return scoreFilteredCombinations.length * PRICE_PER_GAME
  }, [scoreFilteredCombinations.length])

  // Ordem de exibição (geração ou por score)
  const orderedCombinations = useMemo(() => {
    if (!sortByScore) return scoreFilteredCombinations
    return [...scoreFilteredCombinations].sort(
      (a, b) => calculateGameScore(b) - calculateGameScore(a),
    )
  }, [scoreFilteredCombinations, sortByScore])

  // Score médio dos jogos filtrados (após filtro de score)
  const averageScore = useMemo(() => {
    if (scoreFilteredCombinations.length === 0) return 0
    const sum = scoreFilteredCombinations.reduce((acc, g) => acc + calculateGameScore(g), 0)
    return Math.round(sum / scoreFilteredCombinations.length)
  }, [scoreFilteredCombinations])

  // Meta de cor do score médio (container + texto + rótulo)
  const scoreColorMeta = useMemo(() => {
    const { textColor, label } = getScoreColor(averageScore)
    const bgContainer =
      averageScore >= 80
        ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
        : averageScore >= 60
          ? 'bg-amber-950/40 border-amber-500/30 text-amber-400'
          : averageScore >= 40
            ? 'bg-orange-950/40 border-orange-500/30 text-orange-400'
            : 'bg-red-950/40 border-red-500/30 text-red-400'
    return { textColor, label, bgContainer }
  }, [averageScore])

  // Pagination
  const totalPages = Math.ceil(orderedCombinations.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, orderedCombinations.length)
  const currentGames = useMemo(() => {
    return orderedCombinations.slice(startIndex, endIndex)
  }, [orderedCombinations, startIndex, endIndex])

  // Reset page when filters, numbers, sort or score filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedNumbers, filters, sortByScore, minScore])

  // Export games to .txt file — apenas jogos que passam pelo filtro de score
  const handleExportTxt = () => {
    if (scoreFilteredCombinations.length === 0) return

    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = now.getFullYear()
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const dateFormatted = `${day}/${month}/${year}`

    const header = [
      `# ==========================================================`,
      `# Otimizador Estratégico Mega-Sena — Jogos Gerados`,
      `# Data de Geração: ${dateFormatted} às ${hours}:${minutes}`,
      `# Dezenas do Grupo (${selectedNumbers.length}): ${selectedNumbers.map(formatTwoDigits).join(', ')}`,
      `# Combinações Brutas: ${formatNumberBR(totalRaw)} | Jogos Filtrados: ${formatNumberBR(scoreFilteredCombinations.length)}`,
      `# Economia Gerada: ${formatCurrencyBRL(scoreFilteredEconomy)} | Custo Total: ${formatCurrencyBRL(scoreFilteredCost)}`,
      `# Filtros Ativos: ${Object.entries(filters)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(', ')}${minScore > 0 ? `, scoreMin=${minScore}` : ''}`,
      `# ==========================================================`,
      ``,
    ].join('\n')

    const body = scoreFilteredCombinations
      .map((game, idx) => `Jogo ${String(idx + 1).padStart(4, '0')}: ${formatGameString(game)}`)
      .join('\n')

    const fileContent = `${header}\n${body}\n`

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `MegaSena_Desdobramento_${day}_${month}_${year}_${scoreFilteredCombinations.length}jogos.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    // Trigger toast
    setShowToast(true)
  }

  // Auto-dismiss toast
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [showToast])

  const copyGameToClipboard = (game: number[], index: number) => {
    navigator.clipboard.writeText(formatGameString(game))
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 1500)
  }

  // Marcadores do slider de score
  const scoreMarks = [
    { valor: 0, label: '0 (Todos)' },
    { valor: 40, label: '40 (Regular)' },
    { valor: 60, label: '60 (Bom)' },
    { valor: 80, label: '80 (Ótimo)' },
  ]

  if (!selectedNumbers || selectedNumbers.length < 6) {
    return null
  }

  return (
    <div className="space-y-8 animate-fade-in relative pb-12">
      {/* Summary Bar */}
      <section className="surface-card rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1a1f2b] border border-[#262c34] text-xs font-semibold text-zinc-300 hover:text-white hover:border-emerald-500/40 hover:bg-[#202735] transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>Voltar e Editar</span>
          </Link>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-zinc-400 font-medium">Dezenas:</span>
            <div className="flex flex-wrap gap-1.5">
              {selectedNumbers.map((num) => (
                <span
                  key={num}
                  className="px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold"
                >
                  {formatTwoDigits(num)}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-400 bg-[#12161b] px-3 py-1.5 rounded-lg border border-[#262c34]">
          <FilterIcon className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            <strong className="text-white">{activeFiltersCount}</strong> de 4 filtros ativos
          </span>
        </div>
      </section>

      {/* === Controle de Filtro por Score (Slider) === */}
      <section className="surface-card rounded-2xl p-5 sm:p-6 border border-[#262c34] shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Score Mínimo</h3>
              <p className="text-xs text-zinc-400">Filtre os jogos pelo score probabilístico</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-2xl font-extrabold ${
                minScore > 0 ? 'text-emerald-400' : 'text-zinc-300'
              }`}
            >
              {minScore}%
            </span>
            <span className="text-[11px] px-2.5 py-1 rounded-full border bg-emerald-950/40 border-emerald-500/30 text-emerald-300 font-semibold whitespace-nowrap">
              Mostrando {formatNumberBR(scoreFilteredCombinations.length)} de{' '}
              {formatNumberBR(filteredCombinations.length)} jogos
              {minScore > 0 ? ` (Score ≥ ${minScore}%)` : ' (Score ≥ 0%)'}
            </span>
          </div>
        </div>

        {/* Slider estilizado */}
        <div className="space-y-2">
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={minScore}
            onChange={(e) => setMinScore(parseInt(e.target.value, 10))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-[#1a1f2b] accent-emerald-500 mega-score-slider"
            style={{
              background: `linear-gradient(to right, #10b981 0%, #10b981 ${minScore}%, #1a1f2b ${minScore}%, #1a1f2b 100%)`,
            }}
            aria-label="Score mínimo"
          />
          {/* Marcadores visuais */}
          <div className="flex justify-between px-0.5">
            {scoreMarks.map((m) => (
              <button
                key={m.valor}
                type="button"
                onClick={() => setMinScore(m.valor)}
                className={`text-[10px] font-semibold transition-colors hover:text-emerald-300 ${
                  minScore === m.valor ? 'text-emerald-400' : 'text-zinc-500'
                }`}
                title={`Definir score mínimo em ${m.valor}%`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Metrics (5 Cards with staggered fade-in) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Combinations */}
        <div
          className="surface-card rounded-2xl p-5 border border-[#262c34] relative overflow-hidden shadow-md animate-fade-in-up"
          style={{ animationDelay: '0ms' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Total de Combinações Possíveis
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#1a1f2b] border border-[#262c34] flex items-center justify-center text-zinc-300">
              <Sigma className="w-4 h-4 text-zinc-400" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {formatNumberBR(totalRaw)}
          </div>
          <div className="text-xs text-zinc-400 mt-1">Sem filtros</div>
        </div>

        {/* Card 2: After Filters (score-filtered) */}
        <div
          className="surface-card rounded-2xl p-5 border border-[#262c34] relative overflow-hidden shadow-md animate-fade-in-up"
          style={{ animationDelay: '80ms' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Combinações após Filtros
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FilterIcon className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div
            className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
              scoreFilteredCombinations.length > 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {formatNumberBR(scoreFilteredCombinations.length)}
          </div>
          <div className="text-xs mt-1">
            {scoreFilteredCombinations.length > 0 ? (
              <span className="text-zinc-400">
                {minScore > 0 ? `Com score ≥ ${minScore}%` : 'Jogos válidos'}
              </span>
            ) : (
              <span className="text-red-400 font-medium">
                Nenhum jogo válido — ajuste seus filtros
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Economy Generated (score-filtered) */}
        <div
          className="surface-card rounded-2xl p-5 border border-[#262c34] relative overflow-hidden shadow-md animate-fade-in-up"
          style={{ animationDelay: '160ms' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Economia Gerada
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <PiggyBank className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 tracking-tight">
            {formatCurrencyBRL(scoreFilteredEconomy)}
          </div>
          <div className="text-xs text-zinc-400 mt-1">Diferença × R$ 5,00 por jogo</div>
        </div>

        {/* Card 4: Total Cost (score-filtered) */}
        <div
          className="surface-card rounded-2xl p-5 border border-[#262c34] relative overflow-hidden shadow-md animate-fade-in-up"
          style={{ animationDelay: '240ms' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Custo Total da Aposta
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#1a1f2b] border border-[#262c34] flex items-center justify-center text-zinc-300">
              <Banknote className="w-4 h-4 text-zinc-400" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {formatCurrencyBRL(scoreFilteredCost)}
          </div>
          <div className="text-xs text-zinc-400 mt-1">Jogos válidos × R$ 5,00</div>
        </div>

        {/* Card 5: Score Médio dos Jogos */}
        <div
          className="surface-card rounded-2xl p-5 border border-[#262c34] relative overflow-hidden shadow-md animate-fade-in-up"
          style={{ animationDelay: '320ms' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Score Médio dos Jogos
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                scoreColorMeta.bgContainer
              }`}
            >
              <BarChart3 className={`w-4 h-4 ${scoreColorMeta.textColor}`} />
            </div>
          </div>
          <div
            className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${scoreColorMeta.textColor}`}
          >
            {averageScore}%
          </div>
          <div className={`text-xs mt-1 font-semibold ${scoreColorMeta.textColor}`}>
            {scoreColorMeta.label}
          </div>
        </div>
      </section>

      {/* Histograma de distribuição dos scores (apenas jogos filtrados por score) */}
      {scoreFilteredCombinations.length > 0 && (
        <ScoreHistogram
          scores={scoreFilteredCombinations.map((g) => calculateGameScore(g))}
          scoreMedio={averageScore}
        />
      )}

      {/* Simulação Histórica (apenas jogos filtrados por score) */}
      {scoreFilteredCombinations.length > 0 && (
        <SimulacaoHistorica jogos={scoreFilteredCombinations} conjunto={false} />
      )}

      {/* Comparação com concurso específico */}
      {scoreFilteredCombinations.length > 0 && (
        <ComparacaoConcurso jogos={scoreFilteredCombinations} onConferir={handleConferir} />
      )}

      {/* Histórico de Conferências (localStorage) */}
      <HistoricoConferencias historico={historico} onLimpar={limpar} />

      {/* Banner de jogos com Score Elite (≥ 90%) */}
      {eliteCount > 0 && (
        <section className="rounded-2xl p-4 border border-emerald-500/50 bg-emerald-950/30 shadow-[0_0_18px_rgba(16,185,129,0.2)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-300 flex-shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-emerald-300 flex items-center gap-1.5">
                {formatNumberBR(eliteCount)} jogo{eliteCount > 1 ? 's' : ''} com Score Elite
                <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200">
                  <Star className="w-2.5 h-2.5 fill-emerald-300" />≥ 90%
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/70 mt-0.5">
                Jogos com alta performance no motor probabilístico avançado.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMinScore(SCORE_ELITE_THRESHOLD)}
            className="self-start sm:self-auto px-3 py-1.5 rounded-lg text-xs font-bold text-white emerald-gradient border border-emerald-300/50 hover:translate-y-[-1px] hover:shadow-[0_0_14px_rgba(16,185,129,0.5)] transition-all whitespace-nowrap"
            title={`Filtrar apenas jogos com score ≥ ${SCORE_ELITE_THRESHOLD}%`}
          >
            Ver somente Elite
          </button>
        </section>
      )}

      {/* Action Header: Games Title + Export Button */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#262c34] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <List className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Jogos Gerados
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#1a1f2b] border border-[#262c34] text-emerald-400">
                {formatNumberBR(scoreFilteredCombinations.length)} jogos
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              Jogos desdobrados e prontos para registro oficial
            </p>
          </div>
        </div>

        {/* Export Button + Sort toggle + Versão Impressa */}
        {scoreFilteredCombinations.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSortByScore((v) => !v)}
              className={`px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all border ${
                sortByScore
                  ? 'emerald-gradient text-white border-emerald-300/40 emerald-glow'
                  : 'bg-[#1a1f2b] text-zinc-300 border-[#262c34] hover:text-white hover:border-zinc-600'
              }`}
              title="Ordenar jogos pelo score probabilístico"
            >
              <ArrowUpDown className="w-4 h-4" />
              <span>{sortByScore ? 'Ordenado por Score' : 'Ordenar por Score'}</span>
            </button>
            <PrintableVersion
              jogos={jogosComScore(scoreFilteredCombinations)}
              modo="Modo Desdobramento"
            />
            <button
              type="button"
              onClick={handleExportTxt}
              className="emerald-gradient text-white font-bold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 emerald-glow hover:translate-y-[-2px] hover:shadow-[0_0_18px_rgba(16,185,129,0.5)] active:scale-[0.98] transition-all shadow-md text-sm"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Jogos (.txt)</span>
            </button>
          </div>
        )}
      </section>

      {/* Empty State vs Games Grid */}
      {scoreFilteredCombinations.length === 0 ? (
        <section className="surface-card rounded-2xl p-8 sm:p-12 text-center border border-[#262c34] space-y-4 max-w-xl mx-auto shadow-xl my-8">
          <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">
              {minScore > 0 ? 'Nenhum jogo com score suficiente' : 'Nenhum jogo encontrado'}
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {minScore > 0
                ? `Nenhum jogo atinge score ≥ ${minScore}%. Diminua o score mínimo no slider acima.`
                : 'Nenhum jogo atende aos filtros selecionados. Volte e ajuste as dezenas ou desative alguns filtros.'}
            </p>
          </div>
          {minScore > 0 ? (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setMinScore(0)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl emerald-gradient text-white font-bold text-sm emerald-glow hover:translate-y-[-2px] transition-all"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Limpar Filtro de Score</span>
              </button>
            </div>
          ) : (
            <div className="pt-2">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl emerald-gradient text-white font-bold text-sm emerald-glow hover:translate-y-[-2px] transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar e Ajustar</span>
              </Link>
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-6">
          {/* Grid of Games: 4 cols desktop, 2 tablet, 1 mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {currentGames.map((game, idx) => {
              const globalIndex = startIndex + idx + 1
              const isCopied = copiedIndex === globalIndex

              return (
                <div
                  key={globalIndex}
                  className={`surface-card rounded-xl p-3.5 border transition-all group relative flex flex-col justify-between ${
                    calculateGameScore(game) >= SCORE_ELITE_THRESHOLD
                      ? 'border-emerald-500/60 high-score-glow'
                      : 'border-[#262c34] hover:border-emerald-500/50 hover:shadow-[0_4px_20px_rgba(16,185,129,0.15)]'
                  }`}
                >
                  {/* Badge "Score Elite" no canto do card (score ≥ 90%) */}
                  {calculateGameScore(game) >= SCORE_ELITE_THRESHOLD && (
                    <span
                      className="absolute -top-2 -right-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold text-white emerald-gradient border border-emerald-300/50 shadow-[0_0_10px_rgba(16,185,129,0.6)] whitespace-nowrap"
                      title="Jogo com score ≥ 90% — Score Elite"
                    >
                      <Star className="w-3 h-3 fill-white" />
                      Alta Performance
                    </span>
                  )}
                  {/* Game Number & Copy button */}
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      Jogo #{String(globalIndex).padStart(4, '0')}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyGameToClipboard(game, globalIndex)}
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

                  {/* 6 Numbers in Rounded Blocks (Lottery Ticket Style) */}
                  <div className="grid grid-cols-6 gap-1.5">
                    {game.map((num) => (
                      <div
                        key={num}
                        className="aspect-square rounded-lg bg-[#1a1f2b] border border-[#262c34] group-hover:border-emerald-500/30 flex items-center justify-center text-xs sm:text-sm font-bold text-white font-mono shadow-inner group-hover:text-emerald-300 transition-colors"
                      >
                        {formatTwoDigits(num)}
                      </div>
                    ))}
                  </div>

                  {/* Score de Acertividade */}
                  <GameScoreBar game={game} />
                </div>
              )
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="surface-card rounded-xl p-4 border border-[#262c34] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-zinc-400 font-medium">
                Mostrando <strong className="text-white">{startIndex + 1}</strong>–
                <strong className="text-white">{endIndex}</strong> de{' '}
                <strong className="text-white">
                  {formatNumberBR(scoreFilteredCombinations.length)}
                </strong>{' '}
                jogos
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg bg-[#1a1f2b] border border-[#262c34] text-xs font-semibold text-zinc-300 hover:text-white hover:border-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Anterior</span>
                </button>

                <span className="text-xs text-zinc-400 px-2 font-medium">
                  Página <strong className="text-white">{currentPage}</strong> de{' '}
                  <strong className="text-white">{totalPages}</strong>
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg bg-[#1a1f2b] border border-[#262c34] text-xs font-semibold text-zinc-300 hover:text-white hover:border-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  <span>Próximo</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Floating Toast Notification on Export */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in-up">
          <div className="bg-[#161a1f] border border-emerald-500/50 rounded-xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.6)] flex items-center gap-3 text-white emerald-glow">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Arquivo exportado com sucesso!</p>
              <p className="text-xs text-zinc-400">Seus jogos foram baixados no formato .txt.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================================================
 * Score de Acertividade — barra de progresso por jogo
 * ============================================================ */
const GameScoreBar: React.FC<{ game: number[] }> = ({ game }) => {
  const score = calculateGameScore(game)
  const { textColor, bgClass, label } = getScoreColor(score)
  const breakdown = computeScoreV2(game)
  const breakdownStr = formatScoreBreakdown(breakdown)
  const isElite = score >= SCORE_ELITE_THRESHOLD

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
            <div className="font-semibold text-emerald-400 mb-1">Breakdown do Score</div>
            <div className="font-mono text-[10px]">{breakdownStr}</div>
            <div className="text-[10px] text-zinc-400 mt-1">
              A) Hipergeométrica · B) Uniformidade KS · C) Gaps · D) Soma Normal · E) Entropia
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
      <div className={`text-[10px] font-bold ${textColor}`}>
        {label}
        {isElite && (
          <span className="ml-1.5 inline-flex items-center gap-0.5 text-emerald-400">
            <Star className="w-2.5 h-2.5 fill-emerald-400" />
            Alta Performance
          </span>
        )}
      </div>
      <GameScoreRadar game={game} />
    </div>
  )
}
