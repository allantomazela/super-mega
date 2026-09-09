/** Tipos exclusivos do módulo Lotofácil. */

export interface ConcursoLotofacil {
  numero: number
  data: string
  dezenas: number[]
}

export type OrigemConcursosLotofacil = 'api' | 'neon' | 'estatica'

export interface ResultadoCargaLotofacil {
  concursos: ConcursoLotofacil[]
  origem: OrigemConcursosLotofacil
}

export interface ResultadoOficialLotofacil {
  numero: number
  data: string
  dezenas: number[]
  acumulado?: boolean
  estimado?: number | null
}

/** Faixas estatísticas aplicadas aos bilhetes de 15 dezenas. */
export interface FiltrosLotofacil {
  molduraMin: number
  molduraMax: number
  imparesMin: number
  imparesMax: number
  primosMin: number
  primosMax: number
  fibonacciMin: number
  fibonacciMax: number
  somaMin: number
  somaMax: number
  /** Se true, exige 8–10 dezenas do concurso N-1. */
  exigirRepetencia: boolean
  repetenciaMin: number
  repetenciaMax: number
}

export interface MetricasJogoLotofacil {
  moldura: number
  miolo: number
  impares: number
  pares: number
  primos: number
  fibonacci: number
  soma: number
  repetidosAnterior: number
}

export interface AvaliacaoFiltroLotofacil {
  ok: boolean
  metricas: MetricasJogoLotofacil
  motivos: string[]
}

export interface OpcaoFechamentoLotofacil {
  poolSize: number
  ticketSize: number
  targetHits: number
  estimatedTickets: number | null
  precoEstimado: number | null
  safe: boolean
  label: string
}

export const FILTROS_LOTOFACIL_PADRAO: FiltrosLotofacil = {
  molduraMin: 9,
  molduraMax: 11,
  imparesMin: 7,
  imparesMax: 8,
  primosMin: 4,
  primosMax: 6,
  fibonacciMin: 3,
  fibonacciMax: 5,
  somaMin: 175,
  somaMax: 225,
  exigirRepetencia: true,
  repetenciaMin: 8,
  repetenciaMax: 10,
}
