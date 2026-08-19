import React, { useMemo, useRef, useState } from 'react'
import {
  Search,
  Hash,
  Loader2,
  AlertCircle,
  Trophy,
  Target,
  Sparkles,
  CheckCircle2,
  Calendar,
  Eraser,
} from 'lucide-react'
import { formatTwoDigits, formatGameString } from '@/lib/megaEngine'
import { buscarConcursoPorNumero } from '@/data/carregarConcursos'

/* ============================================================
 * ComparacaoConcurso — compara os jogos gerados contra um
 * concurso específico da Mega-Sena (busca por número via API
 * ou 6 dezenas digitadas manualmente).
 *
 * Exibe acertos por jogo, destaca o(s) melhor(es) e resume
 * quantos jogos alcançaram 4, 5 e 6 acertos.
 * ============================================================ */

export interface ConferenciaCallbackPayload {
  /** Dezenas sorteadas usadas na conferência. */
  dezenasSorteadas: number[]
  /** Jogos conferidos com acertos. */
  jogos: { jogo: number[]; acertos: number; acertadas: number[] }[]
}

interface ComparacaoConcursoProps {
  /** Jogos a comparar contra as dezenas do concurso. */
  jogos: number[][]
  /** Título da seção. */
  titulo?: string
  /** Subtítulo da seção. */
  subtitulo?: string
  /** Rótulo do botão de comparar. */
  botaoLabel?: string
  /** Mostra a aba de busca por número de concurso. Padrão: true. */
  permitirBuscaConcurso?: boolean
  /** Callback disparado ao realizar a conferência (para histórico). */
  onConferir?: (payload: ConferenciaCallbackPayload) => void
}

type ModoInput = 'numero' | 'dezenas'

interface ResultadoJogo {
  index: number
  jogo: number[]
  acertos: number
  acertadas: number[]
}

const NUM_DEZENAS = 6

