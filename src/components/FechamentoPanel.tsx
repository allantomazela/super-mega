import { useMemo, useState } from 'react'
import { Grid3x3, Download, ShieldCheck, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import {
  aplicarFechamento,
  estatisticaFechamento,
  matrizDisponivel,
  matrizEstaVerificada,
  obterMatriz,
  GARANTIA_LABEL,
  FECHAMENTO_N_MIN,
  FECHAMENTO_N_MAX,
  type GarantiaFechamento,
} from '@/lib/coveringDesign'
import { PRECO_SIMPLES_CAIXA, TABELA_OFICIAL_MEGA } from '@/lib/caixaOficial'
import { formatTwoDigits, formatCurrencyBRL, buildJogosTxtCaixa } from '@/lib/megaEngine'
import { PrintableVersion, jogosComScore } from '@/components/PrintableVersion'
import { useMega } from '@/lib/MegaContext'

interface FechamentoPanelProps {
  dezenas: number[]
}

export function FechamentoPanel({ dezenas }: FechamentoPanelProps) {
  const { fechamentoN, setFechamentoN, fechamentoGarantia, setFechamentoGarantia } = useMega()
  const ordenadas = useMemo(() => [...dezenas].sort((a, b) => a - b), [dezenas])
  const disponivel = matrizDisponivel(fechamentoN, fechamentoGarantia)
  const matriz = disponivel ? obterMatriz(fechamentoN, fechamentoGarantia) : null
  const matrizOk = useMemo(
    () => (matriz ? matrizEstaVerificada(matriz) : false),
    [matriz],
  )
  const stats = useMemo(
    () => estatisticaFechamento(fechamentoN, fechamentoGarantia, PRECO_SIMPLES_CAIXA),
    [fechamentoN, fechamentoGarantia],
  )
  const pronto = disponivel && ordenadas.length === fechamentoN
  const jogos = useMemo(() => {
    if (!pronto) return []
    try {
      return aplicarFechamento(ordenadas, fechamentoN, fechamentoGarantia)
    } catch {
      return []
    }
  }, [pronto, ordenadas, fechamentoN, fechamentoGarantia])
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

      {/* Slider n */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label htmlFor="fechamento-n" className="text-zinc-400">
            Tamanho do grupo (n)
          </label>
          <span className="font-bold text-emerald-400 tabular-nums">{fechamentoN}</span>
        </div>
        <input
          id="fechamento-n"
          type="range"
          min={FECHAMENTO_N_MIN}
          max={FECHAMENTO_N_MAX}
          step={1}
          value={fechamentoN}
          onChange={(e) => setFechamentoN(Number(e.target.value))}
          className="w-full accent-emerald-500"
        />
        <div className="flex justify-between text-[10px] text-zinc-600">
          <span>{FECHAMENTO_N_MIN}</span>
          <span>{FECHAMENTO_N_MAX}</span>
        </div>
      </div>

      {/* Garantia */}
      <fieldset className="space-y-2">
        <legend className="text-xs text-zinc-400">Garantia (se as 6 sorteadas estiverem no grupo)</legend>
        <div className="grid grid-cols-2 gap-2">
          {(['quina', 'quadra'] as GarantiaFechamento[]).map((g) => {
            const ativa = fechamentoGarantia === g
            const tem = matrizDisponivel(fechamentoN, g)
            return (
              <button
                key={g}
                type="button"
                onClick={() => setFechamentoGarantia(g)}
                className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                  ativa
                    ? 'border-emerald-500/50 bg-emerald-950/40 text-white'
                    : 'border-[#262c34] bg-[#161a1f] text-zinc-400 hover:border-zinc-600'
                }`}
              >
                <div className="text-sm font-semibold">{GARANTIA_LABEL[g]}</div>
                <div className="text-[10px] mt-0.5 opacity-80">
                  {tem ? 'Matriz disponível' : 'Indisponível'}
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
            disponível. Na v1 só o fechamento de 10 dezenas com garantia de Quina (14 jogos) está
            embarcado e verificado. Demais tamanhos entram após validação exaustiva.
          </div>
        </div>
      ) : (
        <>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {stats?.jogos} volantes de 6 no lugar de {stats?.combinacoesTotais.toLocaleString('pt-BR')}.
            Se as 6 sorteadas estiverem nas {fechamentoN}, há pelo menos uma{' '}
            {GARANTIA_LABEL[fechamentoGarantia]}. Custo{' '}
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
              Marque {fechamentoN} dezenas ({ordenadas.length}/{fechamentoN}).
            </p>
          ) : stats ? (
            <>
              <div className="grid grid-cols-2 gap-2 text-center">
                <Mini label="Jogos" value={String(stats.jogos)} />
                <Mini label="Custo" value={formatCurrencyBRL(stats.custoFechamento)} />
                <Mini label={`Vs C(${fechamentoN},6)`} value={formatCurrencyBRL(stats.custoCompleto)} />
                <Mini label="Economia" value={`${stats.reducaoPct}%`} />
              </div>
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
