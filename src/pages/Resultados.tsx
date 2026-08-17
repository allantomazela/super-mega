import React, { useMemo, useState, useEffect } from 'react'
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
} from 'lucide-react'
import { useMega } from '@/lib/MegaContext'
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
  getScoreColor,
} from '@/lib/megaEngine'

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

  // Ordem de exibição (geração ou por score)
  const orderedCombinations = useMemo(() => {
    if (!sortByScore) return filteredCombinations
    return [...filteredCombinations].sort((a, b) => calculateGameScore(b) - calculateGameScore(a))
  }, [filteredCombinations, sortByScore])

  // Score médio de todos os jogos filtrados
  const averageScore = useMemo(() => {
    if (filteredCombinations.length === 0) return 0
    const sum = filteredCombinations.reduce((acc, g) => acc + calculateGameScore(g), 0)
    return Math.round(sum / filteredCombinations.length)
  }, [filteredCombinations])

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

  // Reset page when filters, numbers or sort change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedNumbers, filters, sortByScore])

  // Export games to .txt file
  const handleExportTxt = () => {
    if (filteredCombinations.length === 0) return

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
      `# Combinações Brutas: ${formatNumberBR(totalRaw)} | Jogos Filtrados: ${formatNumberBR(filteredCombinations.length)}`,
      `# Economia Gerada: ${formatCurrencyBRL(economy)} | Custo Total: ${formatCurrencyBRL(totalCost)}`,
      `# Filtros Ativos: ${Object.entries(filters)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(', ')}`,
      `# ==========================================================`,
      ``,
    ].join('\n')

    const body = filteredCombinations
      .map((game, idx) => `Jogo ${String(idx + 1).padStart(4, '0')}: ${formatGameString(game)}`)
      .join('\n')

    const fileContent = `${header}\n${body}\n`

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `MegaSena_Desdobramento_${day}_${month}_${year}_${filteredCombinations.length}jogos.txt`
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

        {/* Card 2: After Filters */}
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
              filteredCombinations.length > 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {formatNumberBR(filteredCombinations.length)}
          </div>
          <div className="text-xs mt-1">
            {filteredCombinations.length > 0 ? (
              <span className="text-zinc-400">Jogos válidos</span>
            ) : (
              <span className="text-red-400 font-medium">
                Nenhum jogo válido — ajuste seus filtros
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Economy Generated */}
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
            {formatCurrencyBRL(economy)}
          </div>
          <div className="text-xs text-zinc-400 mt-1">Diferença × R$ 5,00 por jogo</div>
        </div>

        {/* Card 4: Total Cost */}
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
            {formatCurrencyBRL(totalCost)}
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
                {formatNumberBR(filteredCombinations.length)} jogos
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              Jogos desdobrados e prontos para registro oficial
            </p>
          </div>
        </div>

        {/* Export Button + Sort toggle */}
        {filteredCombinations.length > 0 && (
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
      {filteredCombinations.length === 0 ? (
        <section className="surface-card rounded-2xl p-8 sm:p-12 text-center border border-[#262c34] space-y-4 max-w-xl mx-auto shadow-xl my-8">
          <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">Nenhum jogo encontrado</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Nenhum jogo atende aos filtros selecionados. Volte e ajuste as dezenas ou desative
              alguns filtros.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl emerald-gradient text-white font-bold text-sm emerald-glow hover:translate-y-[-2px] transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar e Ajustar</span>
            </Link>
          </div>
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
                  className="surface-card rounded-xl p-3.5 border border-[#262c34] hover:border-emerald-500/50 hover:shadow-[0_4px_20px_rgba(16,185,129,0.15)] transition-all group relative flex flex-col justify-between"
                >
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
                  {formatNumberBR(filteredCombinations.length)}
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

  return (
    <div className="mt-2 pt-2 border-t border-[#262c34]/60 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
          Score de Acertividade
        </span>
        <span className={`text-[11px] font-extrabold ${textColor}`}>{score}%</span>
      </div>
      <div className="h-1 w-full rounded-full bg-[#1a1f2b] overflow-hidden">
        <div
          className={`h-full rounded-full ${bgClass} transition-all duration-300`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className={`text-[10px] font-bold ${textColor}`}>{label}</div>
    </div>
  )
}