export const ComparacaoConcurso: React.FC<ComparacaoConcursoProps> = ({
  jogos,
  titulo = '🔮 Simular contra Concurso',
  subtitulo,
  botaoLabel = 'Comparar Jogos',
  permitirBuscaConcurso = true,
  onConferir,
}) => {
  const modoInicial: ModoInput = permitirBuscaConcurso ? 'numero' : 'dezenas'
  const [modo, setModo] = useState<ModoInput>(modoInicial)
  const [numeroConcurso, setNumeroConcurso] = useState('')
  const [dezenasDigitadas, setDezenasDigitadas] = useState<string[]>(
    Array.from({ length: NUM_DEZENAS }, () => ''),
  )
  const [buscando, setBuscando] = useState(false)
  const [erroBusca, setErroBusca] = useState<string | null>(null)
  const [dataSorteio, setDataSorteio] = useState<string | null>(null)
  const [dezenasConcurso, setDezenasConcurso] = useState<number[] | null>(null)
  const [resultado, setResultado] = useState<ResultadoJogo[] | null>(null)

  // Refs dos inputs para auto-avanço de foco
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const totalJogos = jogos.length

  const subtituloFinal =
    subtitulo ?? `Compare seus ${totalJogos} jogos contra um concurso específico`

  // Validação das dezenas digitadas
  const validacaoDezenas = useMemo(() => {
    const nums = dezenasDigitadas
      .map((d) => d.trim())
      .filter((d) => d !== '')
      .map((d) => parseInt(d, 10))
    let foraFaixa = false
    let duplicada = false

    for (const n of nums) {
      if (Number.isNaN(n) || n < 1 || n > 60) {
        foraFaixa = true
      }
    }
    const unicas = new Set(nums)
    if (unicas.size !== nums.length) duplicada = true

    return {
      preenchidas: nums.length,
      completas: nums.length === NUM_DEZENAS,
      foraFaixa,
      duplicada,
    }
  }, [dezenasDigitadas])

  const handleBuscarConcurso = async () => {
    const num = parseInt(numeroConcurso.trim(), 10)
    if (!num || num < 1) {
      setErroBusca('Digite um número de concurso válido.')
      return
    }
    setBuscando(true)
    setErroBusca(null)
    setDezenasConcurso(null)
    setDataSorteio(null)
    setResultado(null)

    try {
      const concurso = await buscarConcursoPorNumero(num)
      if (!concurso) {
        setErroBusca(`Concurso ${num} não encontrado.`)
        return
      }
      setDezenasConcurso(concurso.dezenas)
      setDataSorteio(concurso.data)
    } catch {
      setErroBusca('Não foi possível buscar o concurso. Verifique sua conexão.')
    } finally {
      setBuscando(false)
    }
  }

  const handleComparar = () => {
    let alvo: number[] | null = null
    if (modo === 'numero') {
      alvo = dezenasConcurso
    } else {
      if (!validacaoDezenas.completas || validacaoDezenas.foraFaixa || validacaoDezenas.duplicada) {
        return
      }
      alvo = dezenasDigitadas
        .map((d) => parseInt(d.trim(), 10))
        .filter((n) => !Number.isNaN(n))
        .sort((a, b) => a - b)
      setDezenasConcurso(alvo)
      setDataSorteio(null)
    }
    if (!alvo || alvo.length !== NUM_DEZENAS) return

    const setAlvo = new Set(alvo)
    const res: ResultadoJogo[] = jogos.map((jogo, index) => {
      const acertadas = jogo.filter((n) => setAlvo.has(n))
      return { index, jogo, acertos: acertadas.length, acertadas }
    })
    setResultado(res)
    // Dispara callback para histórico de conferências
    if (onConferir) {
      onConferir({
        dezenasSorteadas: [...alvo],
        jogos: res.map((r) => ({
          jogo: r.jogo,
          acertos: r.acertos,
          acertadas: r.acertadas,
        })),
      })
    }
  }

  const podeComparar =
    modo === 'numero'
      ? dezenasConcurso !== null && dezenasConcurso.length === NUM_DEZENAS
      : validacaoDezenas.completas && !validacaoDezenas.foraFaixa && !validacaoDezenas.duplicada

  // Resumo do resultado
  const resumo = useMemo(() => {
    if (!resultado) return null
    const maxAcertos = Math.max(0, ...resultado.map((r) => r.acertos))
    const melhores = resultado.filter((r) => r.acertos === maxAcertos && maxAcertos > 0)
    const comQuatro = resultado.filter((r) => r.acertos === 4).length
    const comCinco = resultado.filter((r) => r.acertos === 5).length
    const comSeis = resultado.filter((r) => r.acertos === 6).length
    const comQuatroMais = resultado.filter((r) => r.acertos >= 4).length
    const nenhumAcerto = resultado.every((r) => r.acertos === 0)
    return {
      maxAcertos,
      melhores,
      comQuatro,
      comCinco,
      comSeis,
      comQuatroMais,
      nenhumAcerto,
    }
  }, [resultado])

  const handleDezenaChange = (idx: number, valor: string) => {
    const limpo = valor.replace(/[^0-9]/g, '').slice(0, 2)
    setDezenasDigitadas((prev) => {
      const next = [...prev]
      next[idx] = limpo
      return next
    })
    // Auto-avanço: ao digitar 2 dígitos, foca o próximo input
    if (limpo.length === 2 && idx < NUM_DEZENAS - 1) {
      const proximo = inputRefs.current[idx + 1]
      if (proximo) {
        setTimeout(() => proximo.focus(), 0)
      }
    }
  }

  const handleDezenaKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Backspace em campo vazio volta ao input anterior
    if (e.key === 'Backspace' && dezenasDigitadas[idx] === '' && idx > 0) {
      const anterior = inputRefs.current[idx - 1]
      if (anterior) {
        e.preventDefault()
        anterior.focus()
      }
    }
    if (e.key === 'Enter' && podeComparar) {
      handleComparar()
    }
  }

  const handleLimparDezenas = () => {
    setDezenasDigitadas(Array.from({ length: NUM_DEZENAS }, () => ''))
    setDezenasConcurso(null)
    setDataSorteio(null)
    setResultado(null)
    setErroBusca(null)
    setNumeroConcurso('')
    const primeiro = inputRefs.current[0]
    if (primeiro) setTimeout(() => primeiro.focus(), 0)
  }

  return (
    <div className="surface-card rounded-2xl p-5 sm:p-6 border border-emerald-500/20 shadow-lg space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2.5 border-b border-[#262c34] pb-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Target className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">{titulo}</h3>
          <p className="text-xs text-zinc-400">{subtituloFinal}</p>
        </div>
      </div>

      {/* Tabs / pills de modo — só se a busca por concurso for permitida */}
      {permitirBuscaConcurso && (
        <div className="flex gap-1.5 p-1 bg-[#12161b] border border-[#262c34] rounded-xl">
          <button
            type="button"
            onClick={() => setModo('numero')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              modo === 'numero'
                ? 'emerald-gradient text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>Buscar por Nº do Concurso</span>
          </button>
          <button
            type="button"
            onClick={() => setModo('dezenas')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              modo === 'dezenas'
                ? 'emerald-gradient text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Digitar Dezenas</span>
          </button>
        </div>
      )}

      {/* Modo número */}
      {permitirBuscaConcurso && modo === 'numero' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="number"
              inputMode="numeric"
              value={numeroConcurso}
              onChange={(e) => setNumeroConcurso(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleBuscarConcurso()
              }}
              placeholder="Ex: 2955"
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#12161b] border border-[#262c34] text-white text-sm font-mono focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
            />
            <button
              type="button"
              onClick={handleBuscarConcurso}
              disabled={buscando}
              className="emerald-gradient text-white font-bold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 emerald-glow hover:translate-y-[-2px] hover:shadow-[0_0_18px_rgba(16,185,129,0.5)] active:scale-[0.98] transition-all shadow-md text-sm disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {buscando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>Buscar</span>
            </button>
            <button
              type="button"
              onClick={handleLimparDezenas}
              className="px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-sm bg-[#1a1f2b] text-zinc-300 border border-[#262c34] hover:text-white hover:border-red-500/50 hover:bg-red-950/30 transition-all"
              title="Limpar campos"
            >
              <Eraser className="w-4 h-4" />
              <span>Limpar</span>
            </button>
          </div>
          {erroBusca && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/30 border border-red-500/30 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{erroBusca}</span>
            </div>
          )}
          {dezenasConcurso && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 space-y-2">
              {dataSorteio && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    Sorteio: <strong className="text-white">{dataSorteio}</strong>
                  </span>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {dezenasConcurso.map((n) => (
                  <span
                    key={n}
                    className="px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold"
                  >
                    {formatTwoDigits(n)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modo dezenas — exibido quando não há busca por concurso OU quando selecionado */}
      {(!permitirBuscaConcurso || modo === 'dezenas') && (
        <div className="space-y-3">
          {/* 6 inputs lado a lado no desktop, empilhados (2 colunas) no mobile */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {dezenasDigitadas.map((d, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el
                }}
                type="text"
                inputMode="numeric"
                value={d}
                onChange={(e) => handleDezenaChange(idx, e.target.value)}
                onKeyDown={(e) => handleDezenaKeyDown(idx, e)}
                placeholder="--"
                maxLength={2}
                aria-label={`Dezena ${idx + 1}`}
                className="w-full px-2 py-2.5 rounded-xl bg-[#12161b] border border-[#262c34] text-white text-center text-sm font-mono font-bold focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
              />
            ))}
          </div>
          {(validacaoDezenas.foraFaixa || validacaoDezenas.duplicada) && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/30 border border-red-500/30 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                {validacaoDezenas.foraFaixa && 'Dezenas devem estar entre 01 e 60. '}
                {validacaoDezenas.duplicada && 'Não pode haver dezenas duplicadas.'}
              </span>
            </div>
          )}
          {validacaoDezenas.completas &&
            !validacaoDezenas.foraFaixa &&
            !validacaoDezenas.duplicada && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-500/30 rounded-lg px-3 py-2">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span>6 dezenas válidas — pronto para comparar.</span>
              </div>
            )}
        </div>
      )}

      {/* Botões: Comparar + Limpar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={handleComparar}
          disabled={!podeComparar}
          className={`flex-1 py-3 px-6 rounded-xl font-bold text-white flex items-center justify-center gap-2.5 transition-all text-sm ${
            podeComparar
              ? 'emerald-gradient emerald-glow hover:translate-y-[-2px] hover:shadow-[0_0_18px_rgba(16,185,129,0.5)] active:scale-[0.98] cursor-pointer'
              : 'bg-[#1a1f2b] text-zinc-500 border border-[#262c34] opacity-60 cursor-not-allowed'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>{botaoLabel}</span>
        </button>
        <button
          type="button"
          onClick={handleLimparDezenas}
          className="px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm bg-[#1a1f2b] text-zinc-300 border border-[#262c34] hover:text-white hover:border-red-500/50 hover:bg-red-950/30 transition-all"
          title="Limpar campos e resultado"
        >
          <Eraser className="w-4 h-4" />
          <span>Limpar</span>
        </button>
      </div>

      {/* Resultado */}
      {resultado && resumo && dezenasConcurso && (
        <div className="space-y-4 animate-fade-in">
          {/* Resumo rápido — X jogos com 4, Y com 5, Z com 6 acertos */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-center">
              <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                4 acertos
              </div>
              <div className="text-xl font-extrabold text-emerald-400">{resumo.comQuatro}</div>
              <div className="text-[10px] text-zinc-500">
                jogo{resumo.comQuatro === 1 ? '' : 's'}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-center">
              <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                5 acertos
              </div>
              <div className="text-xl font-extrabold text-emerald-400">{resumo.comCinco}</div>
              <div className="text-[10px] text-zinc-500">
                jogo{resumo.comCinco === 1 ? '' : 's'}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-center shadow-[0_0_14px_rgba(16,185,129,0.25)]">
              <div className="text-[10px] uppercase tracking-wider text-emerald-200 font-semibold">
                6 acertos
              </div>
              <div className="text-xl font-extrabold text-emerald-300">{resumo.comSeis}</div>
              <div className="text-[10px] text-emerald-200/70">
                jogo{resumo.comSeis === 1 ? '' : 's'}
              </div>
            </div>
          </div>

          {/* Mensagem quando nenhum jogo acertou */}
          {resumo.nenhumAcerto && (
            <div className="flex items-center gap-2 text-xs text-zinc-400 bg-[#161a1f] border border-[#262c34] rounded-lg px-3 py-2.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
              <span>Nenhum jogo acertou as dezenas sorteadas.</span>
            </div>
          )}

          {/* Dezenas do concurso */}
          <div className="rounded-xl border border-[#262c34] bg-[#12161b] p-3">
            <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-2">
              Dezenas comparadas
            </div>
            <div className="flex flex-wrap gap-1.5">
              {dezenasConcurso.map((n) => (
                <span
                  key={n}
                  className="px-2.5 py-1 rounded-md bg-[#1a1f2b] border border-[#262c34] text-zinc-200 font-mono text-xs font-bold"
                >
                  {formatTwoDigits(n)}
                </span>
              ))}
            </div>
          </div>

          {/* Acertos por jogo */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Acertos por Jogo
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {resultado.map((r) => {
                const isMelhor =
                  r.acertos === resumo.maxAcertos && r.acertos > 0 && resumo.maxAcertos > 0
                const isQuatroMais = r.acertos >= 4
                const setAcertadas = new Set(r.acertadas)
                return (
                  <div
                    key={r.index}
                    className={`rounded-xl p-3 border transition-all relative ${
                      isMelhor
                        ? 'bg-emerald-950/30 border-emerald-500/60 shadow-[0_0_18px_rgba(16,185,129,0.3)] animate-pulse'
                        : isQuatroMais
                          ? 'bg-emerald-950/20 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                          : 'bg-[#161a1f] border-[#262c34]'
                    }`}
                  >
                    {/* Badge "Melhor" no bilhete com mais acertos */}
                    {isMelhor && (
                      <span className="absolute -top-2 -right-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold text-white emerald-gradient border border-emerald-300/50 shadow-[0_0_10px_rgba(16,185,129,0.6)] whitespace-nowrap">
                        <Trophy className="w-3 h-3" />
                        Melhor
                      </span>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        Jogo #{String(r.index + 1).padStart(2, '0')}
                      </span>
                      <span
                        className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${
                          r.acertos >= 4
                            ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-400'
                            : r.acertos === 3
                              ? 'bg-amber-950/40 border-amber-500/30 text-amber-400'
                              : 'bg-[#1a1f2b] border-[#262c34] text-zinc-400'
                        }`}
                      >
                        {r.acertos} {r.acertos === 1 ? 'acerto' : 'acertos'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {r.jogo.map((n) => {
                        const acertou = setAcertadas.has(n)
                        return (
                          <span
                            key={n}
                            className={`px-1.5 py-0.5 rounded font-mono text-[11px] font-bold border ${
                              acertou
                                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                                : 'bg-[#1a1f2b] border-[#262c34] text-zinc-500'
                            }`}
                          >
                            {formatTwoDigits(n)}
                          </span>
                        )
                      })}
                    </div>
                    <div className="mt-2 text-[10px] text-zinc-500 font-mono">
                      {formatGameString(r.jogo)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
