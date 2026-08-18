/* ============================================================
 * Modelo de Popularidade (Expected Value Real) — Mega-Sena
 * ============================================================
 * Estima quão "popular" uma combinação seria entre apostadores
 * reais, retornando um fator de popularidade entre 0.5 e 2.0:
 *   - fator > 1.0  → combinação popular (mais provável de dividir prêmio)
 *   - fator < 1.0  → combinação impopular (menos chance de dividir)
 *
 * Heurísticas (cada padrão soma/multiplica um fator):
 *   1. Datas de aniversário (1-31)
 *   2. Sequências óbvias (consecutivos)
 *   3. Padrões de calendário (mesma unidade / dezena)
 *   4. Múltiplos de 5 ou 10
 *   5. Números "da sorte" (7, 13, 3)
 *   6. Padrão horizontal/vertical no volante 6×10
 *
 * O fator final é multiplicativo, clamp [0.5, 2.0].
 * ============================================================ */

import { PRICE_PER_GAME, probExataMegaSena, binomialCoefficient } from './megaEngine'

/** Volante Mega-Sena: 6 colunas × 10 linhas. */
function volanteRow(n: number): number {
  return Math.floor((n - 1) / 6)
}
function volanteCol(n: number): number {
  return (n - 1) % 6
}

/** Conta o maior bloco de consecutivos em um jogo ordenado. */
function maxConsecutiveRun(sorted: number[]): number {
  let best = 1
  let cur = 1
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      cur++
      best = Math.max(best, cur)
    } else {
      cur = 1
    }
  }
  return best
}

/** Conta números terminados em mesma unidade (ex.: 03,13,23...). */
function maxSameUnit(sorted: number[]): number {
  const counts = new Map<number, number>()
  for (const n of sorted) {
    const unit = n % 10
    counts.set(unit, (counts.get(unit) ?? 0) + 1)
  }
  let best = 0
  for (const v of counts.values()) best = Math.max(best, v)
  return best
}

/** Conta múltiplos de 5 e de 10. */
function countMultiples(sorted: number[]): { mult5: number; mult10: number } {
  let mult5 = 0
  let mult10 = 0
  for (const n of sorted) {
    if (n % 10 === 0) {
      mult10++
      mult5++
    } else if (n % 5 === 0) {
      mult5++
    }
  }
  return { mult5, mult10 }
}

/** Detecta padrão horizontal/vertical no volante 6×10 (3+ na linha/col). */
function volanteLinePattern(sorted: number[]): { row: number; col: number } {
  const rowCount = new Map<number, number>()
  const colCount = new Map<number, number>()
  for (const n of sorted) {
    const r = volanteRow(n)
    const c = volanteCol(n)
    rowCount.set(r, (rowCount.get(r) ?? 0) + 1)
    colCount.set(c, (colCount.get(c) ?? 0) + 1)
  }
  let maxRow = 0
  let maxCol = 0
  for (const v of rowCount.values()) maxRow = Math.max(maxRow, v)
  for (const v of colCount.values()) maxCol = Math.max(maxCol, v)
  return { row: maxRow, col: maxCol }
}

export interface PopularityBreakdown {
  /** Fator final de popularidade (0.5 a 2.0). */
  fator: number
  /** Razões textuais (pt-BR) que justificam o fator. */
  razoes: string[]
}

/**
 * Retorna o fator de popularidade e as razões textuais de um jogo.
 */
export function getPopularityBreakdown(jogo: number[]): PopularityBreakdown {
  if (!jogo || jogo.length === 0) return { fator: 1.0, razoes: [] }

  const sorted = [...jogo].sort((a, b) => a - b)
  let fator = 1.0
  const razoes: string[] = []

  // 1. Datas de aniversário (1-31)
  const calendarCount = sorted.filter((n) => n >= 1 && n <= 31).length
  if (calendarCount >= 4) {
    fator *= 1.8
    razoes.push(`${calendarCount} dezenas entre 1-31 (datas de aniversário) ×1.8`)
  } else if (calendarCount === 3) {
    fator *= 1.4
    razoes.push('3 dezenas entre 1-31 (datas) ×1.4')
  } else if (calendarCount === 2) {
    fator *= 1.1
    razoes.push('2 dezenas entre 1-31 (datas) ×1.1')
  }

  // 2. Sequências óbvias
  const maxRun = maxConsecutiveRun(sorted)
  if (maxRun >= 3) {
    fator *= 2.0
    razoes.push(`${maxRun} dezenas consecutivas (sequência óbvia) ×2.0`)
  } else if (maxRun === 2) {
    fator *= 1.3
    razoes.push('Par de consecutivas ×1.3')
  }

  // 3. Padrão de calendário (mesma unidade)
  const maxUnit = maxSameUnit(sorted)
  if (maxUnit >= 4) {
    fator *= 1.6
    razoes.push(`${maxUnit} dezenas com mesma unidade (ex.: 03,13,23...) ×1.6`)
  } else if (maxUnit === 3) {
    fator *= 1.25
    razoes.push('3 dezenas com mesma unidade ×1.25')
  }

  // 4. Múltiplos de 5 ou 10
  const { mult5, mult10 } = countMultiples(sorted)
  if (mult5 >= 3 || mult10 >= 3) {
    fator *= 1.3
    razoes.push(`${mult5} múltiplos de 5/10 ×1.3`)
  }

  // 5. Números "da sorte" (7, 13, 3)
  const luckyNumbers = [7, 13, 3]
  let luckyCount = 0
  for (const ln of luckyNumbers) if (sorted.includes(ln)) luckyCount++
  if (luckyCount > 0) {
    fator *= 1 + 0.05 * luckyCount
    razoes.push(
      `${luckyCount} número(s) "da sorte" (7, 13, 3) ×${(1 + 0.05 * luckyCount).toFixed(2)}`,
    )
  }

  // 6. Padrão horizontal/vertical no volante 6×10
  const { row: maxRow, col: maxCol } = volanteLinePattern(sorted)
  if (maxRow >= 3 || maxCol >= 3) {
    fator *= 1.7
    const tipo = maxRow >= maxCol ? 'horizontal' : 'vertical'
    razoes.push(`Padrão em linha ${tipo} no volante ×1.7`)
  }

  // Clamp final [0.5, 2.0]
  const finalFator = Math.max(0.5, Math.min(2.0, fator))

  if (razoes.length === 0) {
    razoes.push('Combinação sem padrões populares conhecidos (impopular)')
  }

  return { fator: Math.round(finalFator * 100) / 100, razoes }
}

