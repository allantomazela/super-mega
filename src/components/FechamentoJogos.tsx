import { useMemo, useState } from 'react'
import { Copy, Check } from 'lucide-react'
import {
  aplicarFechamento,
  estatisticaFechamento,
  matrizDisponivel,
  GARANTIA_LABEL,
  obterMatriz,
} from '@/lib/coveringDesign'
import { PRECO_SIMPLES_CAIXA } from '@/lib/caixaOficial'
import { formatTwoDigits, formatGameString, buildJogosTxtCaixa } from '@/lib/megaEngine'
import { ComparacaoConcurso } from '@/components/ComparacaoConcurso'
import { VolanteOficial } from '@/components/VolanteOficial'
import { SimulacaoHistorica } from '@/components/SimulacaoHistorica'
import { useHistoricoConferencias } from '@/hooks/useHistoricoConferencias'
import { useMega } from '@/lib/MegaContext'

interface FechamentoJogosProps {
  dezenas: number[]
}

export function FechamentoJogos({ dezenas }: FechamentoJogosProps) {
  const { fechamentoN, fechamentoGarantia } = useMega()
  const ordenadas = useMemo(() => [...dezenas].sort((a, b) => a - b), [dezenas])
  const disponivel = matrizDisponivel(fechamentoN, fechamentoGarantia)
  const matriz = disponivel ? obterMatriz(fechamentoN, fechamentoGarantia) : null
  const stats = useMemo(
    () => estatisticaFechamento(fechamentoN, fechamentoGarantia, PRECO_SIMPLES_CAIXA),
    [fechamentoN, fechamentoGarantia],
  )
  const jogos = useMemo(() => {
    if (!disponivel || ordenadas.length !== fechamentoN) return []
    try {
      return aplicarFechamento(ordenadas, fechamentoN, fechamentoGarantia)
    } catch {
      return []
    }
  }, [disponivel, ordenadas, fechamentoN, fechamentoGarantia])
  const { adicionar } = useHistoricoConferencias()
  const [copiado, setCopiado] = useState<number | null>(null)

  if (jogos.length === 0) return null

  function copiar(jogo: number[], idx: number) {
    void navigator.clipboard.writeText(formatGameString(jogo))
    setCopiado(idx)
    setTimeout(() => setCopiado(null), 1400)
  }

  const pSenaPct = stats ? (stats.pSenaSe6NasN * 100).toFixed(2).replace('.', ',') : '—'

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-white">
            {stats?.jogos ?? jogos.length} volantes oficiais
          </h2>
          <p className="text-xs text-zinc-500">
            {matriz?.label ?? `L${fechamentoN}`} · garantia de {GARANTIA_LABEL[fechamentoGarantia]} ·
            formato 01,25,36,38,52,56 · P(Sena | 6 nas {fechamentoN}) ≈ {pSenaPct}%
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(buildJogosTxtCaixa(jogos).trim())}
            className="h-9 px-3 rounded-lg border border-[#262c34] text-xs text-zinc-200 hover:border-emerald-500/40"
          >
            Copiar TXT
          </button>
          <VolanteOficial jogos={jogos} />
        </div>
      </div>
      <p className="text-[11px] text-zinc-500">
        Imprima os volantes e marque as bolinhas pretas no volante da Mega-Sena na lotérica, ou
        registre os mesmos 6 números em{' '}
        <a
          href="https://www.loteriasonline.caixa.gov.br/"
          target="_blank"
          rel="noreferrer"
          className="text-emerald-400 underline"
        >
          Loterias Online Caixa
        </a>
        . A Caixa não permite preenchimento automático por apps de terceiros.
      </p>
      <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {jogos.map((jogo, idx) => (
          <li
            key={idx}
            className="flex items-center gap-2 rounded-xl border border-[#262c34] bg-[#161a1f] px-3 py-2.5"
          >
            <span className="text-[11px] font-bold text-zinc-500 w-5">
              {formatTwoDigits(idx + 1)}
            </span>
            <span className="font-mono text-sm text-emerald-300 flex-1 tracking-wide">
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
    </div>
  )
}
