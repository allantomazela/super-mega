import React, { useState } from 'react'
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
} from 'lucide-react'
import { useMega } from '@/lib/MegaContext'
import { formatTwoDigits } from '@/lib/megaEngine'
import { ToggleSwitch } from '@/components/ToggleSwitch'

export default function Index() {
  const navigate = useNavigate()
  const { selectedNumbers, toggleNumber, clearNumbers, filters, toggleFilter, setSelectedNumbers } =
    useMega()

  const [isLoading, setIsLoading] = useState(false)

  const count = selectedNumbers.length
  const isValidCount = count >= 6 && count <= 15
  const isOverLimit = count > 15
  const isUnderLimit = count < 6

  // Circular progress indicator parameters
  const radius = 22
  const stroke = 3.5
  const normalizedRadius = radius - stroke * 2
  const circumference = normalizedRadius * 2 * Math.PI
  // Target max is 15
  const progressRatio = Math.min(Math.max(count / 15, 0), 1)
  const strokeDashoffset = circumference - progressRatio * circumference

  // Arc stroke color
  let strokeColor = '#4b5563' // zinc-600
  let badgeColorClass = 'text-zinc-400 bg-zinc-800/60 border-zinc-700'
  if (count >= 6 && count <= 15) {
    strokeColor = '#10b981' // emerald-500
    badgeColorClass = 'text-emerald-400 bg-emerald-950/40 border-emerald-500/40'
  } else if (count > 15) {
    strokeColor = '#ef4444' // red-500
    badgeColorClass = 'text-red-400 bg-red-950/40 border-red-500/40'
  }

  const handleGenerate = () => {
    if (!isValidCount) return
    setIsLoading(true)

    setTimeout(() => {
      setIsLoading(false)
      navigate('/resultados', {
        state: {
          selectedNumbers,
          filters,
        },
      })
    }, 400)
  }

  // Quick helper to fill a random sample of N numbers (e.g., 6, 10, 15)
  const handleRandomSelect = (total: number) => {
    const all = Array.from({ length: 60 }, (_, i) => i + 1)
    // Shuffle
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[all[i], all[j]] = [all[j], all[i]]
    }
    const chosen = all.slice(0, total).sort((a, b) => a - b)
    setSelectedNumbers(chosen)
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Title & Instructions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#262c34] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Monte seu Grupo de Dezenas
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 mt-1">
            Selecione entre 6 e 15 dezenas e aplique os filtros para otimizar seu jogo.
          </p>
        </div>

        {/* Quick actions: Surpresinha + Limpar */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleRandomSelect(10)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1f2b] border border-[#262c34] text-xs text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors"
            title="Sortear 10 dezenas aleatórias"
          >
            <Dices className="w-3.5 h-3.5 text-emerald-400" />
            <span>Gerar 10 aleatórias</span>
          </button>
          {count > 0 && (
            <button
              type="button"
              onClick={clearNumbers}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1f2b] border border-[#262c34] text-xs text-zinc-400 hover:text-red-400 hover:border-red-900/50 transition-colors"
              title="Limpar seleção atual"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Left = 1-60 Grid, Right = Filters */}
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
                const isMaxReached = !isSelected && count >= 15

                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => toggleNumber(num)}
                    disabled={isMaxReached}
                    title={
                      isMaxReached
                        ? 'Limite de 15 dezenas atingido'
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
                      {count < 6
                        ? `Faltam ${6 - count}`
                        : count <= 15
                          ? `${15 - count} restantes`
                          : 'Excedeu limite'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Mínimo 6 e máximo 15 dezenas (padrão oficial de desdobramento).
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
        </section>

        {/* Right Column: Reduction Filters Panel */}
        <section className="lg:col-span-5 xl:col-span-4 space-y-6">
          <div className="surface-card rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-5">
              {/* Filter Panel Header */}
              <div className="border-b border-[#262c34] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Filter className="w-4 h-4" />
                  </div>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Filtros de Redução
                  </h2>
                </div>
                <p className="text-xs text-zinc-400 mt-1.5">
                  Aplique filtros matemáticos e heurísticos
                </p>
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
                        Eliminar jogos com 5 ou 6 números pares ou ímpares. Manter apenas proporções
                        3/3, 4/2 ou 2/4.
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
                        <span className="text-sm font-semibold text-white">
                          Filtro de Valor Esperado
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                        Eliminar jogos com 4 ou mais números entre 1 e 31 (evita jogos baseados em
                        datas de aniversário).
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
                        <span className="text-sm font-semibold text-white">
                          Filtro de Sequência
                        </span>
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
                onClick={handleGenerate}
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
        </section>
      </div>
    </div>
  )
}
