import {
  LF_FECHAMENTO_MAX_POOL,
  LF_FECHAMENTO_SOFT_POOL,
  LF_PRECO_SIMPLES,
  LF_TICKET,
} from '@/modules/lotofacil/utils/math/constants'
import { binomialCoefficient, getCombinations } from '@/modules/lotofacil/utils/math/combinacoes'

export interface CoveringResult {
  tickets: number[][]
  uncoveredRemaining: number
  poolSize: number
  targetHits: number
  ticketSize: number
  truncated: boolean
  message?: string
}

function keyOf(nums: number[]): string {
  return [...nums].sort((a, b) => a - b).join(',')
}

/**
 * Covering guloso com tetos de segurança.
 * Garante (quando completa) que todo subconjunto de `targetHits` do pool
 * está contido em ao menos um bilhete de `ticketSize`.
 *
 * Condicional clássica: se as 15 sorteadas ⊆ pool, e targetHits=14,
 * então algum bilhete acerta ≥14 (na prática a garantia depende do covering).
 */
export function generateCoveringDesign(
  selectedNumbers: number[],
  ticketSize: number = LF_TICKET,
  targetHits: number = 14,
  options: { maxTickets?: number; softLimit?: number } = {},
): CoveringResult {
  const pool = [...new Set(selectedNumbers)].filter((n) => n >= 1 && n <= 25).sort((a, b) => a - b)
  const soft = options.softLimit ?? LF_FECHAMENTO_SOFT_POOL
  const hard = LF_FECHAMENTO_MAX_POOL
  const maxTickets = options.maxTickets ?? 500

  if (pool.length < ticketSize) {
    throw new Error('A quantidade de números selecionados deve ser >= tamanho da aposta.')
  }
  if (targetHits > ticketSize) {
    throw new Error('targetHits não pode ser maior que ticketSize.')
  }
  if (pool.length > hard) {
    return {
      tickets: [],
      uncoveredRemaining: -1,
      poolSize: pool.length,
      targetHits,
      ticketSize,
      truncated: true,
      message: `Pool com ${pool.length} dezenas excede o teto seguro (${hard}). Reduza a seleção.`,
    }
  }

  // Caso degenerado: 1 bilhete = o próprio pool
  if (pool.length === ticketSize) {
    return {
      tickets: [pool],
      uncoveredRemaining: 0,
      poolSize: pool.length,
      targetHits,
      ticketSize,
      truncated: false,
    }
  }

  const subTargets = getCombinations(pool, targetHits)
  const uncovered = new Set(subTargets.map(keyOf))
  const candidateTickets = getCombinations(pool, ticketSize)

  // Pré-computa cobertura de cada bilhete
  const ticketCoverage = candidateTickets.map((ticket) => {
    const coveredSubs = getCombinations(ticket, targetHits).map(keyOf)
    return { ticket, coveredSubs }
  })

  const selectedTickets: number[][] = []
  const used = new Set<number>()

  while (uncovered.size > 0 && selectedTickets.length < maxTickets) {
    let bestIdx = -1
    let bestCount = 0
    for (let i = 0; i < ticketCoverage.length; i++) {
      if (used.has(i)) continue
      let count = 0
      for (const s of ticketCoverage[i]!.coveredSubs) {
        if (uncovered.has(s)) count++
      }
      if (count > bestCount) {
        bestCount = count
        bestIdx = i
      }
    }
    if (bestIdx < 0 || bestCount === 0) break
    used.add(bestIdx)
    const best = ticketCoverage[bestIdx]!
    selectedTickets.push(best.ticket)
    for (const s of best.coveredSubs) uncovered.delete(s)
  }

  const softWarn =
    pool.length > soft
      ? ` Pool ${pool.length} > ${soft}: covering pode gerar muitos volantes.`
      : undefined

  return {
    tickets: selectedTickets.map((t) => [...t].sort((a, b) => a - b)),
    uncoveredRemaining: uncovered.size,
    poolSize: pool.length,
    targetHits,
    ticketSize,
    truncated: uncovered.size > 0 || selectedTickets.length >= maxTickets,
    message: softWarn,
  }
}

export function estimarCustoCovering(poolSize: number, ticketSize = LF_TICKET): number {
  return binomialCoefficient(poolSize, ticketSize) * LF_PRECO_SIMPLES
}

/** Estimativa grosseira do nº de bilhetes do guloso (não é ótimo matemático). */
export function estimarTicketsGuloso(poolSize: number, ticketSize = LF_TICKET, targetHits = 14): number {
  if (poolSize <= ticketSize) return 1
  const need = binomialCoefficient(poolSize, targetHits)
  const perTicket = binomialCoefficient(ticketSize, targetHits)
  // Heurística: covering number ≥ ceil(C(n,t)/C(k,t))
  return Math.max(1, Math.ceil(need / perTicket))
}
