import type {
  AvaliacaoFiltroLotofacil,
  FiltrosLotofacil,
  MetricasJogoLotofacil,
} from '@/modules/lotofacil/types'
import {
  LF_FIBONACCI,
  LF_MIOLO,
  LF_MOLDURA,
  LF_PRIMOS,
} from '@/modules/lotofacil/utils/math/constants'

export function metricasJogo(
  jogo: number[],
  anterior: number[] | null = null,
): MetricasJogoLotofacil {
  let moldura = 0
  let miolo = 0
  let impares = 0
  let primos = 0
  let fibonacci = 0
  let soma = 0
  for (const n of jogo) {
    soma += n
    if (n % 2 === 1) impares++
    if (LF_MOLDURA.has(n)) moldura++
    if (LF_MIOLO.has(n)) miolo++
    if (LF_PRIMOS.has(n)) primos++
    if (LF_FIBONACCI.has(n)) fibonacci++
  }
  const ant = anterior ? new Set(anterior) : null
  let repetidosAnterior = 0
  if (ant) {
    for (const n of jogo) if (ant.has(n)) repetidosAnterior++
  }
  return {
    moldura,
    miolo,
    impares,
    pares: jogo.length - impares,
    primos,
    fibonacci,
    soma,
    repetidosAnterior,
  }
}

export function avaliarFiltros(
  jogo: number[],
  filtros: FiltrosLotofacil,
  anterior: number[] | null = null,
): AvaliacaoFiltroLotofacil {
  const m = metricasJogo(jogo, anterior)
  const motivos: string[] = []

  if (m.moldura < filtros.molduraMin || m.moldura > filtros.molduraMax) {
    motivos.push(`Moldura ${m.moldura} fora de ${filtros.molduraMin}–${filtros.molduraMax}`)
  }
  if (m.impares < filtros.imparesMin || m.impares > filtros.imparesMax) {
    motivos.push(`Ímpares ${m.impares} fora de ${filtros.imparesMin}–${filtros.imparesMax}`)
  }
  if (m.primos < filtros.primosMin || m.primos > filtros.primosMax) {
    motivos.push(`Primos ${m.primos} fora de ${filtros.primosMin}–${filtros.primosMax}`)
  }
  if (m.fibonacci < filtros.fibonacciMin || m.fibonacci > filtros.fibonacciMax) {
    motivos.push(
      `Fibonacci ${m.fibonacci} fora de ${filtros.fibonacciMin}–${filtros.fibonacciMax}`,
    )
  }
  if (m.soma < filtros.somaMin || m.soma > filtros.somaMax) {
    motivos.push(`Soma ${m.soma} fora de ${filtros.somaMin}–${filtros.somaMax}`)
  }
  if (filtros.exigirRepetencia && anterior) {
    if (
      m.repetidosAnterior < filtros.repetenciaMin ||
      m.repetidosAnterior > filtros.repetenciaMax
    ) {
      motivos.push(
        `Repetência ${m.repetidosAnterior} fora de ${filtros.repetenciaMin}–${filtros.repetenciaMax}`,
      )
    }
  }

  return { ok: motivos.length === 0, metricas: m, motivos }
}

/** Score 0–100: quanto mais perto do centro das faixas, melhor. */
export function scoreFiltros(
  jogo: number[],
  filtros: FiltrosLotofacil,
  anterior: number[] | null = null,
): number {
  const m = metricasJogo(jogo, anterior)
  const parts: number[] = []

  function faixa(v: number, min: number, max: number): number {
    if (v < min || v > max) return 0
    const mid = (min + max) / 2
    const half = Math.max(1, (max - min) / 2)
    return Math.max(0, 1 - Math.abs(v - mid) / (half * 2))
  }

  parts.push(faixa(m.moldura, filtros.molduraMin, filtros.molduraMax))
  parts.push(faixa(m.impares, filtros.imparesMin, filtros.imparesMax))
  parts.push(faixa(m.primos, filtros.primosMin, filtros.primosMax))
  parts.push(faixa(m.fibonacci, filtros.fibonacciMin, filtros.fibonacciMax))
  parts.push(faixa(m.soma, filtros.somaMin, filtros.somaMax))
  if (filtros.exigirRepetencia && anterior) {
    parts.push(faixa(m.repetidosAnterior, filtros.repetenciaMin, filtros.repetenciaMax))
  }
  const avg = parts.reduce((a, b) => a + b, 0) / parts.length
  return Math.round(avg * 100)
}
