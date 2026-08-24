import { useMemo, useState } from 'react'
import { ShieldCheck, Trophy, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { validarJogosContraHistorico } from '@/lib/validacaoHistorica'
import { useConcursos } from '@/hooks/useConcursos'
import {
  AcertoItem,
  CHIP_ATIVO,
  FAIXA_LABEL,
  FILTROS,
  OrigemBadge,
  StatCard,
  type FiltroFaixa,
} from '@/components/ValidacaoHistoricaParts'

interface ValidacaoHistoricaProps {
  /** Jogos gerados para o próximo sorteio. */
  jogos: number[][]
}

const LISTA_INICIAL = 12

/**
 * Conferência de verificação: cruza os jogos atuais com todos os
 * concursos já realizados para mostrar se (e onde) haveria premiação.
 */
export function ValidacaoHistorica({ jogos }: ValidacaoHistoricaProps) {
  const { concursos, origem, carregando } = useConcursos()
  const [aberto, setAberto] = useState(false)
  const [mostrarTodos, setMostrarTodos] = useState(false)
  const [filtroFaixa, setFiltroFaixa] = useState<FiltroFaixa>('todas')

  const resultado = useMemo(() => {
    if (jogos.length === 0 || concursos.length === 0) return null
    return validarJogosContraHistorico(jogos, concursos)
  }, [jogos, concursos])

  const acertosFiltrados = useMemo(() => {
    if (!resultado) return []
    if (filtroFaixa === 'todas') return resultado.acertos
    return resultado.acertos.filter((a) => a.faixa === filtroFaixa)
  }, [resultado, filtroFaixa])

  if (jogos.length === 0) return null

  const acertosVisiveis = mostrarTodos
    ? acertosFiltrados
    : acertosFiltrados.slice(0, LISTA_INICIAL)

  function aplicarFiltro(faixa: FiltroFaixa) {
    setFiltroFaixa(faixa)
    setMostrarTodos(false)
    if (faixa !== 'todas') setAberto(true)
  }

  const contagemFiltro: Record<FiltroFaixa, number> = {
    todas: resultado?.totalPremiacoes ?? 0,
    quadra: resultado?.quadras ?? 0,
    quina: resultado?.quinas ?? 0,
    sena: resultado?.senas ?? 0,
  }

  return (
    <div className="surface-card rounded-2xl p-5 sm:p-6 border border-cyan-500/25 shadow-lg space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[#262c34] pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white tracking-tight">Validação histórica</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Verificação: se estes jogos tivessem sido apostados em cada concurso já realizado, em
              quais sorteios haveria Quadra, Quina ou Sena?
            </p>
          </div>
        </div>

        <OrigemBadge origem={origem} total={concursos.length} carregando={carregando} />
      </div>

      {carregando && !resultado ? (
        <div className="flex items-center justify-center gap-2 py-8 text-zinc-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
          Carregando histórico de concursos…
        </div>
      ) : null}

      {resultado ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard label="Concursos avaliados" value={String(resultado.totalConcursos)} />
            <StatCard
              label="Com premiação"
              value={String(resultado.totalPremiacoes)}
              hint={`${resultado.taxaPremiacao}%`}
              accent
              active={filtroFaixa === 'todas'}
              onClick={() => aplicarFiltro('todas')}
            />
            <StatCard
              label="Quadras"
              value={String(resultado.quadras)}
              color="text-orange-400"
              active={filtroFaixa === 'quadra'}
              onClick={() => aplicarFiltro('quadra')}
            />
            <StatCard
              label="Quinas"
              value={String(resultado.quinas)}
              color="text-amber-400"
              active={filtroFaixa === 'quina'}
              onClick={() => aplicarFiltro('quina')}
            />
            <StatCard
              label="Senas"
              value={String(resultado.senas)}
              color="text-emerald-400"
              active={filtroFaixa === 'sena'}
              onClick={() => aplicarFiltro('sena')}
            />
          </div>

          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Filtrar por faixa de premiação"
          >
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mr-1">
              Filtrar faixa
            </span>
            {FILTROS.map((f) => {
              const ativo = filtroFaixa === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => aplicarFiltro(f.id)}
                  aria-pressed={ativo}
                  className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-[11px] font-bold transition-colors ${
                    ativo
                      ? CHIP_ATIVO[f.id]
                      : 'bg-[#161a1f] border-[#262c34] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                  }`}
                >
                  {f.label}
                  <span className="tabular-nums opacity-80">{contagemFiltro[f.id]}</span>
                </button>
              )
            })}
          </div>

          <p className="text-[11px] text-zinc-400 leading-relaxed bg-[#12161b] border border-[#262c34] rounded-xl px-3.5 py-3">
            <strong className="text-zinc-200">Como funciona:</strong> para cada concurso passado, o
            sistema usa o <em>melhor</em> dos {jogos.length} jogo{jogos.length > 1 ? 's' : ''}{' '}
            gerado{jogos.length > 1 ? 's' : ''} agora. Contagens são exclusivas (Sena não entra como
            Quina). Isso valida o cruzamento com resultados reais —{' '}
            <strong className="text-zinc-300">não garante</strong> o próximo sorteio.
          </p>

          {resultado.totalPremiacoes === 0 ? (
            <div className="rounded-xl border border-[#262c34] bg-[#161a1f] px-4 py-5 text-center text-sm text-zinc-400">
              Nenhum destes jogos teria alcançado Quadra, Quina ou Sena nos{' '}
              {resultado.totalConcursos} concursos avaliados.
            </div>
          ) : (
            <div className="rounded-xl border border-[#262c34] overflow-hidden">
              <button
                type="button"
                onClick={() => setAberto((v) => !v)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-[#161a1f] hover:bg-[#1a1f27] transition-colors text-left"
              >
                <span className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                  <Trophy className="w-3.5 h-3.5 text-cyan-400" />
                  {filtroFaixa === 'todas'
                    ? `Concursos com premiação (${acertosFiltrados.length})`
                    : `${FAIXA_LABEL[filtroFaixa]}s encontradas (${acertosFiltrados.length})`}
                </span>
                {aberto ? (
                  <ChevronUp className="w-4 h-4 text-zinc-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                )}
              </button>

              {aberto ? (
                acertosFiltrados.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-zinc-500">
                    Nenhum concurso nesta faixa com o filtro atual.
                  </div>
                ) : (
                  <ul className="divide-y divide-[#262c34]/80 max-h-[28rem] overflow-y-auto">
                    {acertosVisiveis.map((item) => (
                      <AcertoItem
                        key={`${item.concurso.numero}-${item.jogoIndex}-${item.faixa}`}
                        item={item}
                      />
                    ))}
                  </ul>
                )
              ) : null}

              {aberto && acertosFiltrados.length > LISTA_INICIAL ? (
                <div className="border-t border-[#262c34] px-4 py-2.5 bg-[#12161b]">
                  <button
                    type="button"
                    onClick={() => setMostrarTodos((v) => !v)}
                    className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300"
                  >
                    {mostrarTodos
                      ? 'Mostrar menos'
                      : `Ver todos os ${acertosFiltrados.length} concursos`}
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
