import { Layers, Target, Swords, Grid3x3 } from 'lucide-react'
import type { AppMode } from '@/lib/MegaContext'

const MODES: {
  key: AppMode
  label: string
  hint: string
  icon: typeof Layers
  how: string
  when: string
}[] = [
  {
    key: 'desdobramento',
    label: 'Desdobramento',
    hint: 'Todas as combinações de 6',
    icon: Layers,
    how: 'Você escolhe de 6 a 20 dezenas. O app gera todas as apostas simples de 6 números (C(n,6)). Com 7 números são 7 jogos; com 10, 210 jogos. Acima de 15 dezenas a listagem completa pesa no navegador: mostramos o preço do volante oficial da Caixa.',
    when: 'Use quando quiser o conjunto completo, igual ao desdobramento da lotérica, e aplicar filtros (paridade, soma, etc.).',
  },
  {
    key: 'cinco-jogos',
    label: '5 Jogos',
    hint: '5 jogos oficiais de 6 a 20',
    icon: Target,
    how: 'Gera 5 apostas oficiais da Mega-Sena a partir do seu grupo. Você escolhe de 6 a 20 dezenas em cada jogo (volante da Caixa). Com 6 é aposta simples; com 7 a 20 é desdobramento no mesmo bilhete, com o preço oficial.',
    when: 'Use quando quiser poucos volantes prontos, simples ou múltiplos, sem gastar o desdobramento completo do grupo.',
  },
  {
    key: 'torneio',
    label: 'Torneio',
    hint: 'Dois grupos lado a lado',
    icon: Swords,
    how: 'Monta dois grupos independentes (A e B), gera 5 jogos de 6 dezenas em cada um e compara score, cobertura e desempenho no histórico. O vencedor é o grupo com maior score médio (empate: maior cobertura).',
    when: 'Use para decidir entre duas listas de dezenas antes de gastar em volantes.',
  },
  {
    key: 'fechamento',
    label: 'Fechamento',
    hint: '10 dezenas → 14 jogos',
    icon: Grid3x3,
    how: 'Com exatamente 10 dezenas, aplica a matriz L(10,6,6,5): 14 jogos de 6 números no lugar de 210. Se as 6 sorteadas estiverem nas 10, há garantia de pelo menos uma Quina. Custo 14 × R$ 6,00 = R$ 84,00 (o volante de 10 da Caixa custa R$ 1.260,00).',
    when: 'Use quando já tem um grupo de 10 e quer a garantia de Quina com o menor número conhecido de apostas simples.',
  },
]

interface ModeGuideProps {
  mode: AppMode
  onChange: (m: AppMode) => void
}

export function ModeGuide({ mode, onChange }: ModeGuideProps) {
  const active = MODES.find((m) => m.key === mode) ?? MODES[0]
  const Icon = active.icon

  return (
    <div className="space-y-3">
      <div className="surface-card rounded-2xl p-2 shadow-lg grid grid-cols-2 xl:grid-cols-4 gap-2">
        {MODES.map((opt) => {
          const selected = mode === opt.key
          const OptIcon = opt.icon
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.key)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 text-left min-h-[3.25rem] ${
                selected
                  ? 'emerald-gradient emerald-glow text-white border border-emerald-300/40'
                  : 'bg-[#1a1f2b] border border-[#262c34] text-zinc-300 hover:text-white hover:border-zinc-600'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  selected
                    ? 'bg-white/15 text-white'
                    : 'bg-[#161a1f] border border-[#262c34] text-emerald-400'
                }`}
              >
                <OptIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold leading-tight truncate">{opt.label}</div>
                <div
                  className={`text-[11px] mt-0.5 leading-snug line-clamp-2 ${
                    selected ? 'text-emerald-50/80' : 'text-zinc-500'
                  }`}
                >
                  {opt.hint}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="rounded-2xl border border-[#262c34] bg-[#12161b] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wide">
          <Icon className="w-3.5 h-3.5" />
          Como funciona: {active.label}
        </div>
        <p className="mt-2 text-sm text-zinc-300 leading-relaxed">{active.how}</p>
        <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed">{active.when}</p>
      </div>
    </div>
  )
}
