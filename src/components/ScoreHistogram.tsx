import React, { useState } from 'react'
import { BarChart3 } from 'lucide-react'

/* ============================================================
 * ScoreHistogram — distribuição dos scores dos jogos
 *
 * Componente puro (SVG + Tailwind, sem dependências externas
 * de gráficos). Mostra barras verticais agrupadas por faixa
 * de score, com tooltip ao passar o mouse.
 * ============================================================ */

const FAIXAS = [
  { min: 0, max: 10, label: '0–10' },
  { min: 10, max: 20, label: '10–20' },
  { min: 20, max: 30, label: '20–30' },
  { min: 30, max: 40, label: '30–40' },
  { min: 40, max: 50, label: '40–50' },
  { min: 50, max: 60, label: '50–60' },
  { min: 60, max: 70, label: '60–70' },
  { min: 70, max: 80, label: '70–80' },
  { min: 80, max: 90, label: '80–90' },
  { min: 90, max: 101, label: '90–100' },
]

/** Retorna a cor conforme o ponto médio da faixa. */
function corFaixa(scoreMedio: number): { bar: string; glow: string; text: string } {
  if (scoreMedio < 35)
    return {
      bar: 'bg-red-500',
      glow: 'shadow-[0_0_10px_rgba(239,68,68,0.4)]',
      text: 'text-red-400',
    }
  if (scoreMedio < 55)
    return {
      bar: 'bg-orange-500',
      glow: 'shadow-[0_0_10px_rgba(249,115,22,0.4)]',
      text: 'text-orange-400',
    }
  if (scoreMedio < 75)
    return {
      bar: 'bg-amber-500',
      glow: 'shadow-[0_0_10px_rgba(245,158,11,0.4)]',
      text: 'text-amber-400',
    }
  return {
    bar: 'bg-emerald-500',
    glow: 'shadow-[0_0_10px_rgba(16,185,129,0.4)]',
    text: 'text-emerald-400',
  }
}

interface ScoreHistogramProps {
  /** Lista de scores (0–100) dos jogos gerados. */
  scores: number[]
  /** Score médio (exibido no subtítulo). */
  scoreMedio: number
}

export const ScoreHistogram: React.FC<ScoreHistogramProps> = ({ scores, scoreMedio }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  // Conta quantos jogos caem em cada faixa
  const contagens = FAIXAS.map((faixa) => {
    const count = scores.filter((s) => s >= faixa.min && s < faixa.max).length
    return { ...faixa, count }
  })

  const maxContagem = Math.max(1, ...contagens.map((c) => c.count))
  const totalJogos = scores.length

  return (
    <div className="surface-card rounded-2xl p-5 sm:p-6 border border-[#262c34] shadow-lg">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2.5 border-b border-[#262c34] pb-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <BarChart3 className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-bold text-white tracking-tight">
            📈 Distribuição dos Scores
          </h3>
          <p className="text-xs text-zinc-400">
            Score médio: <span className="text-emerald-400 font-semibold">{scoreMedio}%</span> ·{' '}
            {totalJogos} jogos analisados
          </p>
        </div>
      </div>

      {/* Gráfico */}
      <div className="relative">
        {/* Eixo Y (linhas guia) */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="border-t border-[#262c34]/40" />
          ))}
        </div>

        {/* Barras */}
        <div className="relative flex items-end justify-between gap-1 sm:gap-2 h-44 sm:h-52 px-1">
          {contagens.map((c, idx) => {
            const alturaPct = (c.count / maxContagem) * 100
            const scoreMedioFaixa = (c.min + c.max - 1) / 2
            const cor = corFaixa(scoreMedioFaixa)
            const isHover = hoverIdx === idx

            return (
              <div
                key={idx}
                className="relative flex-1 h-full flex flex-col items-center justify-end group cursor-pointer"
                onMouseEnter={() => setHoverIdx(idx)}
                onMouseLeave={() => setHoverIdx(null)}
              >
                {/* Tooltip */}
                {isHover && c.count > 0 && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-20 whitespace-nowrap bg-[#12161b] border border-emerald-500/40 rounded-lg px-2.5 py-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
                    <div className="text-[11px] font-bold text-white">Faixa {c.label}</div>
                    <div className={`text-[11px] font-semibold ${cor.text}`}>
                      {c.count} {c.count === 1 ? 'jogo' : 'jogos'}
                    </div>
                  </div>
                )}

                {/* Contagem acima da barra */}
                <div
                  className={`text-[10px] sm:text-xs font-bold mb-1 transition-opacity ${
                    c.count > 0 ? 'text-zinc-300 opacity-70' : 'opacity-0'
                  } ${isHover ? '!opacity-100' : ''}`}
                >
                  {c.count > 0 ? c.count : ''}
                </div>

                {/* Barra */}
                <div
                  className={`w-full max-w-[28px] sm:max-w-[36px] rounded-t-md transition-all duration-300 ${cor.bar} ${
                    isHover ? `${cor.glow} scale-y-105` : ''
                  } ${c.count === 0 ? 'opacity-20' : ''}`}
                  style={{ height: `${Math.max(alturaPct, c.count > 0 ? 4 : 2)}%` }}
                />
              </div>
            )
          })}
        </div>

        {/* Eixo X (labels) */}
        <div className="flex justify-between gap-1 sm:gap-2 mt-2 px-1">
          {FAIXAS.map((f, idx) => (
            <div key={idx} className="flex-1 text-center">
              <span className="text-[8px] sm:text-[10px] text-zinc-500 font-mono">{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Legenda de cores */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-5 pt-4 border-t border-[#262c34]">
        <LegendItem color="bg-red-500" label="< 35" />
        <LegendItem color="bg-orange-500" label="35–55" />
        <LegendItem color="bg-amber-500" label="55–75" />
        <LegendItem color="bg-emerald-500" label="≥ 75" />
      </div>
    </div>
  )
}

const LegendItem: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div className="flex items-center gap-1.5">
    <div className={`w-3 h-3 rounded-sm ${color}`} />
    <span className="text-[10px] sm:text-xs text-zinc-400 font-medium">{label}</span>
  </div>
)
