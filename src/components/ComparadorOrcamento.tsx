import { useMemo, useState } from 'react'
import { Wallet, Sparkles, ShieldCheck, AlertTriangle } from 'lucide-react'
import {
  listarOpcoesOrcamento,
  formatOrcamentoBRL,
  type OpcaoOrcamento,
} from '@/lib/orcamentoApostas'
import type { AppMode } from '@/lib/MegaContext'
import type { GarantiaFechamento } from '@/lib/coveringDesign'

export interface AplicarOrcamentoPayload {
  modo: AppMode
  fechamentoN?: number
  fechamentoGarantia?: GarantiaFechamento
}

interface ComparadorOrcamentoProps {
  onAplicar: (payload: AplicarOrcamentoPayload) => void
}

const ORCAMENTOS_RAPIDOS = [30, 60, 84, 120, 150, 264]

export function ComparadorOrcamento({ onAplicar }: ComparadorOrcamentoProps) {
  const [orcamento, setOrcamento] = useState(84)
  const opcoes = useMemo(() => listarOpcoesOrcamento(orcamento), [orcamento])
  const cabem = opcoes.filter((o) => o.cabeNoOrcamento)

  return (
    <div className="surface-card rounded-2xl p-5 shadow-xl space-y-4 border border-emerald-500/15">
      <div className="flex items-center gap-2.5 border-b border-[#262c34] pb-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Wallet className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Orçamento → melhor estratégia</h2>
          <p className="text-[11px] text-zinc-500">
            Compara custo, garantia e transparência — não aumenta a chance de Sena
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="orcamento-rs" className="text-xs text-zinc-400 flex justify-between">
          <span>Quanto pode gastar neste concurso?</span>
          <span className="font-bold text-emerald-400 tabular-nums">
            {formatOrcamentoBRL(orcamento)}
          </span>
        </label>
        <input
          id="orcamento-rs"
          type="range"
          min={6}
          max={300}
          step={6}
          value={orcamento}
          onChange={(e) => setOrcamento(Number(e.target.value))}
          className="w-full accent-emerald-500"
        />
        <div className="flex flex-wrap gap-1.5">
          {ORCAMENTOS_RAPIDOS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setOrcamento(v)}
              className={`h-7 px-2.5 rounded-md border text-[11px] font-semibold transition-colors ${
                orcamento === v
                  ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300'
                  : 'border-[#262c34] bg-[#161a1f] text-zinc-400 hover:border-zinc-600'
              }`}
            >
              {formatOrcamentoBRL(v)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-950/20 px-3 py-2 text-[11px] text-amber-100/90 leading-relaxed">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
        <p>
          Garantia de Fechamento só vale <strong className="text-amber-200">se as 6 sorteadas
          estiverem no seu grupo</strong>. Histórico não prevê o próximo sorteio. Prefira a opção
          recomendada dentro do orçamento.
        </p>
      </div>

      <p className="text-[11px] text-zinc-500">
        {cabem.length} opção{cabem.length === 1 ? '' : 'ões'} dentro de {formatOrcamentoBRL(orcamento)}
      </p>

      <ul className="space-y-2 max-h-[28rem] overflow-y-auto pr-0.5">
        {opcoes.map((op) => (
          <OpcaoCard key={op.id} opcao={op} onAplicar={onAplicar} />
        ))}
      </ul>
    </div>
  )
}

function OpcaoCard({
  opcao,
  onAplicar,
}: {
  opcao: OpcaoOrcamento
  onAplicar: (payload: AplicarOrcamentoPayload) => void
}) {
  const pSena =
    opcao.pSenaSe6NoGrupo != null
      ? `${(opcao.pSenaSe6NoGrupo * 100).toFixed(1).replace('.', ',')}%`
      : null

  return (
    <li
      className={`rounded-xl border px-3 py-3 space-y-2 ${
        opcao.recomendada
          ? 'border-emerald-500/40 bg-emerald-950/25'
          : opcao.cabeNoOrcamento
            ? 'border-[#262c34] bg-[#161a1f]'
            : 'border-[#262c34]/80 bg-[#12161b] opacity-55'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-bold text-white">{opcao.titulo}</span>
            {opcao.recomendada ? (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                <Sparkles className="w-3 h-3" /> Recomendada
              </span>
            ) : null}
            {!opcao.cabeNoOrcamento ? (
              <span className="text-[10px] font-semibold text-zinc-500 uppercase">Acima do orçamento</span>
            ) : null}
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{opcao.detalhe}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-extrabold text-emerald-300 tabular-nums">
            {formatOrcamentoBRL(opcao.custo)}
          </div>
          <div className="text-[10px] text-zinc-500">{opcao.jogos} jogo{opcao.jogos === 1 ? '' : 's'}</div>
        </div>
      </div>

      {opcao.garantia ? (
        <div className="flex items-start gap-1.5 text-[11px] text-emerald-200/90">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{opcao.garantia}</span>
        </div>
      ) : (
        <p className="text-[11px] text-zinc-500">Sem garantia combinatória de Quina/Quadra.</p>
      )}

      {pSena ? (
        <p className="text-[10px] text-zinc-500">
          P(Sena | 6 no grupo) ≈ <span className="text-zinc-300 font-semibold">{pSena}</span>
        </p>
      ) : null}

      <button
        type="button"
        disabled={!opcao.cabeNoOrcamento}
        onClick={() =>
          onAplicar({
            modo: opcao.modo,
            fechamentoN: opcao.fechamentoN,
            fechamentoGarantia: opcao.fechamentoGarantia,
          })
        }
        className={`w-full h-9 rounded-lg text-xs font-bold transition-colors ${
          opcao.cabeNoOrcamento
            ? 'bg-emerald-600/90 hover:bg-emerald-500 text-white'
            : 'bg-[#1a1f2b] text-zinc-600 cursor-not-allowed border border-[#262c34]'
        }`}
      >
        {opcao.cabeNoOrcamento ? 'Usar esta estratégia' : 'Fora do orçamento'}
      </button>
    </li>
  )
}
