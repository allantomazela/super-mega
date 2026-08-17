import React, { useState, useMemo } from 'react'
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
  Dices,
  Target,
  Download,
  Copy,
  Check,
  Percent,
  Layers,
  AlertCircle,
  BarChart3,
  PieChart,
} from 'lucide-react'
import { useMega, AppMode } from '@/lib/MegaContext'
import {
  formatTwoDigits,
  formatGameString,
  optimizeFiveGamesV2,
  buildFiveGamesExportText,
  calculateGameScore,
  getScoreColor,
  probabilityAtLeastFourPlus,
  FIVE_GAMES_MIN_SELECTION,
  FIVE_GAMES_MAX_SELECTION,
  FiveGamesResult,
  OptimizationMeta,
  META_WEIGHTS,
  DEFAULT_META,
} from '@/lib/megaEngine'
import { ToggleSwitch } from '@/components/ToggleSwitch'
import { SimulacaoHistorica } from '@/components/SimulacaoHistorica'

export default function Index() {
  const navigate = useNavigate()
  const {
    selectedNumbers,
    toggleNumber,
    clearNumbers,
    filters,
    toggleFilter,
    setSelectedNumbers,
    mode,
    setMode,
    maxSelection,
  } = useMega()

  const isCincoJogos = mode === 'cinco-jogos'

  const [isLoading, setIsLoading] = useState(false)
  const [fiveGamesResult, setFiveGamesResult] = useState<FiveGamesResult | null>(null)
  const [exported, setExported] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [meta, setMeta] = useState<OptimizationMeta>(DEFAULT_META)

  const count = selectedNumbers.length

  // === Limites dinâmicos conforme o modo ativo ===
  const minRequired = isCincoJogos ? FIVE_GAMES_MIN_SELECTION : 6
  const isValidCount = isCincoJogos
    ? count >= FIVE_GAMES_MIN_SELECTION && count <= FIVE_GAMES_MAX_SELECTION
    : count >= 6 && count <= 15
  const isOverLimit = isCincoJogos ? count > FIVE_GAMES_MAX_SELECTION : count > 15
  const isUnderLimit = isCincoJogos ? count < FIVE_GAMES_MIN_SELECTION : count < 6

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
    if (count < 6 || count > 15) return
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      navigate('/resultados', {
        state: { selectedNumbers, filters },
      })
    }, 400)
  }

  const handleGenerateFiveGames = () => {
    if (count < FIVE_GAMES_MIN_SELECTION || count > FIVE_GAMES_MAX_SELECTION) return
    setIsLoading(true)
    setExported(false)
    setTimeout(() => {
      const result = optimizeFiveGamesV2(selectedNumbers, meta)
      setFiveGamesResult(result)
      setIsLoading(false)
    }, 350)
  }

  // Ao mudar a meta, re-gera automaticamente se já houver jogos
  const handleMetaChange = (next: OptimizationMeta) => {
    if (next === meta) return
    setMeta(next)
    if (fiveGamesResult && count >= FIVE_GAMES_MIN_SELECTION && count <= FIVE_GAMES_MAX_SELECTION) {
      setIsLoading(true)
      setTimeout(() => {
        const result = optimizeFiveGamesV2(selectedNumbers, next)
        setFiveGamesResult(result)
        setIsLoading(false)
      }, 250)
    }
  }

  const handleGenerate = () => {
    if (isCincoJogos) handleGenerateFiveGames()
    else handleGenerateDesdobramento()
  }

  // Quick helper to fill a random sample of N numbers
  const handleRandomSelect = (total: number) => {
    const all = Array.from({ length: 60 }, (_, i) => i + 1)
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[all[i], all[j]] = [all[j], all[i]]
    }
    const chosen = all.slice(0, total).sort((a, b) => a - b)
    setSelectedNumbers(chosen)
    if (isCincoJogos) setFiveGamesResult(null)
  }

  const handleExportFiveGames = () => {
    if (!fiveGamesResult) return
    const content = buildFiveGamesExportText(fiveGamesResult, selectedNumbers)
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

  const handleModeChange = (next: AppMode) => {
    if (next === mode) return
    // Ao sair do modo 5 jogos, limpa o resultado para não exibir jogos defasados
    if (mode === 'cinco-jogos') setFiveGamesResult(null)
    setMode(next)
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Mode Toggle (pills) */}
      <ModeToggle mode={mode} onChange={handleModeChange} />

      {/* Title & Instructions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#262c34] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {isCincoJogos ? 'Otimizador de 5 Jogos' : 'Monte seu Grupo de Dezenas'}
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 mt-1">
            {isCincoJogos
              ? `Selecione de ${FIVE_GAMES_MIN_SELECTION} a ${FIVE_GAMES_MAX_SELECTION} dezenas e gere 5 jogos otimizados de 5 dezenas.`
              : 'Selecione entre 6 e 15 dezenas e aplique os filtros para otimizar seu jogo.'}
          </p>
        </div>

        {/* Quick actions: Surpresinha + Limpar */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleRandomSelect(isCincoJogos ? 12 : 10)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1f2b] border border-[#262c34] text-xs text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors"
            title={isCincoJogos ? 'Sortear 12 dezenas aleatórias' : 'Sortear 10 dezenas aleatórias'}
          >
            <Dices className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isCincoJogos ? 'Gerar 12 aleatórias' : 'Gerar 10 aleatórias'}</span>
          </button>
          {count > 0 && (
            <button
              type="button"
              onClick={() => {
                clearNumbers()
                if (isCincoJogos) setFiveGamesResult(null)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1f2b] border border-[#262c34] text-xs text-zinc-400 hover:text-red-400 hover:border-red-900/50 transition-colors"
              title="Limpar seleção atual"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </button>
          )}
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
                      ? `Mínimo ${FIVE_GAMES_MIN_SELECTION} e máximo ${FIVE_GAMES_MAX_SELECTION} dezenas para otimização de cobertura.`
                      : 'Mínimo 6 e máximo 15 dezenas (padrão oficial de desdobramento).'}
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
          {isCincoJogos && fiveGamesResult && (
            <FiveGamesResultSection
              result={fiveGamesResult}
              copiedIndex={copiedIndex}
              onCopy={copyGameToClipboard}
              onExport={handleExportFiveGames}
              exported={exported}
              meta={meta}
            />
          )}
          {isCincoJogos && fiveGamesResult && <ProbabilisticAnalysis result={fiveGamesResult} />}
          {isCincoJogos && fiveGamesResult && (
            <SimulacaoHistorica jogos={fiveGamesResult.games} conjunto />
          )}
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
              result={fiveGamesResult}
              meta={meta}
              onMetaChange={handleMetaChange}
            />
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
    </div>
  )
}

