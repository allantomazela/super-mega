import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  Cloud,
  Copy,
  Check,
  History,
  Loader2,
  Sparkles,
  Star,
} from 'lucide-react'
import { toast } from 'sonner'
import { useLotofacil } from '@/modules/lotofacil/hooks/LotofacilContext'
import { useLotofacilConcursos } from '@/modules/lotofacil/hooks/useLotofacilConcursos'
import { useHistoricoLotofacilNeon } from '@/modules/lotofacil/hooks/useHistoricoLotofacilNeon'
import {
  formatGameString,
  formatTwoDigits,
} from '@/modules/lotofacil/utils/math/combinacoes'
import { avaliarFiltros, scoreFiltros } from '@/modules/lotofacil/utils/math/filtros'
import { formatCurrencyBRL } from '@/modules/lotofacil/utils/math/caixaOficial'
import { LF_PRECO_SIMPLES } from '@/modules/lotofacil/utils/math/constants'
import {
  PREVISAO_VERSAO,
  compararComHistorico,
  preverProximasDezenas,
} from '@/modules/lotofacil/utils/math/analiseHistorica'
import {
  afinidadeComPrevisao,
  formatChance1Em,
  probabilidadePremioLotofacil,
  resumoRetrospectiva,
} from '@/modules/lotofacil/utils/math/probabilidade'

