import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Dices, Filter, Grid3x3, Loader2, RotateCcw, Sparkles } from 'lucide-react'
import { useLotofacil } from '@/modules/lotofacil/hooks/LotofacilContext'
import { useLotofacilConcursos } from '@/modules/lotofacil/hooks/useLotofacilConcursos'
import { NumeroGrid } from '@/modules/lotofacil/components/NumeroGrid'
import { FiltrosPainel } from '@/modules/lotofacil/components/FiltrosPainel'
import { UltimoSorteioLotofacil } from '@/modules/lotofacil/components/UltimoSorteioLotofacil'
import { AnaliseHistoricaPainel } from '@/modules/lotofacil/components/AnaliseHistoricaPainel'
import { PrevisaoPainel } from '@/modules/lotofacil/components/PrevisaoPainel'
import { getCombinations, shuffleInPlace } from '@/modules/lotofacil/utils/math/combinacoes'
import { avaliarFiltros, scoreFiltros } from '@/modules/lotofacil/utils/math/filtros'
import { generateCoveringDesign } from '@/modules/lotofacil/utils/math/fechamentos'
import {
  formatCurrencyBRL,
  precoOficialLotofacil,
} from '@/modules/lotofacil/utils/math/caixaOficial'
import {
  LF_MAX_POOL,
  LF_MIN_POOL,
  LF_PRECO_SIMPLES,
  LF_TICKET,
} from '@/modules/lotofacil/utils/math/constants'
import { binomialCoefficient } from '@/modules/lotofacil/utils/math/combinacoes'

const QTD_JOGOS_FILTRO = 10
const MAX_SAMPLE = 8000

