import type { ConcursoLotofacil } from '@/modules/lotofacil/types'
import { LF_MOLDURA, LF_PRIMOS, LF_TICKET, LF_UNIVERSO } from '@/modules/lotofacil/utils/math/constants'

/** Versão da heurística de sugestão (documentada na UI). */
export const PREVISAO_VERSAO = '2.0' as const

export type PerfilPrevisao = 'equilibrado' | 'quente' | 'fria' | 'recente'

export interface DezenaStats {
  dezena: number
  frequencia: number
  percentual: number
  atraso: number
  ultimaVez: number | null
  /** Aparições nos últimos `recenteJanela` sorteios (0..1). */
  presencaRecente: number
  moldura: boolean
  primo: boolean
}

export interface ResumoPadroes {
  mediaMoldura: number
  mediaImpares: number
  mediaPrimos: number
  mediaSoma: number
  mediaRepetencia: number
  janela: number
}

export interface ComparativoConcurso {
  numero: number
  data: string
  dezenas: number[]
  acertos: number
  dezenasAcertadas: number[]
}

export interface RankingPrevisao {
  dezena: number
  score: number
  componentes: {
    frequencia: number
    atraso: number
    recente: number
  }
}

export interface ResultadoPrevisao {
  versao: typeof PREVISAO_VERSAO
  perfil: PerfilPrevisao
  janela: number
  dezenas: number[]
  ranking: RankingPrevisao[]
}

const PESOS: Record<PerfilPrevisao, { freq: number; atraso: number; recente: number }> = {
  equilibrado: { freq: 0.4, atraso: 0.35, recente: 0.25 },
  quente: { freq: 0.55, atraso: 0.15, recente: 0.3 },
  fria: { freq: 0.2, atraso: 0.55, recente: 0.25 },
  recente: { freq: 0.25, atraso: 0.2, recente: 0.55 },
}

export function calcularFrequencias(
  concursos: ConcursoLotofacil[],
  janela?: number,
  recenteJanela = 10,
): DezenaStats[] {
  const lista = janela && janela > 0 ? concursos.slice(0, janela) : concursos
  const freq = new Array(LF_UNIVERSO + 1).fill(0) as number[]
  const ultimaVez = new Array(LF_UNIVERSO + 1).fill(null) as (number | null)[]
  const recente = new Array(LF_UNIVERSO + 1).fill(0) as number[]

  const janelaRecente = Math.min(recenteJanela, lista.length)

  for (let i = 0; i < lista.length; i++) {
    const c = lista[i]!
    for (const d of c.dezenas) {
      if (d < 1 || d > LF_UNIVERSO) continue
      freq[d]!++
      if (ultimaVez[d] == null) ultimaVez[d] = c.numero
      if (i < janelaRecente) recente[d]!++
    }
  }

  const totalSorteios = Math.max(1, lista.length)
  const maisRecente = lista[0]?.numero ?? 0
  const denomRecente = Math.max(1, janelaRecente)

  return Array.from({ length: LF_UNIVERSO }, (_, i) => {
    const dezena = i + 1
    const uv = ultimaVez[dezena]
    return {
      dezena,
      frequencia: freq[dezena] ?? 0,
      percentual: ((freq[dezena] ?? 0) / totalSorteios) * 100,
      atraso: uv == null ? totalSorteios : Math.max(0, maisRecente - uv),
      ultimaVez: uv,
      presencaRecente: (recente[dezena] ?? 0) / denomRecente,
      moldura: LF_MOLDURA.has(dezena),
      primo: LF_PRIMOS.has(dezena),
    }
  })
}