export default function LotofacilResultados() {
  const { jogosGerados, selected, filtros, mode } = useLotofacil()
  const { concursos } = useLotofacilConcursos()
  const { salvar, salvando } = useHistoricoLotofacilNeon()
  const anterior = concursos[0]?.dezenas ?? null
  const proximoConcurso = concursos[0] ? concursos[0].numero + 1 : null

  const [copied, setCopied] = useState<number | null>(null)
  const [jogoCmp, setJogoCmp] = useState(0)
  const [selecionados, setSelecionados] = useState<Set<number>>(() => new Set())

  const previsao = useMemo(
    () => preverProximasDezenas(concursos, 15, 120, 'equilibrado'),
    [concursos],
  )
  const probs = useMemo(() => probabilidadePremioLotofacil(15), [])

  const enriquecidos = useMemo(() => {
    return jogosGerados.map((jogo, idx) => {
      const afinidade = afinidadeComPrevisao(jogo, previsao.dezenas)
      const score = scoreFiltros(jogo, filtros, anterior)
      const av = avaliarFiltros(jogo, filtros, anterior)
      const retro = resumoRetrospectiva(jogo, concursos, 50)
      return { idx, jogo, afinidade, score, av, retro }
    })
  }, [jogosGerados, previsao.dezenas, filtros, anterior, concursos])

  const melhorAfinidadeIdx = useMemo(() => {
    if (!enriquecidos.length) return -1
    let best = enriquecidos[0]!
    for (const cur of enriquecidos) {
      if (
        cur.afinidade > best.afinidade ||
        (cur.afinidade === best.afinidade && cur.score > best.score)
      ) {
        best = cur
      }
    }
    return best.idx
  }, [enriquecidos])

  const comparativo = useMemo(() => {
    const jogo = jogosGerados[jogoCmp]
    if (!jogo) return []
    return compararComHistorico(jogo, concursos, 15)
  }, [jogosGerados, jogoCmp, concursos])

  if (!jogosGerados.length) {
    return (
      <div className="space-y-4 animate-fade-in">
        <p className="text-zinc-400 text-sm">Nenhum jogo Lotofácil gerado ainda.</p>
        <Link
          to="/lotofacil"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar à seleção
        </Link>
      </div>
    )
  }

  const custo = jogosGerados.length * LF_PRECO_SIMPLES
  const melhor = enriquecidos.find((e) => e.idx === melhorAfinidadeIdx)

  function toggleSel(idx: number) {
    setSelecionados((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  async function salvarEscolhidos() {
    const escolhidos = enriquecidos.filter((e) => selecionados.has(e.idx))
    if (!escolhidos.length) {
      toast.message('Selecione ao menos um jogo para salvar.')
      return
    }
    try {
      await salvar(
        escolhidos.map((e) => ({
          dezenas: e.jogo,
          modo: mode === 'fechamento' ? 'lotofacil-fechamento' : 'lotofacil-filtros',
          concurso_alvo: proximoConcurso,
          afinidade_previsao: e.afinidade,
          score_filtros: e.score,
          perfil_previsao: previsao.perfil,
          previsao_dezenas: previsao.dezenas,
          retrospectiva: e.retro,
        })),
      )
      toast.success(`${escolhidos.length} jogo(s) salvos na nuvem (Neon).`)
      setSelecionados(new Set())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar na Neon.')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <section className="surface-card rounded-2xl p-4 sm:p-5 flex flex-col gap-3 border border-violet-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <Link
              to="/lotofacil"
              className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-300 hover:text-white mb-2"
            >
              <ArrowLeft className="w-4 h-4 text-violet-400" />
              Voltar e editar
            </Link>
            <h1 className="text-lg sm:text-xl font-bold text-white">
              {jogosGerados.length} volante{jogosGerados.length === 1 ? '' : 's'} ·{' '}
              {formatCurrencyBRL(custo)}
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Pool: {selected.map(formatTwoDigits).join(' · ')}
              {proximoConcurso ? ` · alvo conc. ${proximoConcurso}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/lotofacil/historico"
              className="inline-flex items-center gap-2 h-10 px-3 rounded-xl border border-[#262c34] text-xs font-semibold text-zinc-300 hover:text-white"
            >
              <History className="w-4 h-4 text-violet-400" />
              Meu histórico
            </Link>
            <button
              type="button"
              disabled={salvando || selecionados.size === 0}
              onClick={() => void salvarEscolhidos()}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-bold"
            >
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
              Salvar {selecionados.size || ''} escolhido{selecionados.size === 1 ? '' : 's'}
            </button>
          </div>
        </div>
        <p className="text-[11px] text-zinc-500">
          Marque só os jogos que quiser guardar. Critério em destaque:{' '}
          <strong className="text-zinc-300">afinidade com a previsão v{PREVISAO_VERSAO}</strong>.
        </p>
      </section>

      {melhor ? (
        <section className="rounded-2xl p-4 sm:p-5 border border-fuchsia-400/40 bg-gradient-to-br from-fuchsia-950/40 to-violet-950/30 space-y-3 shadow-[0_0_28px_rgba(168,85,247,0.2)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-white inline-flex items-center gap-2">
              <Star className="w-5 h-5 text-fuchsia-300 fill-fuchsia-400/40" />
              Melhor afinidade · Jogo {melhor.idx + 1}
            </h2>
            <span className="text-2xl font-extrabold text-fuchsia-300 tabular-nums">
              {melhor.afinidade}%
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {melhor.jogo.map((n) => {
              const hit = previsao.dezenas.includes(n)
              return (
                <span
                  key={n}
                  className={`w-9 h-9 rounded-xl text-xs font-extrabold flex items-center justify-center ${
                    hit
                      ? 'bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white'
                      : 'bg-[#161a1f] border border-[#262c34] text-zinc-400'
                  }`}
                >
                  {formatTwoDigits(n)}
                </span>
              )
            })}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <Mini label="Afinidade previsão" value={`${melhor.afinidade}%`} />
            <Mini label="Score filtros" value={`${melhor.score}%`} />
            <Mini
              label={`≥11 nos ${melhor.retro.janela} últ.`}
              value={`${melhor.retro.vezesPremio}×`}
            />
            <Mini label="Melhor no histórico" value={`${melhor.retro.melhor} pts`} />
          </div>
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            Chance teórica de 15 pontos (qualquer volante simples):{' '}
            <strong className="text-zinc-300">{formatChance1Em(probs.p15)}</strong>. A afinidade
            mede alinhamento com a heurística — não altera essa probabilidade.
          </p>
          <label className="inline-flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={selecionados.has(melhor.idx)}
              onChange={() => toggleSel(melhor.idx)}
              className="rounded border-zinc-600"
            />
            Incluir este jogo na seleção para salvar
          </label>
        </section>
      ) : null}

      <section className="surface-card rounded-2xl p-4 border border-violet-500/15 space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
          Previsão de referência (próximo concurso)
        </h3>
        <div className="flex flex-wrap gap-1">
          {previsao.dezenas.map((n) => (
            <span
              key={n}
              className="w-7 h-7 rounded-lg bg-fuchsia-950/50 border border-fuchsia-500/30 text-fuchsia-200 text-[11px] font-bold flex items-center justify-center"
            >
              {formatTwoDigits(n)}
            </span>
          ))}
        </div>
        <p className="text-[10px] text-zinc-500">
          P(11) {formatChance1Em(probs.p11)} · P(12) {formatChance1Em(probs.p12)} · P(13){' '}
          {formatChance1Em(probs.p13)} · P(14) {formatChance1Em(probs.p14)} · P(15){' '}
          {formatChance1Em(probs.p15)}
        </p>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {enriquecidos.map(({ idx, jogo, afinidade, score, av, retro }) => {
          const isCopied = copied === idx
          const ativo = jogoCmp === idx
          const isBest = idx === melhorAfinidadeIdx
          const marcado = selecionados.has(idx)
          return (
            <div
              key={idx}
              role="button"
              tabIndex={0}
              onClick={() => setJogoCmp(idx)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setJogoCmp(idx)
              }}
              className={`surface-card rounded-xl p-3.5 border space-y-2.5 cursor-pointer transition-colors ${
                isBest
                  ? 'border-fuchsia-500/50 ring-1 ring-fuchsia-400/30'
                  : ativo
                    ? 'border-violet-500/60 ring-1 ring-violet-400/30'
                    : 'border-[#262c34] hover:border-violet-500/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <label
                  className="inline-flex items-center gap-2 text-xs font-bold text-violet-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={marcado}
                    onChange={() => toggleSel(idx)}
                    className="rounded border-zinc-600"
                  />
                  Jogo {idx + 1}
                  {isBest ? (
                    <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-fuchsia-600/30 text-fuchsia-200">
                      Top afinidade
                    </span>
                  ) : null}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-fuchsia-300">{afinidade}% af.</span>
                  <span className="text-[10px] text-zinc-500">Score {score}%</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      void navigator.clipboard.writeText(formatGameString(jogo))
                      setCopied(idx)
                      setTimeout(() => setCopied(null), 1200)
                    }}
                    className="text-zinc-400 hover:text-white"
                    title="Copiar"
                  >
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {jogo.map((n) => {
                  const hit = previsao.dezenas.includes(n)
                  return (
                    <span
                      key={n}
                      className={`w-7 h-7 rounded-lg text-[11px] font-bold flex items-center justify-center ${
                        hit
                          ? 'bg-violet-600 text-white'
                          : 'bg-violet-950/60 border border-violet-500/30 text-violet-200'
                      }`}
                    >
                      {formatTwoDigits(n)}
                    </span>
                  )
                })}
              </div>
              <div className="text-[10px] text-zinc-500 leading-relaxed">
                Moldura {av.metricas.moldura} · Ímpares {av.metricas.impares} · Soma{' '}
                {av.metricas.soma}
                {anterior ? ` · Rep ${av.metricas.repetidosAnterior}` : ''}
                <span className="block text-zinc-400 mt-1">
                  Histórico: melhor {retro.melhor} · ≥11 em {retro.vezesPremio}/{retro.janela}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {comparativo.length > 0 ? (
        <section className="surface-card rounded-2xl p-4 border border-violet-500/20 space-y-3">
          <h2 className="text-sm font-bold text-white inline-flex items-center gap-2">
            <History className="w-4 h-4 text-violet-400" />
            Jogo {jogoCmp + 1} × últimos {comparativo.length} concursos
          </h2>
          <div className="overflow-x-auto rounded-xl border border-[#262c34]">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#12161b] text-zinc-500">
                  <th className="text-left px-3 py-2">Concurso</th>
                  <th className="text-center px-2 py-2">Acertos</th>
                  <th className="text-left px-3 py-2">Acertadas</th>
                </tr>
              </thead>
              <tbody>
                {comparativo.map((c) => (
                  <tr key={c.numero} className="border-t border-[#262c34]">
                    <td className="px-3 py-2 text-white font-semibold">
                      {c.numero}{' '}
                      <span className="text-zinc-500 font-normal">{c.data}</span>
                    </td>
                    <td className="px-2 py-2 text-center font-bold text-violet-300">{c.acertos}</td>
                    <td className="px-3 py-2 text-zinc-400">
                      {c.dezenasAcertadas.map(formatTwoDigits).join(' · ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#161a1f]/80 border border-[#262c34] px-2.5 py-2">
      <div className="text-[9px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="text-sm font-extrabold text-fuchsia-200 tabular-nums">{value}</div>
    </div>
  )
}
