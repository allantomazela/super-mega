import { useMemo, useState } from 'react'
import { Grid3x3, Download, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react'
import { aplicarFechamentoL10, estatisticaFechamentoL10, validarMatrizL10 } from '@/lib/coveringDesign'
import { PRECO_SIMPLES_CAIXA, TABELA_OFICIAL_MEGA } from '@/lib/caixaOficial'
import { formatTwoDigits, formatCurrencyBRL, buildJogosTxtCaixa } from '@/lib/megaEngine'
import { PrintableVersion, jogosComScore } from '@/components/PrintableVersion'

interface FechamentoPanelProps {
  dezenas: number[]
}

export function FechamentoPanel({ dezenas }: FechamentoPanelProps) {
  const ordenadas = useMemo(() => [...dezenas].sort((a, b) => a - b), [dezenas])
  const pronto = ordenadas.length === 10
  const matrizOk = useMemo(() => validarMatrizL10(), [])
  const stats = useMemo(() => estatisticaFechamentoL10(PRECO_SIMPLES_CAIXA), [])
  const jogos = useMemo(() => (pronto ? aplicarFechamentoL10(ordenadas) : []), [pronto, ordenadas])
  const [tabelaAberta, setTabelaAberta] = useState(false)

  function exportar() {
    const blob = new Blob([buildJogosTxtCaixa(jogos)], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'fechamento-l10-quina.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="surface-card rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex items-center gap-2.5 border-b border-[#262c34] pb-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Grid3x3 className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Fechamento L10</h2>
          <p className="text-[11px] text-zinc-500">14 jogos · garantia de Quina</p>
        </div>
      </div>

      <p className="text-xs text-zinc-400 leading-relaxed">
        14 volantes de 6 no lugar de 210. Se as 6 sorteadas estiverem nas 10, há pelo menos uma
        Quina. Custo R$ 84,00 vs R$ 1.260,00 no volante de 10 da Caixa.
      </p>

      <div className="flex items-center gap-1.5 text-[11px] text-emerald-300">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
        {matrizOk ? 'Matriz verificada (210/210).' : 'Matriz inválida'}
      </div>

      {!pronto ? (
        <p className="text-sm text-amber-300">Marque 10 dezenas ({ordenadas.length}/10).</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 text-center">
            <Mini label="Jogos" value="14" />
            <Mini label="Custo" value={formatCurrencyBRL(stats.custoFechamento)} />
            <Mini label="Vs 210" value={formatCurrencyBRL(stats.custoCompleto)} />
            <Mini label="Economia" value={`${stats.reducaoPct}%`} />
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            D1–D10:{' '}
            {ordenadas.map((n, i) => `${i + 1}=${formatTwoDigits(n)}`).join(' · ')}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={exportar}
              className="flex-1 h-9 rounded-lg bg-[#1a1f2b] border border-[#262c34] text-xs text-zinc-200 flex items-center justify-center gap-1.5 hover:border-emerald-500/40"
            >
              <Download className="w-3.5 h-3.5" /> TXT
            </button>
            <PrintableVersion jogos={jogosComScore(jogos)} modo="Fechamento L10" />
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => setTabelaAberta((v) => !v)}
        className="w-full flex items-center justify-between text-xs text-zinc-400 hover:text-white py-1"
      >
        Preços oficiais Caixa (6–20)
        {tabelaAberta ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {tabelaAberta ? (
        <div className="max-h-44 overflow-auto text-[11px] border border-[#262c34] rounded-lg">
          <table className="w-full">
            <thead className="text-zinc-500 sticky top-0 bg-[#161a1f]">
              <tr>
                <th className="text-left px-2 py-1">N</th>
                <th className="text-right px-2 py-1">Jogos</th>
                <th className="text-right px-2 py-1">Preço</th>
              </tr>
            </thead>
            <tbody>
              {TABELA_OFICIAL_MEGA.map((f) => (
                <tr key={f.dezenas} className="border-t border-[#262c34] text-zinc-300">
                  <td className="px-2 py-1">{f.dezenas}</td>
                  <td className="text-right px-2 py-1">{f.combinacoes.toLocaleString('pt-BR')}</td>
                  <td className="text-right px-2 py-1 text-emerald-300">
                    {formatCurrencyBRL(f.preco)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#262c34] bg-[#161a1f] py-1.5">
      <div className="text-[10px] text-zinc-500">{label}</div>
      <div className="text-sm font-bold text-white">{value}</div>
    </div>
  )
}
