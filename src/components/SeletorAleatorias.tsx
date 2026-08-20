import { Dices } from 'lucide-react'
import { MEGA_MAX_DEZENAS, MEGA_MIN_DEZENAS, precoOficialCaixa, combinacoesSimples } from '@/lib/caixaOficial'
import { formatCurrencyBRL } from '@/lib/megaEngine'

const OPCOES_DEZENAS = Array.from(
  { length: MEGA_MAX_DEZENAS - MEGA_MIN_DEZENAS + 1 },
  (_, i) => i + MEGA_MIN_DEZENAS,
)

interface SeletorAleatoriasProps {
  quantidade: number
  onQuantidadeChange: (n: number) => void
  onGerar: (quantidade: number) => void
  /** Quando definido (ex.: modo fechamento), trava o seletor nesse tamanho. */
  travadoEm?: number
}

export function SeletorAleatorias({
  quantidade,
  onQuantidadeChange,
  onGerar,
  travadoEm,
}: SeletorAleatoriasProps) {
  const dezenas = travadoEm ?? quantidade
  const combinacoes = combinacoesSimples(dezenas)
  const preco = precoOficialCaixa(dezenas)
  const travado = travadoEm != null

  return (
    <div className="flex flex-col items-stretch sm:items-end gap-1.5">
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className="hidden sm:inline whitespace-nowrap">Dezenas</span>
          <select
            value={dezenas}
            disabled={travado}
            onChange={(e) => onQuantidadeChange(Number(e.target.value))}
            aria-label="Quantidade de dezenas no padrão da Mega-Sena da Caixa (6 a 20)"
            className="h-8 rounded-lg bg-[#1a1f2b] border border-[#262c34] text-xs text-zinc-200 px-2 pr-6 focus:outline-none focus:border-emerald-500/60 disabled:opacity-70"
          >
            {OPCOES_DEZENAS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => onGerar(dezenas)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1f2b] border border-[#262c34] text-xs text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors"
          title={`Sortear ${dezenas} dezenas aleatórias (volante oficial da Caixa: 6 a 20)`}
        >
          <Dices className="w-3.5 h-3.5 text-emerald-400" />
          <span>Gerar {dezenas} aleatórias</span>
        </button>
      </div>
      <p className="text-[10px] text-zinc-500 leading-tight sm:text-right">
        Caixa: {dezenas} dezenas · {combinacoes} aposta{combinacoes === 1 ? '' : 's'} ·{' '}
        {formatCurrencyBRL(preco)}
      </p>
    </div>
  )
}
