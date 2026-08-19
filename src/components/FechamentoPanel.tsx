import { useMemo, useState } from 'react'
import { Grid3x3, Copy, Check, Download, ShieldCheck, Info } from 'lucide-react'
import { aplicarFechamentoL10, estatisticaFechamentoL10, validarMatrizL10 } from '@/lib/coveringDesign'
import { PRECO_SIMPLES_CAIXA, TABELA_OFICIAL_MEGA } from '@/lib/caixaOficial'
import { formatTwoDigits, formatGameString, formatCurrencyBRL } from '@/lib/megaEngine'
import { ComparacaoConcurso } from '@/components/ComparacaoConcurso'
import { SimulacaoHistorica } from '@/components/SimulacaoHistorica'
import { PrintableVersion, jogosComScore } from '@/components/PrintableVersion'
import { useHistoricoConferencias } from '@/hooks/useHistoricoConferencias'

interface FechamentoPanelProps {
  dezenas: number[]
}

export function FechamentoPanel({ dezenas }: FechamentoPanelProps) {
  const ordenadas = useMemo(() => [...dezenas].sort((a, b) => a - b), [dezenas])
  const pronto = ordenadas.length === 10
  const matrizOk = useMemo(() => validarMatrizL10(), [])
  const stats = useMemo(() => estatisticaFechamentoL10(PRECO_SIMPLES_CAIXA), [])
  const jogos = useMemo(() => (pronto ? aplicarFechamentoL10(ordenadas) : []), [pronto, ordenadas])
  const { adicionar } = useHistoricoConferencias()
  const [copiado, setCopiado] = useState<number | null>(null)

  function copiar(jogo: number[], idx: number) {
    void navigator.clipboard.writeText(formatGameString(jogo))
    setCopiado(idx)
    setTimeout(() => setCopiado(null), 1400)
  }

  function exportar() {
    const linhas = [
      'Fechamento L(10, 6, 6, 5) — garantia de Quina se as 6 sorteadas estiverem nas 10',
      `Dezenas: ${ordenadas.map(formatTwoDigits).join(' - ')}`,
      '',
      ...jogos.map((j, i) => `${formatTwoDigits(i + 1)}  ${formatGameString(j)}`),
      '',
      `Custo: ${formatCurrencyBRL(stats.custoFechamento)} (14 × ${formatCurrencyBRL(PRECO_SIMPLES_CAIXA)})`,
      `Vs desdobramento completo: ${formatCurrencyBRL(stats.custoCompleto)} (210 jogos)`,
    ]
    const blob = new Blob([linhas.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'fechamento-l10-quina.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <div className="surface-card rounded-2xl p-5 border border-emerald-500/20">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Grid3x3 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Fechamento L(10, 6, 6, 5)</h2>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              14 volantes de 6 dezenas no lugar de 210. Se as 6 sorteadas estiverem nas 10, há
              garantia de pelo menos uma Quina. A Caixa aceita de 6 a 20 dezenas no volante oficial.
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-300">
          <ShieldCheck className="w-3.5 h-3.5" />
          {matrizOk ? 'Matriz de 14 jogos verificada (210/210 sextetos cobertos).' : 'Matriz inválida'}
        </div>
        {!pronto ? (
          <p className="mt-3 text-sm text-amber-300">
            Selecione exatamente 10 dezenas ({ordenadas.length}/10).
          </p>
        ) : (
          <p className="mt-3 text-xs text-zinc-400">
            Mapeamento D1…D10:{' '}
            {ordenadas.map((n, i) => `D${i + 1}=${formatTwoDigits(n)}`).join(' · ')}
          </p>
        )}
      </div>

      {pronto ? (
        <>
          <div className="grid grid-cols-2 gap-2 text-center">
            <Stat label="Jogos" value="14" />
            <Stat label="Custo" value={formatCurrencyBRL(stats.custoFechamento)} />
            <Stat label="Vs 210 jogos" value={formatCurrencyBRL(stats.custoCompleto)} />
            <Stat label="Economia" value={`${stats.reducaoPct}%`} />
          </div>
          <p className="text-[11px] text-zinc-500">
            P(Sena | 6 nas 10) = 14/210 ≈ 6,67%. Dez dezenas num único volante da Caixa:{' '}
            {formatCurrencyBRL(stats.custoOficialCaixa)}.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={exportar}
              className="flex-1 h-10 rounded-xl bg-[#1a1f2b] border border-[#262c34] text-xs text-zinc-200 flex items-center justify-center gap-1.5 hover:border-emerald-500/40"
            >
              <Download className="w-3.5 h-3.5" /> Exportar
            </button>
            <PrintableVersion jogos={jogosComScore(jogos)} modo="Fechamento L10" />
          </div>
          <ol className="space-y-2">
            {jogos.map((jogo, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between gap-2 rounded-xl border border-[#262c34] bg-[#161a1f] px-3 py-2"
              >
                <span className="text-[11px] text-zinc-500 w-6">{formatTwoDigits(idx + 1)}</span>
                <span className="font-mono text-sm text-emerald-300 flex-1">
                  {formatGameString(jogo)}
                </span>
                <button type="button" onClick={() => copiar(jogo, idx)} className="text-zinc-400 hover:text-white">
                  {copiado === idx ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </li>
            ))}
          </ol>
          <SimulacaoHistorica jogos={jogos} conjunto />
          <ComparacaoConcurso
            jogos={jogos}
            titulo="Conferir fechamento"
            onConferir={(payload) =>
              adicionar({
                modo: 'fechamento',
                dezenasSorteadas: payload.dezenasSorteadas,
                jogos: payload.jogos,
              })
            }
          />
        </>
      ) : null}

      <TabelaOficialCaixa />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#262c34] bg-[#161a1f] py-2">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="text-sm font-bold text-white">{value}</div>
    </div>
  )
}

function TabelaOficialCaixa() {
  return (
    <div className="surface-card rounded-2xl p-4 border border-[#262c34]">
      <div className="flex items-center gap-2 mb-2">
        <Info className="w-4 h-4 text-emerald-400" />
        <h3 className="text-sm font-semibold text-white">Volante oficial Caixa (6 a 20 dezenas)</h3>
      </div>
      <p className="text-[11px] text-zinc-500 mb-3">
        Fonte: Loterias Caixa — aposta simples R$ 6,00. Marcar n dezenas no mesmo volante equivale a
        C(n,6) jogos.
      </p>
      <div className="max-h-56 overflow-auto text-[11px]">
        <table className="w-full">
          <thead className="text-zinc-500 sticky top-0 bg-[#12161b]">
            <tr>
              <th className="text-left py-1">Dezenas</th>
              <th className="text-right">Jogos</th>
              <th className="text-right">Preço</th>
            </tr>
          </thead>
          <tbody>
            {TABELA_OFICIAL_MEGA.map((f) => (
              <tr key={f.dezenas} className="border-t border-[#262c34] text-zinc-300">
                <td className="py-1">{f.dezenas}</td>
                <td className="text-right">{f.combinacoes.toLocaleString('pt-BR')}</td>
                <td className="text-right text-emerald-300">{formatCurrencyBRL(f.preco)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