/**
 * Estima o fator de popularidade de um jogo (0.5 a 2.0).
 * Atalho para getPopularityBreakdown(jogo).fator.
 */
export function estimatePopularityFactor(jogo: number[]): number {
  return getPopularityBreakdown(jogo).fator
}

/** Rótulo qualitativo de popularidade para exibição. */
export function popularidadeLabel(fator: number): 'Baixa' | 'Média' | 'Alta' {
  if (fator < 0.85) return 'Baixa'
  if (fator <= 1.15) return 'Média'
  return 'Alta'
}

/** Número médio histórico de vencedores da sena por concurso. */
export const BASE_VENCEDORES_SENA = 0.8

export interface RealEVResult {
  /** Valor esperado real por bilhete (R$). */
  ev: number
  /** Número estimado de vencedores (incluindo você) caso ganhe. */
  expectedWinners: number
  /** Fator de popularidade médio dos jogos. */
  popularidadeMedia: number
  /** Prêmio esperado por bilhete considerando divisão (R$). */
  premioEsperado: number
}

/**
 * Calcula o EV real de um conjunto de jogos considerando a divisão
 * do prêmio com outros vencedores (estimados pela popularidade).
 *
 *   EV = (Premio / (1 + popularidade_media × base_vencedores)) × P(sena) - custo
 *
 * Onde base_vencedores ≈ 0.8 (média histórica da Mega-Sena).
 *
 * @param jogos Conjunto de jogos (cada um com k dezenas)
 * @param premioEstimado Prêmio total estimado da sena (R$)
 */
export function calculateRealEV(jogos: number[][], premioEstimado: number): RealEVResult {
  if (!jogos || jogos.length === 0) {
    return { ev: 0, expectedWinners: 0, popularidadeMedia: 1, premioEsperado: 0 }
  }

  const fatores = jogos.map(estimatePopularityFactor)
  const popularidadeMedia = fatores.reduce((a, b) => a + b, 0) / fatores.length
  const expectedWinners = 1 + popularidadeMedia * BASE_VENCEDORES_SENA

  // Probabilidade de ao menos um jogo acertar a sena (união dos jogos).
  // Como os sorteios da sena por bilhete são aproximadamente independentes
  // (eventos raros), usa-se o complemento do produto.
  let complement = 1
  for (const jogo of jogos) {
    const p = probExataMegaSenaParaJogo(jogo)
    complement *= 1 - p
  }
  const probSena = 1 - complement

  const premioEsperado = (premioEstimado / expectedWinners) * probSena
  const custo = jogos.length * PRICE_PER_GAME
  const ev = premioEsperado - custo

  return {
    ev,
    expectedWinners,
    popularidadeMedia: Math.round(popularidadeMedia * 100) / 100,
    premioEsperado,
  }
}

/**
 * Calcula o EV real de um único jogo (mesma fórmula, isolado).
 */
export function calculateRealEVJogo(
  jogo: number[],
  premioEstimado: number,
): { ev: number; expectedWinners: number; popularidade: number; premioEsperado: number } {
  if (!jogo || jogo.length === 0) {
    return { ev: 0, expectedWinners: 0, popularidade: 1, premioEsperado: 0 }
  }
  const popularidade = estimatePopularityFactor(jogo)
  const expectedWinners = 1 + popularidade * BASE_VENCEDORES_SENA
  const probSena = probExataMegaSenaParaJogo(jogo)
  const premioEsperado = (premioEstimado / expectedWinners) * probSena
  const ev = premioEsperado - PRICE_PER_GAME
  return { ev, expectedWinners, popularidade, premioEsperado }
}

/**
 * Probabilidade de acertar a sena com um jogo de tamanho n.
 * (Para 6 dezenas = probExataMegaSena(6); para jogos de 5 dezenas
 * a sena é impossível, retorna 0.)
 */
function probExataMegaSenaParaJogo(jogo: number[]): number {
  const n = jogo.length
  if (n < 6) return 0
  // Probabilidade de acertar as 6 sorteadas num bilhete de n dezenas:
  //   C(6,6)·C(54, n-6) / C(60, n)
  // = C(54, n-6) / C(60, n)
  if (n === 6) return probExataMegaSena(6)
  // Fórmula geral via hipergeométrica
  const num = binomialCoefficient(54, n - 6)
  const denom = binomialCoefficient(60, n)
  return denom > 0 ? num / denom : 0
}