export default function LotofacilIndex() {
  const navigate = useNavigate()
  const {
    selected,
    toggleNumber,
    clearSelection,
    randomSelect,
    applySelection,
    filtros,
    setFiltros,
    mode,
    setMode,
    targetHits,
    setTargetHits,
    setJogosGerados,
  } = useLotofacil()
  const { concursos, origem, carregando } = useLotofacilConcursos()
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [qtdSurpresa, setQtdSurpresa] = useState(18)

  const anterior = concursos[0]?.dezenas ?? null
  const count = selected.length
  const desdobramentoOficial = count >= LF_TICKET ? binomialCoefficient(count, LF_TICKET) : 0
  const precoDesdobramento = count >= LF_TICKET ? precoOficialLotofacil(count) : 0

  const statusSelecao = useMemo(() => {
    if (count < LF_TICKET) return `Selecione ao menos ${LF_TICKET} dezenas (faltam ${LF_TICKET - count}).`
    if (count === LF_TICKET) return '1 volante simples de 15 dezenas.'
    return `Desdobramento oficial: ${desdobramentoOficial} apostas · ${formatCurrencyBRL(precoDesdobramento)}.`
  }, [count, desdobramentoOficial, precoDesdobramento])

  function gerarPorFiltros() {
    setErro(null)
    if (selected.length < LF_TICKET) {
      setErro(`Selecione de ${LF_TICKET} a ${LF_MAX_POOL} dezenas.`)
      return
    }
    setGerando(true)
    window.setTimeout(() => {
      try {
        if (selected.length === LF_TICKET) {
          const av = avaliarFiltros(selected, filtros, anterior)
          setJogosGerados([selected])
          if (!av.ok) setErro(`Jogo único fora das faixas: ${av.motivos.join('; ')}`)
          navigate('/lotofacil/resultados')
          return
        }

        const all = getCombinations(selected, LF_TICKET)
        const sample =
          all.length > MAX_SAMPLE ? shuffleInPlace([...all]).slice(0, MAX_SAMPLE) : all

        const ranqueados = sample
          .map((jogo) => ({
            jogo,
            ok: avaliarFiltros(jogo, filtros, anterior).ok,
            score: scoreFiltros(jogo, filtros, anterior),
          }))
          .filter((x) => x.ok)
          .sort((a, b) => b.score - a.score)

        const escolhidos = ranqueados.slice(0, QTD_JOGOS_FILTRO).map((x) => x.jogo)
        if (escolhidos.length === 0) {
          setErro(
            'Nenhum bilhete de 15 passou nos filtros neste pool. Afrouxe as faixas ou mude as dezenas.',
          )
          return
        }
        setJogosGerados(escolhidos)
        navigate('/lotofacil/resultados')
      } finally {
        setGerando(false)
      }
    }, 30)
  }

  function gerarFechamento() {
    setErro(null)
    if (selected.length < LF_TICKET) {
      setErro(`Selecione de ${LF_TICKET} a ${LF_MAX_POOL} dezenas.`)
      return
    }
    setGerando(true)
    window.setTimeout(() => {
      try {
        const result = generateCoveringDesign(selected, LF_TICKET, targetHits)
        if (result.tickets.length === 0) {
          setErro(result.message ?? 'Não foi possível gerar o fechamento.')
          return
        }
        if (result.message) setErro(result.message)
        setJogosGerados(result.tickets)
        navigate('/lotofacil/resultados')
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao gerar fechamento.')
      } finally {
        setGerando(false)
      }
    }, 30)
  }

  return (
    <div className="space-y-5 sm:space-y-8 animate-fade-in">
      <UltimoSorteioLotofacil />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#262c34] pb-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-white tracking-tight">
            Lotofácil — Monte seu grupo
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Universo 1–25 · aposta de 15 dezenas · histórico:{' '}
            {carregando ? 'carregando…' : `${concursos.length} concursos (${origem})`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/lotofacil/historico"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-violet-500/30 text-xs font-semibold text-violet-300 hover:text-white hover:border-violet-400/50"
          >
            Meu histórico
          </Link>
          <label className="flex items-center gap-1.5 text-xs text-zinc-400">
            Surpresa
            <select
              value={qtdSurpresa}
              onChange={(e) => setQtdSurpresa(Number(e.target.value))}
              className="h-8 rounded-lg bg-[#1a1f2b] border border-[#262c34] text-xs text-zinc-200 px-2"
            >
              {Array.from({ length: LF_MAX_POOL - LF_MIN_POOL + 1 }, (_, i) => i + LF_MIN_POOL).map(
                (n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ),
              )}
            </select>
          </label>
          <button
            type="button"
            onClick={() => randomSelect(qtdSurpresa)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1f2b] border border-[#262c34] text-xs text-zinc-300 hover:text-white hover:border-violet-500/40"
          >
            <Dices className="w-3.5 h-3.5 text-violet-400" />
            Gerar aleatórias
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-500/40 text-xs font-semibold text-red-300"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Resetar
          </button>
        </div>
      </div>

      <div className="surface-card rounded-2xl p-2 grid grid-cols-2 gap-2 max-w-md">
        <button
          type="button"
          onClick={() => setMode('filtros')}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-sm font-bold ${
            mode === 'filtros'
              ? 'bg-violet-600 text-white border border-violet-300/40'
              : 'bg-[#1a1f2b] border border-[#262c34] text-zinc-300'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filtros + jogos
        </button>
        <button
          type="button"
          onClick={() => setMode('fechamento')}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-sm font-bold ${
            mode === 'fechamento'
              ? 'bg-violet-600 text-white border border-violet-300/40'
              : 'bg-[#1a1f2b] border border-[#262c34] text-zinc-300'
          }`}
        >
          <Grid3x3 className="w-4 h-4" />
          Fechamento
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 items-start">
        <section className="lg:col-span-7 space-y-4">
          <div className="surface-card rounded-2xl p-3 sm:p-5 border border-violet-500/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-white">
                Dezenas selecionadas:{' '}
                <span className="text-violet-300 tabular-nums">
                  {count}/{LF_MAX_POOL}
                </span>
              </span>
              <span className="text-[11px] text-zinc-500">{statusSelecao}</span>
            </div>
            <NumeroGrid selected={selected} onToggle={toggleNumber} />
          </div>
        </section>

        <aside className="lg:col-span-5 space-y-4">
          {mode === 'filtros' ? (
            <div className="surface-card rounded-2xl p-4 sm:p-5 border border-[#262c34] space-y-4">
              <h2 className="text-base font-bold text-white">Filtros estatísticos</h2>
              <FiltrosPainel filtros={filtros} onChange={setFiltros} />
              <button
                type="button"
                disabled={gerando || count < LF_TICKET}
                onClick={gerarPorFiltros}
                className="w-full py-3 rounded-xl font-bold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Gerar até {QTD_JOGOS_FILTRO} jogos filtrados
              </button>
            </div>
          ) : (
            <div className="surface-card rounded-2xl p-4 sm:p-5 border border-[#262c34] space-y-4">
              <h2 className="text-base font-bold text-white">Fechamento (covering guloso)</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Gera o menor conjunto possível de volantes de 15 que cobre todos os subconjuntos de{' '}
                {targetHits} pontos do seu grupo (teto seguro: até {LF_MAX_POOL} dezenas). Preço
                simples: {formatCurrencyBRL(LF_PRECO_SIMPLES)}.
              </p>
              <label className="flex items-center justify-between text-xs text-zinc-300">
                Garantia alvo (pontos)
                <select
                  value={targetHits}
                  onChange={(e) => setTargetHits(Number(e.target.value))}
                  className="h-8 rounded-lg bg-[#1a1f2b] border border-[#262c34] px-2"
                >
                  {[11, 12, 13, 14].map((n) => (
                    <option key={n} value={n}>
                      {n} pontos
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={gerando || count < LF_TICKET}
                onClick={gerarFechamento}
                className="w-full py-3 rounded-xl font-bold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Grid3x3 className="w-4 h-4" />}
                Gerar fechamento
              </button>
            </div>
          )}

          {erro ? (
            <p className="text-xs text-amber-300 bg-amber-950/30 border border-amber-500/30 rounded-xl px-3 py-2">
              {erro}
            </p>
          ) : null}

          <Link
            to="/lotofacil/resultados"
            className="block text-center text-xs text-violet-300 hover:text-violet-200"
          >
            Ir para resultados (se já houver jogos gerados)
          </Link>
        </aside>
      </div>

      <PrevisaoPainel
        concursos={concursos}
        filtros={filtros}
        onAplicar={(dezenas) => applySelection(dezenas)}
      />
      <AnaliseHistoricaPainel
        concursos={concursos}
        selected={selected}
        onToggleDezena={toggleNumber}
      />
    </div>
  )
}