/* ============================================================
 * Mode toggle (pills)
 * ============================================================ */
const ModeToggle: React.FC<{
  mode: AppMode
  onChange: (m: AppMode) => void
}> = ({ mode, onChange }) => {
  const options: { key: AppMode; label: string; icon: React.ReactNode; hint: string }[] = [
    {
      key: 'desdobramento',
      label: 'Modo Desdobramento',
      icon: <Layers className="w-4 h-4" />,
      hint: 'Gera todas as combinações de 6',
    },
    {
      key: 'cinco-jogos',
      label: 'Modo 5 Jogos',
      icon: <Target className="w-4 h-4" />,
      hint: '5 jogos otimizados de 5 dezenas',
    },
  ]

  return (
    <div className="surface-card rounded-2xl p-2 shadow-lg flex flex-col sm:flex-row gap-2">
      {options.map((opt) => {
        const active = mode === opt.key
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={`
              flex-1 flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left
              ${
                active
                  ? 'emerald-gradient emerald-glow text-white border border-emerald-300/40'
                  : 'bg-[#1a1f2b] border border-[#262c34] text-zinc-300 hover:text-white hover:border-zinc-600'
              }
            `}
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                active
                  ? 'bg-white/15 text-white'
                  : 'bg-[#161a1f] border border-[#262c34] text-emerald-400'
              }`}
            >
              {opt.icon}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold leading-tight truncate">{opt.label}</div>
              <div
                className={`text-[11px] mt-0.5 truncate ${
                  active ? 'text-emerald-50/80' : 'text-zinc-500'
                }`}
              >
                {opt.hint}
              </div>
            </div>
          </button>
        )
      })}
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
}> = ({ count, isValidCount, isUnderLimit, isLoading, onGenerate, result, meta, onMetaChange }) => (
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
          Gera 5 jogos de 5 dezenas maximizando a cobertura do grupo
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
                As dezenas selecionadas são distribuídas estrategicamente em 5 jogos de 5 dezenas. O
                algoritmo prioriza cobrir o máximo do grupo e balancear a repetição quando há menos
                de 25 dezenas.
              </p>
            </div>
          </div>
        </div>

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
            Selecione ao menos {FIVE_GAMES_MIN_SELECTION}
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
      desc: 'Prioriza o score probabilístico',
      icon: <BarChart3 className="w-3.5 h-3.5" />,
    },
  ]

  return (
    <div className="p-3.5 rounded-xl bg-[#161a1f] border border-[#262c34]">
      <div className="flex items-center gap-2 mb-2.5">
        <Target className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-xs font-semibold text-white">Meta de Otimização</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
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
        {META_WEIGHTS[meta].score === 5
          ? 'Pesos: score ×5 · cobertura ×1 · sobreposição ×1'
          : META_WEIGHTS[meta].cobertura === 6
            ? 'Pesos: score ×1 · cobertura ×6 · sobreposição ×2'
            : 'Pesos: score ×2 · cobertura ×4 · sobreposição ×1'}
      </p>
    </div>
  )
}

/* ============================================================
 * Seção de resultado do Modo 5 Jogos (cards de bilhete)
 * ============================================================ */
const FiveGamesResultSection: React.FC<{
  result: FiveGamesResult
  copiedIndex: number | null
  onCopy: (game: number[], index: number) => void
  onExport: () => void
  exported: boolean
  meta: OptimizationMeta
}> = ({ result, copiedIndex, onCopy, onExport, exported, meta }) => {
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header + Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#262c34] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              5 Jogos Otimizados
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#1a1f2b] border border-[#262c34] text-emerald-400">
                5 jogos × 5 dezenas
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              Distribuição estratégica para maximizar a cobertura
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onExport}
          className="emerald-gradient text-white font-bold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 emerald-glow hover:translate-y-[-2px] hover:shadow-[0_0_18px_rgba(16,185,129,0.5)] active:scale-[0.98] transition-all shadow-md text-sm"
        >
          {exported ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
          <span>{exported ? 'Exportado!' : 'Exportar (.txt)'}</span>
        </button>
      </div>

      {/* Estatísticas de cobertura + Score médio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
        <AverageScoreCard scores={result.scores} highlight={meta === 'score'} />
      </div>

      {/* Cards dos 5 jogos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {result.games.map((game, idx) => {
          const isCopied = copiedIndex === idx
          return (
            <div
              key={idx}
              className="surface-card rounded-xl p-4 border border-[#262c34] hover:border-emerald-500/50 hover:shadow-[0_4px_20px_rgba(16,185,129,0.15)] transition-all group relative"
            >
              {/* Cabeçalho do bilhete */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  Jogo #{String(idx + 1).padStart(2, '0')}
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

              {/* 5 números em blocos estilo bilhete */}
              <div className="grid grid-cols-5 gap-1.5">
                {game.map((num) => (
                  <div
                    key={num}
                    className="aspect-square rounded-lg bg-[#1a1f2b] border border-[#262c34] group-hover:border-emerald-500/30 flex items-center justify-center text-sm font-bold text-white font-mono shadow-inner group-hover:text-emerald-300 transition-colors"
                  >
                    {formatTwoDigits(num)}
                  </div>
                ))}
              </div>

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

/* ============================================================
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
  const probAtLeast4 = probabilityAtLeastFourPlus(result.games)
  const probPercent = (probAtLeast4 * 100).toFixed(4)
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
