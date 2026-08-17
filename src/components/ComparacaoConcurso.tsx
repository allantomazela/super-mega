import React, { useMemo, useState } from 'react'
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
} from 'lucide-react'
import { formatTwoDigits, formatGameString, getScoreColor } from '@/lib/megaEngine'

/* ============================================================
 * ComparacaoConcurso — compara os jogos gerados contra um
 * concurso específico da Mega-Sena (busca por número via API
 * ou 6 dezenas digitadas manualmente).
 *
 * Exibe acertos por jogo, destaca o(s) melhor(es) e resume
 * quantos jogos alcançaram 4+ acertos.
 * ============================================================ */

interface ComparacaoConcursoProps {
  /** Jogos a comparar contra as dezenas do concurso. */
  jogos: number[][]
}

type ModoInput = 'numero' | 'dezenas'

interface ResultadoJogo {
  index: number
  jogo: number[]
  acertos: number
  acertadas: number[]
}

export const ComparacaoConcurso: React.FC<ComparacaoConcursoProps> = ({ jogos }) => {
  const [modo, setModo] = useState<ModoInput>('numero')
  const [numeroConcurso, setNumeroConcurso] = useState('')
  const [dezenasDigitadas, setDezenasDigitadas] = useState<string[]>(['', '', '', '', '', ''])
  const [buscando, setBuscando] = useState(false)
  const [erroBusca, setErroBusca] = useState<string | null>(null)
  const [dataSorteio, setDataSorteio] = useState<string | null>(null)
  const [dezenasConcurso, setDezenasConcurso] = useState<number[] | null>(null)
  const [resultado, setResultado] = useState<ResultadoJogo[] | null>(null)

  const totalJogos = jogos.length

  // Validação das dezenas digitadas
  const validacaoDezenas = useMemo(() => {
    const nums = dezenasDigitadas
      .map((d) => d.trim())
      .filter((d) => d !== '')
      .map((d) => parseInt(d, 10))
    const erro: string | null = null
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
      completas: nums.length === 6,
      foraFaixa,
      duplicada,
      erro,
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
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 8000)
      const resp = await fetch(`https://loteriascaixa-api.herokuapp.com/api/mega-sena/${num}`, {
        signal: controller.signal,
      })
      clearTimeout(timer)
      if (!resp.ok) {
        setErroBusca(`Concurso ${num} não encontrado (HTTP ${resp.status}).`)
        return
      }
      const dados = await resp.json()
      const dezenas: number[] = (dados.dezenas ?? dados.listaDezenas ?? [])
        .map((d: string) => parseInt(d, 10))
        .filter((n: number) => !Number.isNaN(n))
        .sort((a: number, b: number) => a - b)
      if (dezenas.length !== 6) {
        setErroBusca('O concurso retornado não possui 6 dezenas válidas.')
        return
      }
      setDezenasConcurso(dezenas)
      setDataSorteio(dados.data ? String(dados.data) : null)
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        setErroBusca('Tempo limite excedido ao buscar o concurso. Tente novamente.')
      } else {
        setErroBusca('Não foi possível buscar o concurso. Verifique sua conexão.')
      }
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
    if (!alvo || alvo.length !== 6) return

    const setAlvo = new Set(alvo)
    const res: ResultadoJogo[] = jogos.map((jogo, index) => {
      const acertadas = jogo.filter((n) => setAlvo.has(n))
      return { index, jogo, acertos: acertadas.length, acertadas }
    })
    setResultado(res)
  }

  const podeComparar =
    modo === 'numero'
      ? dezenasConcurso !== null && dezenasConcurso.length === 6
      : validacaoDezenas.completas && !validacaoDezenas.foraFaixa && !validacaoDezenas.duplicada

  // Resumo do resultado
  const resumo = useMemo(() => {
    if (!resultado) return null
    const maxAcertos = Math.max(0, ...resultado.map((r) => r.acertos))
    const melhores = resultado.filter((r) => r.acertos === maxAcertos)
    const comQuatroMais = resultado.filter((r) => r.acertos >= 4).length
    return { maxAcertos, melhores, comQuatroMais }
  }, [resultado])

  const handleDezenaChange = (idx: number, valor: string) => {
    const limpo = valor.replace(/[^0-9]/g, '').slice(0, 2)
    setDezenasDigitadas((prev) => {
      const next = [...prev]
      next[idx] = limpo
      return next
    })
  }

  return (
    <div className="surface-card rounded-2xl p-5 sm:p-6 border border-emerald-500/20 shadow-lg space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2.5 border-b border-[#262c34] pb-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Target className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">
            🔮 Simular contra Concurso
          </h3>
          <p className="text-xs text-zinc-400">
            Compare seus {totalJogos} jogos contra um concurso específico
          </p>
        </div>
      </div>

      {/* Tabs / pills de modo */}
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

      {/* Modo número */}
      {modo === 'numero' && (
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

      {/* Modo dezenas */}
      {modo === 'dezenas' && (
        <div className="space-y-3">
          <div className="flex gap-1.5 flex-wrap">
            {dezenasDigitadas.map((d, idx) => (
              <input
                key={idx}
                type="text"
                inputMode="numeric"
                value={d}
                onChange={(e) => handleDezenaChange(idx, e.target.value)}
                placeholder="--"
                className="w-12 sm:w-14 px-2 py-2.5 rounded-xl bg-[#12161b] border border-[#262c34] text-white text-center text-sm font-mono font-bold focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
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

      {/* Botão comparar */}
      <button
        type="button"
        onClick={handleComparar}
        disabled={!podeComparar}
        className={`w-full py-3 px-6 rounded-xl font-bold text-white flex items-center justify-center gap-2.5 transition-all text-sm ${
          podeComparar
            ? 'emerald-gradient emerald-glow hover:translate-y-[-2px] hover:shadow-[0_0_18px_rgba(16,185,129,0.5)] active:scale-[0.98] cursor-pointer'
            : 'bg-[#1a1f2b] text-zinc-500 border border-[#262c34] opacity-60 cursor-not-allowed'
        }`}
      >
        <Trophy className="w-4 h-4" />
        <span>Comparar Jogos</span>
      </button>

      {/* Resultado */}
      {resultado && resumo && dezenasConcurso && (
        <div className="space-y-4 animate-fade-in">
          {/* Resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                  Melhor resultado
                </div>
                <div className="text-sm font-extrabold text-emerald-400">
                  {resumo.maxAcertos} {resumo.maxAcertos === 1 ? 'acerto' : 'acertos'}{' '}
                  <span className="text-xs font-medium text-zinc-400">
                    (Jogo{resumo.melhores.length > 1 ? 's' : ''}{' '}
                    {resumo.melhores.map((m) => m.index + 1).join(', ')})
                  </span>
                </div>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#161a1f] border border-[#262c34] flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                  Jogos com 4+ acertos
                </div>
                <div className="text-sm font-extrabold text-white">
                  {resumo.comQuatroMais}{' '}
                  <span className="text-xs font-medium text-zinc-400">
                    de {totalJogos} {totalJogos === 1 ? 'jogo' : 'jogos'}
                  </span>
                </div>
              </div>
            </div>
          </div>

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
                const isMelhor = r.acertos === resumo.maxAcertos && r.acertos > 0
                const setAcertadas = new Set(r.acertadas)
                return (
                  <div
                    key={r.index}
                    className={`rounded-xl p-3 border transition-all ${
                      isMelhor
                        ? 'bg-emerald-950/30 border-emerald-500/50 shadow-[0_0_14px_rgba(16,185,129,0.2)]'
                        : 'bg-[#161a1f] border-[#262c34]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        Jogo #{String(r.index + 1).padStart(2, '0')}
                      </span>
                      <span
                        className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${
                          r.acertos >= 4
                            ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-400'
                            : r.acertos >= 2
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