export function resumoPadroes(concursos: ConcursoLotofacil[], janela = 50): ResumoPadroes {
  const lista = concursos.slice(0, janela)
  if (lista.length === 0) {
    return {
      mediaMoldura: 0,
      mediaImpares: 0,
      mediaPrimos: 0,
      mediaSoma: 0,
      mediaRepetencia: 0,
      janela: 0,
    }
  }

  let moldura = 0
  let impares = 0
  let primos = 0
  let soma = 0
  let repetencia = 0
  let paresRep = 0

  for (let i = 0; i < lista.length; i++) {
    const dez = lista[i]!.dezenas
    let m = 0
    let imp = 0
    let pr = 0
    let s = 0
    for (const n of dez) {
      s += n
      if (n % 2 === 1) imp++
      if (LF_MOLDURA.has(n)) m++
      if (LF_PRIMOS.has(n)) pr++
    }
    moldura += m
    impares += imp
    primos += pr
    soma += s
    if (i + 1 < lista.length) {
      const ant = new Set(lista[i + 1]!.dezenas)
      let rep = 0
      for (const n of dez) if (ant.has(n)) rep++
      repetencia += rep
      paresRep++
    }
  }

  const n = lista.length
  return {
    mediaMoldura: moldura / n,
    mediaImpares: impares / n,
    mediaPrimos: primos / n,
    mediaSoma: soma / n,
    mediaRepetencia: paresRep > 0 ? repetencia / paresRep : 0,
    janela: n,
  }
}

/** Compara um jogo (15 dezenas) com os últimos N concursos. */
export function compararComHistorico(
  jogo: number[],
  concursos: ConcursoLotofacil[],
  limite = 20,
): ComparativoConcurso[] {
  const set = new Set(jogo)
  return concursos.slice(0, limite).map((c) => {
    const dezenasAcertadas = c.dezenas.filter((d) => set.has(d))
    return {
      numero: c.numero,
      data: c.data,
      dezenas: c.dezenas,
      acertos: dezenasAcertadas.length,
      dezenasAcertadas,
    }
  })
}

export function topQuentes(stats: DezenaStats[], qtd = 10): DezenaStats[] {
  return [...stats].sort((a, b) => b.frequencia - a.frequencia || a.dezena - b.dezena).slice(0, qtd)
}

export function topAtrasadas(stats: DezenaStats[], qtd = 10): DezenaStats[] {
  return [...stats].sort((a, b) => b.atraso - a.atraso || a.dezena - b.dezena).slice(0, qtd)
}

/**
 * Score v2: frequência na janela + atraso normalizado + presença recente.
 * Não é oráculo — apenas ranking heurístico para apoio à escolha.
 */
export function scorePrevisaoDezena(
  s: DezenaStats,
  maxFreq: number,
  maxAtraso: number,
  perfil: PerfilPrevisao = 'equilibrado',
): { score: number; componentes: RankingPrevisao['componentes'] } {
  const pesos = PESOS[perfil]
  const frequencia = maxFreq > 0 ? s.frequencia / maxFreq : 0
  const atraso = maxAtraso > 0 ? s.atraso / maxAtraso : 0
  const recente = Math.min(1, s.presencaRecente)
  return {
    score: frequencia * pesos.freq + atraso * pesos.atraso + recente * pesos.recente,
    componentes: { frequencia, atraso, recente },
  }
}

export function preverProximasDezenas(
  concursos: ConcursoLotofacil[],
  qtd = LF_TICKET,
  janela = 120,
  perfil: PerfilPrevisao = 'equilibrado',
): ResultadoPrevisao {
  const janelaEfetiva = Math.min(Math.max(20, janela), Math.max(20, concursos.length))
  const stats = calcularFrequencias(concursos, janelaEfetiva, 12)
  const maxFreq = Math.max(1, ...stats.map((s) => s.frequencia))
  const maxAtraso = Math.max(1, ...stats.map((s) => s.atraso))
  const ranking = stats
    .map((s) => {
      const { score, componentes } = scorePrevisaoDezena(s, maxFreq, maxAtraso, perfil)
      return { dezena: s.dezena, score, componentes }
    })
    .sort((a, b) => b.score - a.score || a.dezena - b.dezena)

  return {
    versao: PREVISAO_VERSAO,
    perfil,
    janela: janelaEfetiva,
    dezenas: ranking
      .slice(0, qtd)
      .map((r) => r.dezena)
      .sort((a, b) => a - b),
    ranking,
  }
}
