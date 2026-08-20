import { useMemo, useState } from 'react'
import {
  Grid3x3,
  Download,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Info,
} from 'lucide-react'
import {
  aplicarFechamento,
  estatisticaFechamento,
  matrizDisponivel,
  obterMatriz,
  listarNDisponiveis,
  GARANTIA_LABEL,
  type GarantiaFechamento,
} from '@/lib/coveringDesign'
import { PRECO_SIMPLES_CAIXA, TABELA_OFICIAL_MEGA } from '@/lib/caixaOficial'
import { formatTwoDigits, formatCurrencyBRL, buildJogosTxtCaixa } from '@/lib/megaEngine'
import { PrintableVersion, jogosComScore } from '@/components/PrintableVersion'
import { useMega } from '@/lib/MegaContext'

interface FechamentoPanelProps {
  dezenas: number[]
  gerado: boolean
  isLoading: boolean
  onGenerate: () => void
}

export function FechamentoPanel({ dezenas, gerado, isLoading, onGenerate }: FechamentoPanelProps) {
  const { fechamentoN, setFechamentoN, fechamentoGarantia, setFechamentoGarantia } = useMega()
  const ordenadas = useMemo(() => [...dezenas].sort((a, b) => a - b), [dezenas])
  const disponivel = matrizDisponivel(fechamentoN, fechamentoGarantia)
  const matriz = disponivel ? obterMatriz(fechamentoN, fechamentoGarantia) : null
  // Matrizes do registry já passaram no checklist offline — não revalidar C(n,6) no clique (trava a UI).
  const matrizOk = Boolean(matriz)
  const stats = useMemo(
    () => estatisticaFechamento(fechamentoN, fechamentoGarantia, PRECO_SIMPLES_CAIXA),
    [fechamentoN, fechamentoGarantia],
  )
  const pronto = disponivel && ordenadas.length === fechamentoN
  const jogos = useMemo(() => {
    if (!pronto || !gerado) return []
    try {
      return aplicarFechamento(ordenadas, fechamentoN, fechamentoGarantia)
    } catch {
      return []
    }
  }, [pronto, gerado, ordenadas, fechamentoN, fechamentoGarantia])
  const [tabelaAberta, setTabelaAberta] = useState(false)

  function exportar() {
    const blob = new Blob([buildJogosTxtCaixa(jogos)], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fechamento-l${fechamentoN}-${fechamentoGarantia}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const statusLabel =
    matriz?.status === 'verificada'
      ? matriz.otima
        ? 'Ótima conhecida · verificada'
        : 'Verificada no app'
      : matriz?.status === 'melhor_conhecida'
        ? 'Melhor construção conhecida'
        : null

  const nDisponiveis = useMemo(
    () => listarNDisponiveis(fechamentoGarantia),
    [fechamentoGarantia],
  )

  return (
    <div className="surface-card rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex items-center gap-2.5 border-b border-[#262c34] pb-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Grid3x3 className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Fechamento Escalável</h2>
          <p className="text-[11px] text-zinc-500">
            Grupo {fechamentoN} · garantia de {GARANTIA_LABEL[fechamentoGarantia]}
          </p>
        </div>
      </div>

      {/* Só tamanhos com matriz verificada — não confundir com volante Caixa 6–20 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400">Tamanho do grupo (n)</span>
          <span className="font-bold text-emerald-400 tabular-nums">{fechamentoN}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {nDisponiveis.map((n) => {
            const ativa = fechamentoN === n
            return (
              <button
                key={n}
                type="button"
                onClick={() => setFechamentoN(n)}
                className={`min-w-[2.75rem] h-9 px-3 rounded-lg border text-sm font-semibold transition-colors ${
                  ativa
                    ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300'
                    : 'border-[#262c34] bg-[#161a1f] text-zinc-400 hover:border-zinc-600 hover:text-white'
                }`}
              >
                {n}
              </button>
            )
          })}
        </div>
        <p className="text-[10px] text-zinc-500 leading-relaxed">
          Ao trocar o tamanho, o app ajusta as dezenas automaticamente (mantém as atuais e completa
          com aleatórias, ou corta o excesso). Depois clique em <strong className="text-zinc-300">Gerar Fechamento</strong>.
          13–20 ainda não têm matriz — use Desdobramento ou 5 Jogos.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs text-zinc-400">Garantia (se as 6 sorteadas estiverem no grupo)</legend>
        <div className="grid grid-cols-2 gap-2">
          {(['quina', 'quadra'] as GarantiaFechamento[]).map((g) => {
            const ativa = fechamentoGarantia === g
            const ns = listarNDisponiveis(g)
            const tem = ns.length > 0
            return (
              <button
                key={g}
                type="button"
                onClick={() => setFechamentoGarantia(g)}
                disabled={!tem}
                className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                  ativa
                    ? 'border-emerald-500/50 bg-emerald-950/40 text-white'
                    : 'border-[#262c34] bg-[#161a1f] text-zinc-400 hover:border-zinc-600'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <div className="text-sm font-semibold">{GARANTIA_LABEL[g]}</div>
                <div className="text-[10px] mt-0.5 opacity-80">
                  {tem ? `n = ${ns.join(', ')}` : 'Indisponível'}
                </div>
              </button>
            )
          })}
        </div>
      </fieldset>

      {!disponivel ? (
        <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2.5 text-xs text-amber-200 leading-relaxed">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            Matriz L({fechamentoN},6,6,{fechamentoGarantia === 'quina' ? 5 : 4}) ainda não
            disponível para esta combinação. Escolha um tamanho listado acima.
          </div>
        </div>
      ) : (
        <>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {stats?.jogos} volantes de 6 no lugar de{' '}
            {stats?.combinacoesTotais.toLocaleString('pt-BR')}. Se as 6 sorteadas estiverem nas{' '}
            {fechamentoN}, há pelo menos uma {GARANTIA_LABEL[fechamentoGarantia]}. Custo{' '}
            {stats ? formatCurrencyBRL(stats.custoFechamento) : '—'} vs{' '}
            {stats ? formatCurrencyBRL(stats.custoOficialCaixa) : '—'} no volante da Caixa.
          </p>

          <div className="flex items-center gap-1.5 text-[11px] text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            {matrizOk
              ? `${statusLabel ?? 'Matriz verificada'} · ${matriz?.fonte}`
              : 'Matriz inválida'}
          </div>

          {!pronto ? (
            <p className="text-sm text-amber-300">
              Marque {fechamentoN} dezenas ({ordenadas.length}/{fechamentoN}), depois clique em Gerar
              Fechamento.
            </p>
          ) : stats ? (
            <div className="grid grid-cols-2 gap-2 text-center">
              <Mini label="Jogos" value={String(stats.jogos)} />
              <Mini label="Custo" value={formatCurrencyBRL(stats.custoFechamento)} />
              <Mini label={`Vs C(${fechamentoN},6)`} value={formatCurrencyBRL(stats.custoCompleto)} />
              <Mini label="Economia" value={`${stats.reducaoPct}%`} />
            </div>
          ) : null}
        </>
      )}

      <div className="pt-3 border-t border-[#262c34] space-y-2">
        <button
          type="button"
          onClick={onGenerate}
          disabled={!pronto || isLoading}
          className={`
            w-full py-3.5 px-6 rounded-xl font-bold text-white flex items-center justify-center gap-2.5 transition-all duration-200 select-none shadow-lg
            ${
              pronto && !isLoading
                ? 'emerald-gradient emerald-glow hover:translate-y-[-2px] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] active:scale-[0.98] cursor-pointer'
                : 'bg-[#1a1f2b] text-zinc-500 border border-[#262c34] opacity-50 cursor-not-allowed'
            }
          `}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-white" />
              <span>Gerando fechamento...</span>
            </>
          ) : (
            <>
              <Grid3x3 className="w-5 h-5 text-white" />
              <span>
                {gerado ? 'Gerar novamente' : 'Gerar Fechamento'}
                {stats ? ` (${stats.jogos} jogos)` : ''}
              </span>
            </>
          )}
        </button>
        <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
          <span>
            {ordenadas.length}/{fechamentoN} dezenas
          </span>
          {pronto ? (
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Pronto para gerar
            </span>
          ) : (
            <span className="text-amber-400/80 flex items-center gap-1">
              <Info className="w-3 h-3" />
              {!disponivel
                ? 'Matriz indisponível'
                : `Faltam ${Math.max(0, fechamentoN - ordenadas.length)}`}
            </span>
          )}
        </div>
      </div>

      {gerado && pronto && jogos.length > 0 ? (
        <>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            D1–D{fechamentoN}:{' '}
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
            <PrintableVersion
              jogos={jogosComScore(jogos)}
              modo={`Fechamento ${matriz?.label ?? `L${fechamentoN}`}`}
            />
          </div>
        </>
      ) : null}

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
