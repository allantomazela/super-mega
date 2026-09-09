import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Dices, Grid3x3, Loader2, RotateCcw, Sparkles } from 'lucide-react'
import { useLotofacil } from '@/modules/lotofacil/hooks/LotofacilContext'
import { useLotofacilConcursos } from '@/modules/lotofacil/hooks/useLotofacilConcursos'
import { NumeroGrid } from '@/modules/lotofacil/components/NumeroGrid'
import { FiltrosPainel } from '@/modules/lotofacil/components/FiltrosPainel'
import { UltimoSorteioLotofacil } from '@/modules/lotofacil/components/UltimoSorteioLotofacil'
import { AnaliseHistoricaPainel } from '@/modules/lotofacil/components/AnaliseHistoricaPainel'
import { PrevisaoPainel } from '@/modules/lotofacil/components/PrevisaoPainel'
import { LotofacilGuiaUsabilidade } from '@/modules/lotofacil/components/LotofacilGuiaUsabilidade'
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
import {
  clampQtdJogosLotofacil,
  gerarJogosFiltrados,
  LF_QTD_JOGOS_MAX,
  LF_QTD_JOGOS_MIN,
  LF_QTD_JOGOS_PADRAO,
} from '@/modules/lotofacil/utils/math/gerarJogosFiltrados'

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
    setTargetHits,
    setJogosGerados,
  } = useLotofacil()
  const { concursos, origem, carregando } = useLotofacilConcursos()
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [qtdSurpresa, setQtdSurpresa] = useState(18)
  const [qtdJogos, setQtdJogos] = useState(LF_QTD_JOGOS_PADRAO)

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
        const { jogos, aviso } = gerarJogosFiltrados(selected, filtros, anterior, qtdJogos)
        if (jogos.length === 0) {
          setErro(aviso ?? 'Não foi possível gerar jogos.')
          return
        }
        if (aviso) setErro(aviso)
        setJogosGerados(jogos)
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
        const result = generateCoveringDesign(selected, LF_TICKET, 15)
        setTargetHits(15)
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
            Universo 1–25 · aposta de 15 · alvo de premiação: 15 pontos · histórico:{' '}
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

      <LotofacilGuiaUsabilidade mode={mode} onChangeMode={setMode} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 items-start">
        <section className="lg:col-span-7 space-y-4">
          <div className="surface-card rounded-2xl p-3 sm:p-5 border border-violet-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
              <span className="text-sm font-semibold text-white">
                Dezenas selecionadas:{' '}
                <span className="text-violet-300 tabular-nums">
                  {count}/{LF_MAX_POOL}
                </span>
              </span>
              <span className="text-[11px] text-zinc-500">{statusSelecao}</span>
            </div>
            <p className="text-[11px] text-zinc-500 mb-3 leading-relaxed">
              Dica: selecione 15 para um volante único, ou 16–18 para filtrar/fechar com custo
              controlado. Clique de novo numa dezena para remover.
            </p>
            <NumeroGrid selected={selected} onToggle={toggleNumber} />
          </div>
        </section>

        <aside className="lg:col-span-5 space-y-4">
          {mode === 'filtros' ? (
            <div className="surface-card rounded-2xl p-4 sm:p-5 border border-[#262c34] space-y-4">
              <div>
                <h2 className="text-base font-bold text-white">Filtros estatísticos</h2>
                <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                  As faixas abaixo descrevem o “perfil típico” dos sorteios. O gerador só mantém
                  bilhetes dentro delas e ordena pelo score (0–100). Comece com os valores padrão;
                  se a lista vier vazia, afrouxe um pouco.
                </p>
              </div>
              <FiltrosPainel filtros={filtros} onChange={setFiltros} />
              <label className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-zinc-300">
                <span>
                  Quantidade de jogos
                  <span className="block text-[10px] text-zinc-500 font-normal mt-0.5">
                    Gera os {qtdJogos} melhores scores que passarem nos filtros ({LF_QTD_JOGOS_MIN}–
                    {LF_QTD_JOGOS_MAX}).
                  </span>
                </span>
                <input
                  type="number"
                  min={LF_QTD_JOGOS_MIN}
                  max={LF_QTD_JOGOS_MAX}
                  value={qtdJogos}
                  onChange={(e) => setQtdJogos(clampQtdJogosLotofacil(Number(e.target.value)))}
                  className="h-9 w-24 rounded-lg bg-[#1a1f2b] border border-[#262c34] px-2 text-sm font-bold text-violet-200 tabular-nums"
                />
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[5, 10, 15, 20, 30, 50].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setQtdJogos(n)}
                    className={`h-8 px-2.5 rounded-lg text-[11px] font-bold border ${
                      qtdJogos === n
                        ? 'bg-violet-600 border-violet-400/40 text-white'
                        : 'bg-[#1a1f2b] border-[#262c34] text-zinc-400 hover:text-white'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={gerando || count < LF_TICKET}
                onClick={gerarPorFiltros}
                className="w-full py-3 rounded-xl font-bold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Gerar {qtdJogos} jogo{qtdJogos === 1 ? '' : 's'} filtrado{qtdJogos === 1 ? '' : 's'}
              </button>
            </div>
          ) : (
            <div className="surface-card rounded-2xl p-4 sm:p-5 border border-[#262c34] space-y-4">
              <h2 className="text-base font-bold text-white">Fechamento (covering guloso)</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Alvo fixo: <strong className="text-zinc-200">15 pontos</strong>. Gera volantes de 15
                que cobrem todas as combinações de 15 do seu grupo — se as dezenas sorteadas
                estiverem no pool, algum bilhete acerta os 15 (teto seguro: até {LF_MAX_POOL}{' '}
                dezenas). Preço simples: {formatCurrencyBRL(LF_PRECO_SIMPLES)}.
              </p>
              <div className="flex items-center justify-between text-xs text-zinc-300 rounded-xl border border-violet-500/25 bg-violet-950/20 px-3 py-2">
                <span>Garantia alvo</span>
                <span className="font-extrabold text-violet-200">15 pontos</span>
              </div>
              <button
                type="button"
                disabled={gerando || count < LF_TICKET}
                onClick={gerarFechamento}
                className="w-full py-3 rounded-xl font-bold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Grid3x3 className="w-4 h-4" />}
                Gerar fechamento (15 pontos)
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
