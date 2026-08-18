import React, { useState } from 'react'
import { Radar as RadarIcon, ChevronDown, ChevronUp } from 'lucide-react'
import { computeScoreV2, ScoreBreakdown, getScoreColor } from '@/lib/megaEngine'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/* ============================================================
 * RadarChart — gráfico de radar SVG com os 5 critérios do
 * score probabilístico: Paridade, Uniformidade, Gaps, Soma,
 * Entropia. Valores normalizados de 0 a 20.
 *
 * Preenchimento verde esmeralda com transparência.
 * Eixos rotulados. Responsivo (width 100% no container).
 * ============================================================ */

const CRITERIOS: { key: keyof ScoreBreakdown; label: string; short: string }[] = [
  { key: 'paridade', label: 'Paridade', short: 'Par' },
  { key: 'uniformidade', label: 'Uniformidade', short: 'Uni' },
  { key: 'gaps', label: 'Gaps', short: 'Gap' },
  { key: 'soma', label: 'Soma', short: 'Som' },
  { key: 'entropia', label: 'Entropia', short: 'Ent' },
]

const MAX_VALUE = 20

interface RadarChartProps {
  breakdown: ScoreBreakdown
  /** Largura do SVG (altura = largura). Default 220. */
  size?: number
  /** Mostrar rótulos dos eixos. Default true. */
  showLabels?: boolean
  /** Mostrar valores numéricos nos vértices. Default false. */
  showValues?: boolean
  /** Cor de preenchimento (hex). Default emerald-500. */
  fillColor?: string
  /** Classe extra do container. */
  className?: string
}

export const RadarChart: React.FC<RadarChartProps> = ({
  breakdown,
  size = 220,
  showLabels = true,
  showValues = false,
  fillColor = '#10b981',
  className = '',
}) => {
  const center = size / 2
  const radius = size / 2 - (showLabels ? 34 : 12)
  const n = CRITERIOS.length

  // Ângulo de cada eixo (começa no topo, sentido horário)
  const angleFor = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2

  // Posição de um valor no eixo i (0..MAX_VALUE)
  const pointFor = (i: number, value: number) => {
    const r = (Math.max(0, Math.min(MAX_VALUE, value)) / MAX_VALUE) * radius
    const a = angleFor(i)
    return { x: center + r * Math.cos(a), y: center + r * Math.sin(a) }
  }

  // Anéis concêntricos (4 níveis: 5, 10, 15, 20)
  const rings = [5, 10, 15, 20]

  // Polígono do score
  const dataPoints = CRITERIOS.map((c, i) => pointFor(i, breakdown[c.key] as number))
  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      role="img"
      aria-label="Gráfico de radar dos critérios do score"
    >
      {/* Anéis concêntricos */}
      {rings.map((ring) => {
        const pts = CRITERIOS.map((_, i) => pointFor(i, ring))
          .map((p) => `${p.x},${p.y}`)
          .join(' ')
        return (
          <polygon
            key={ring}
            points={pts}
            fill="none"
            stroke="#262c34"
            strokeWidth={1}
            opacity={ring === MAX_VALUE ? 0.9 : 0.5}
          />
        )
      })}

      {/* Eixos (linhas do centro aos vértices) */}
      {CRITERIOS.map((_, i) => {
        const p = pointFor(i, MAX_VALUE)
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={p.x}
            y2={p.y}
            stroke="#262c34"
            strokeWidth={1}
            opacity={0.6}
          />
        )
      })}

      {/* Polígono dos dados (preenchimento verde transparente) */}
      <polygon
        points={dataPolygon}
        fill={fillColor}
        fillOpacity={0.25}
        stroke={fillColor}
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Vértices do polígono */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={fillColor} />
      ))}

      {/* Rótulos dos eixos */}
      {showLabels &&
        CRITERIOS.map((c, i) => {
          const p = pointFor(i, MAX_VALUE)
          const a = angleFor(i)
          // Offset do rótulo para fora do vértice
          const labelOffset = 16
          const lx = center + (radius + labelOffset) * Math.cos(a)
          const ly = center + (radius + labelOffset) * Math.sin(a)
          // Ancoragem do texto conforme posição
          const cos = Math.cos(a)
          let anchor: 'start' | 'middle' | 'end' = 'middle'
          if (cos > 0.3) anchor = 'start'
          else if (cos < -0.3) anchor = 'end'
          return (
            <g key={c.key}>
              <text
                x={lx}
                y={ly}
                fontSize={9}
                fontWeight={600}
                fill="#a1a1aa"
                textAnchor={anchor}
                dominantBaseline="middle"
                className="hidden sm:block"
              >
                {c.label}
              </text>
              <text
                x={lx}
                y={ly}
                fontSize={9}
                fontWeight={600}
                fill="#a1a1aa"
                textAnchor={anchor}
                dominantBaseline="middle"
                className="sm:hidden"
              >
                {c.short}
              </text>
              {showValues && (
                <text
                  x={lx}
                  y={ly + 11}
                  fontSize={8}
                  fontWeight={700}
                  fill={fillColor}
                  textAnchor={anchor}
                  dominantBaseline="middle"
                >
                  {(breakdown[c.key] as number).toFixed(1)}
                </text>
              )}
            </g>
          )
        })}
    </svg>
  )
}

/* ============================================================
 * GameScoreRadar — miniatura do radar ao lado do score, com
 * expansão ao clicar. Reutilizável nos cards de jogo.
 *
 * Renderiza um pequeno ícone/botão de radar que, ao clicar,
 * expande o gráfico completo abaixo do score.
 * ============================================================ */
interface GameScoreRadarProps {
  game: number[]
  /** Variante compacta (miniatura fixa). Default: expansível. */
  variant?: 'expandable' | 'miniature'
}

export const GameScoreRadar: React.FC<GameScoreRadarProps> = ({ game, variant = 'expandable' }) => {
  const [expanded, setExpanded] = useState(false)
  const breakdown = computeScoreV2(game)
  const score = breakdown.total
  const { textColor } = getScoreColor(score)

  if (variant === 'miniature') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="w-10 h-10 cursor-help flex-shrink-0"
            aria-label="Ver gráfico de radar do score"
          >
            <RadarChart breakdown={breakdown} size={80} showLabels={false} showValues={false} />
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-[#12161b] border-emerald-500/40 p-2 shadow-[0_0_18px_rgba(16,185,129,0.25)]"
        >
          <div className="w-[200px] h-[200px]">
            <RadarChart breakdown={breakdown} size={200} showLabels showValues />
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="inline-flex items-center gap-1 text-[10px] font-semibold text-zinc-400 hover:text-emerald-400 transition-colors"
        aria-expanded={expanded}
        title="Ver gráfico de radar dos critérios do score"
      >
        <RadarIcon className="w-3 h-3" />
        <span>Radar</span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {expanded && (
        <div className="mt-2 rounded-xl bg-[#12161b] border border-emerald-500/20 p-3 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
              Score Radar
            </span>
            <span className={`text-[11px] font-extrabold ${textColor}`}>{score}%</span>
          </div>
          <div className="w-full max-w-[220px] mx-auto aspect-square">
            <RadarChart breakdown={breakdown} size={220} showLabels showValues />
          </div>
          <div className="mt-2 grid grid-cols-5 gap-1 text-center">
            {CRITERIOS.map((c) => (
              <div key={c.key} className="px-0.5">
                <div className="text-[8px] uppercase tracking-wider text-zinc-500 font-semibold truncate">
                  {c.short}
                </div>
                <div className="text-[10px] font-bold text-emerald-400">
                  {(breakdown[c.key] as number).toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
