import { formatTwoDigits } from '@/modules/lotofacil/utils/math/combinacoes'
import { LF_MAX_POOL, LF_UNIVERSO } from '@/modules/lotofacil/utils/math/constants'

interface NumeroGridProps {
  selected: number[]
  onToggle: (n: number) => void
}

export function NumeroGrid({ selected, onToggle }: NumeroGridProps) {
  const count = selected.length
  return (
    <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
      {Array.from({ length: LF_UNIVERSO }, (_, i) => i + 1).map((num) => {
        const isSelected = selected.includes(num)
        const blocked = !isSelected && count >= LF_MAX_POOL
        return (
          <button
            key={num}
            type="button"
            disabled={blocked}
            onClick={() => onToggle(num)}
            className={`aspect-square min-h-[36px] rounded-xl font-bold text-sm flex items-center justify-center transition-all select-none ${
              isSelected
                ? 'bg-violet-500 text-white border border-violet-300/50 shadow-[0_0_12px_rgba(139,92,246,0.35)] scale-[1.04]'
                : 'bg-[#1a1f2b] border border-[#262c34] text-zinc-300 hover:border-violet-500/40 hover:text-white'
            } ${blocked ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {formatTwoDigits(num)}
          </button>
        )
      })}
    </div>
  )
}
