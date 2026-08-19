/* ============================================================
 * Otimizador Estratégico Mega-Sena — Motor Probabilístico v3
 * ============================================================
 * Inclui:
 *   - Filtros combinatórios (paridade, soma, EV, sequência)
 *   - Schönheim bound + eficiência de cobertura
 *   - Score v3 (6 critérios: paridade, uniformidade, gaps, soma,
 *     entropia, anti-popularidade)
 *   - Probabilidades hipergeométricas exatas
 *   - Cobertura combinada (Bonferroni 2ª ordem)
 *   - Modo 5 Jogos / desdobramento / EV
 * ============================================================ */

export interface FilterOptions {
  parity: boolean
  sum: boolean
  expectedValue: boolean
  sequence: boolean
}

export const DEFAULT_FILTERS: FilterOptions = {
  parity: true,
  sum: true,
  expectedValue: true,
  sequence: true,
}

export const PRICE_PER_GAME = 6.0

// Import do modelo de popularidade (dependência circular segura em ESM:
// as funções só são invocadas em runtime, nunca na avaliação do módulo).
import {
  estimatePopularityFactor,
  popularidadeLabel,
  calculateRealEVJogo,
} from './popularityModel'

/* ============================================================
 * Limite Inferior de Schönheim — Covering Designs
 * ============================================================
 * Para um (v, k, t) covering design (v dezenas, blocos de tamanho k,
 * cobertura t), o limite inferior de Schönheim fornece o número
 * MÍNIMO teórico de bilhetes para garantir cobertura total t:
 *
 *   L(v, k, t) ≥ ⌈(v/k) · L(v-1, k-1, t-1)⌉
 *
 * Casos base:
 *   L(v, k, 1) = ⌈v/k⌉
 *   L(v, k, k) = C(v, k)   (cobertura total de k-acertos)
 *
 * Referência: Schönheim (1964).
 * ============================================================ */

/**
 * Calcula o limite inferior de Schönheim L(v, k, t) — número mínimo
 * teórico de bilhetes para garantir cobertura t num (v,k,t) design.
 *
 * @param v total de dezenas do universo
 * @param k tamanho de cada bilhete
 * @param t alvo de cobertura (ex.: 2 = garantir todos os pares)
 */
export function schonheimBound(v: number, k: number, t: number): number {
  if (v <= 0 || k <= 0 || t <= 0) return 0
  if (t > k) return 0
  if (t > v) return 0
  // Caso base: L(v, k, 1) = ⌈v/k⌉
  if (t === 1) return Math.ceil(v / k)
  // Caso base: L(v, k, k) = C(v, k)
  if (t === k) return binomialCoefficient(v, k)
  // Recursão: ⌈(v/k) · L(v-1, k-1, t-1)⌉
  const sub = schonheimBound(v - 1, k - 1, t - 1)
  return Math.ceil((v / k) * sub)
}

/**
 * Eficiência de cobertura: razão entre o limite teórico de Schönheim
 * e o número de bilhetes usados (%).
 *
 *   eficiência = schonheimBound / ticketCount × 100
 *
 * Ex.: Schönheim = 15, bilhetes usados = 5 → eficiência 33%.
 * Quanto maior a %, melhor a eficiência (menos bilhetes que o mínimo).
 *
 * @param selectedCount nº de dezenas do universo (v)
 * @param ticketCount nº de bilhetes usados
 * @param ticketSize tamanho de cada bilhete (k)
 * @param targetHits alvo de cobertura (t)
 */
export function coverageEfficiency(
  selectedCount: number,
  ticketCount: number,
  ticketSize: number,
  targetHits: number,
): number {
  if (ticketCount <= 0) return 0
  const bound = schonheimBound(selectedCount, ticketSize, targetHits)
  if (bound <= 0) return 0
  const eff = (bound / ticketCount) * 100
  return Math.round(eff * 10) / 10
}

/* ============================================================
 * Coeficiente Binomial — C(n, k)
 * ============================================================
 * Algoritmo multiplicativo: evita overflow de fatoriais e é
 * numericamente estável para os cálculos hipergeométricos da
 * Mega-Sena (N=60). Retorna o valor exato como Number (preciso
 * até 2^53, suficiente para C(60,30)).
 * ============================================================ */
export function binomialCoefficient(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  if (k === 0 || k === n) return 1
  // Simetria: C(n,k) == C(n, n-k)
  const kk = Math.min(k, n - k)
  let result = 1
  for (let i = 1; i <= kk; i++) {
    // result = result * (n - kk + i) / i
    // Multiplica antes e divide a cada passo mantendo inteiro
    result = (result * (n - kk + i)) / i
  }
  return Math.round(result)
}

/* ============================================================
 * Motor Probabilístico Avançado (nível mundial) — v3
 * ============================================================
 * Score de 0–100 baseado em 6 critérios rigorosos (cada 0–20):
 *   A) Distribuição Hipergeométrica Multivariada (Paridade)
 *   B) Teste de Kolmogorov-Smirnov para Uniformidade
 *   C) Análise de Gaps e Autocorrelação (CV dos gaps)
 *   D) Soma com Distribuição Normal (Z-score, gaussiana)
 *   E) Entropia de Shannon + Informação Mútua (6 décadas)
 *   F) Anti-Popularidade (modelo de EV real / divisão de prêmio)
 *
 * Combinação ponderada (v3):
 *   0.20·A + 0.20·B + 0.18·C + 0.16·D + 0.16·E + 0.10·F
 * normalizado para 0–100 com precisão de 1 casa decimal.
 * ============================================================ */

export interface ScoreBreakdown {
  /** Score total (0-100), 1 casa decimal. */
  total: number
  /** A) Pontuação da paridade / hipergeométrica (0-20). */
  paridade: number
  /** B) Pontuação da uniformidade / KS (0-20). */
  uniformidade: number
  /** C) Pontuação dos gaps / autocorrelação (0-20). */
  gaps: number
  /** D) Pontuação da soma / normal (0-20). */
  soma: number
  /** E) Pontuação da entropia / décadas (0-20). */
  entropia: number
  /** F) Pontuação anti-popularidade (0-20). Combinações impopulares ganham mais. */
  antiPopularidade: number
}

/** Estatísticas da paridade (para exibição). */
export interface ParidadeStats {
  pares: number
  impares: number
  pValue: number
}

/** Constantes do modelo probabilístico (Mega-Sena: N=60). */
const MS_N = 60
const MS_EVEN = 30 // nº de pares em [1,60]
const MS_ODD = 30 // nº de ímpares em [1,60]

/** Pesos de combinação do score final (A..F) — v3 com Anti-Popularidade. */
const SCORE_WEIGHTS = {
  paridade: 0.2, // A
  uniformidade: 0.2, // B
  gaps: 0.18, // C
  soma: 0.16, // D
  entropia: 0.16, // E
  antiPopularidade: 0.1, // F
} as const

/** Clamp utilitário. */
function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x))
}

/* ------------------------------------------------------------
 * A) Distribuição Hipergeométrica Multivariada — Paridade (0-20)
 * ------------------------------------------------------------ */
function hypergeometricParityScore(game: number[]): {
  score: number
  pares: number
  pObs: number
  pExp: number
} {
  const n = game.length
  if (n === 0) return { score: 0, pares: 0, pObs: 0, pExp: 0 }
  const pares = game.filter((x) => x % 2 === 0).length
  const impares = n - pares

  const denom = binomialCoefficient(MS_N, n)
  if (denom === 0) return { score: 0, pares, pObs: 0, pExp: 0 }

  const numObs = binomialCoefficient(MS_EVEN, pares) * binomialCoefficient(MS_ODD, impares)
  const pObs = numObs / denom

  const pStar = Math.max(0, Math.min(n, Math.round(n / 2)))
  const numExp = binomialCoefficient(MS_EVEN, pStar) * binomialCoefficient(MS_ODD, n - pStar)
  const pExp = numExp / denom

  let score: number
  if (pExp > 0) {
    const rel = Math.abs(pObs - pExp) / pExp
    score = 20 * (1 - rel)
  } else {
    const dev = Math.abs(pares - n / 2) / (n / 2 || 1)
    score = 20 * (1 - dev)
  }
  return { score: clamp(score, 0, 20), pares, pObs, pExp }
}

/* ------------------------------------------------------------
 * B) Kolmogorov-Smirnov para Uniformidade (0-20)
 * ------------------------------------------------------------ */
function ksUniformityScore(game: number[]): { score: number; d: number } {
  const n = game.length
  if (n === 0) return { score: 0, d: 1 }
  const sorted = [...game].sort((a, b) => a - b)

  let dMax = 0
  for (let i = 0; i < n; i++) {
    const x = sorted[i]
    const fExp = x / MS_N
    const fObsUpper = (i + 1) / n
    const fObsLower = i / n
    dMax = Math.max(dMax, Math.abs(fObsUpper - fExp), Math.abs(fObsLower - fExp))
  }
  const d = clamp(dMax, 0, 1)
  const score = 20 * (1 - d)
  return { score: clamp(score, 0, 20), d }
}

/* ------------------------------------------------------------
 * C) Análise de Gaps e Autocorrelação (0-20)
 * ------------------------------------------------------------ */
function gapsAutocorrScore(game: number[]): { score: number; cv: number } {
  const n = game.length
  if (n < 2) return { score: 0, cv: 0 }
  const sorted = [...game].sort((a, b) => a - b)
  const gaps: number[] = []
  for (let i = 1; i < n; i++) gaps.push(sorted[i] - sorted[i - 1])

  const m = gaps.length
  const meanGap = gaps.reduce((acc, g) => acc + g, 0) / m
  if (meanGap <= 0) return { score: 0, cv: 0 }

  const variance = gaps.reduce((acc, g) => acc + (g - meanGap) * (g - meanGap), 0) / m
  const stdGap = Math.sqrt(variance)
  const cv = stdGap / meanGap

  const ideal = 0.5
  const dev = Math.abs(cv - ideal)
  const cvScore = Math.exp(-(dev * dev) / (2 * 0.45 * 0.45))

  const allEqual = gaps.every((g) => g === gaps[0])
  const equalPenalty = allEqual ? 0.4 : 1.0

  let autocov = 0
  for (let i = 0; i < m - 1; i++) {
    autocov += (gaps[i] - meanGap) * (gaps[i + 1] - meanGap)
  }
  autocov = m > 1 ? autocov / (m - 1) : 0
  const autocorr = variance > 0 ? autocov / variance : 0
  const autocorrPenalty = 1 - Math.min(0.5, Math.abs(autocorr))

  const score = 20 * cvScore * equalPenalty * autocorrPenalty
  return { score: clamp(score, 0, 20), cv }
}

/* ------------------------------------------------------------
 * D) Soma com Distribuição Normal (0-20)
 * ------------------------------------------------------------ */
function sumNormalScore(game: number[]): { score: number; z: number } {
  const n = game.length
  if (n === 0) return { score: 0, z: 0 }
  const sum = game.reduce((acc, x) => acc + x, 0)
  const mu = n * 30.5
  const sigma = Math.sqrt((n * (MS_N * MS_N - 1)) / 12)
  if (sigma === 0) return { score: 20, z: 0 }
  const z = Math.abs(sum - mu) / sigma
  const score = 20 * Math.exp(-0.5 * z * z)
  return { score: clamp(score, 0, 20), z }
}

/* ------------------------------------------------------------
 * E) Entropia de Shannon + Informação Mútua (0-20)
 * ------------------------------------------------------------ */
function shannonEntropyScore(game: number[]): { score: number; h: number } {
  const n = game.length
  if (n === 0) return { score: 0, h: 0 }
  const decades = new Array(6).fill(0)
  game.forEach((num) => {
    const idx = Math.min(Math.floor((num - 1) / 10), 5)
    decades[idx] += 1
  })

  let h = 0
  decades.forEach((c) => {
    if (c > 0) {
      const pi = c / n
      h -= pi * Math.log(pi)
    }
  })
  const hmax = Math.log(6)
  const hNorm = hmax > 0 ? h / hmax : 0

  const base = 14 * hNorm

  const expected = n / 6
  const maxDev = Math.max(...decades.map((c) => Math.abs(c - expected)))
  const maxDevRel = expected > 0 ? maxDev / expected : 1
  const bonus = 6 * Math.exp(-(maxDevRel * maxDevRel) / (2 * 0.5 * 0.5))

  const score = base + bonus
  return { score: clamp(score, 0, 20), h: hNorm }
}

/* ------------------------------------------------------------
 * F) Anti-Popularidade (0-20) — critério v3
 * ------------------------------------------------------------
 * Combinações impopulares (menos prováveis de dividir prêmio) ganham
 * mais pontos. Baseado no fator de popularidade (0.5 a 2.0):
 *   score = 20 × (2 - popularityFactor) / 1.5
 *   popularityFactor = 2.0 → score 0    (muito popular)
 *   popularityFactor = 1.0 → score 13.3 (neutro)
 *   popularityFactor = 0.5 → score 20   (muito impopular)
 * ------------------------------------------------------------ */
function antiPopularidadeScore(jogo: number[]): number {
  const fator = estimatePopularityFactor(jogo)
  const score = (20 * (2 - fator)) / 1.5
  return clamp(score, 0, 20)
}

/**
 * Calcula o Score Probabilístico Avançado (computeScoreV2) de um jogo,
 * com breakdown detalhado dos 5 critérios originais (cada 0-20).
 * Mantido para compatibilidade — não inclui o critério F (anti-popularidade).
 *
 * @param jogo Dezenas do jogo
 * @param _historicoFrequencias Opcional (mantido para compat. de assinatura).
 */
export function computeScoreV2(
  jogo: number[],
  _historicoFrequencias?: Map<number, number>,
): ScoreBreakdown {
  if (!jogo || jogo.length === 0) {
    return {
      total: 0,
      paridade: 0,
      uniformidade: 0,
      gaps: 0,
      soma: 0,
      entropia: 0,
      antiPopularidade: 0,
    }
  }
  const paridade = hypergeometricParityScore(jogo).score
  const uniformidade = ksUniformityScore(jogo).score
  const gaps = gapsAutocorrScore(jogo).score
  const soma = sumNormalScore(jogo).score
  const entropia = shannonEntropyScore(jogo).score

  // Pesos v2 (sem antiPopularidade)
  const weighted =
    paridade * 0.22 + uniformidade * 0.22 + gaps * 0.2 + soma * 0.18 + entropia * 0.18
  const total = Math.round(clamp(weighted * 5, 0, 100) * 10) / 10

  return {
    total,
    paridade,
    uniformidade,
    gaps,
    soma,
    entropia,
    antiPopularidade: 0,
  }
}

/**
 * Calcula o Score Probabilístico Avançado v3 (computeScoreV3) —
 * inclui o 6º critério "Anti-Popularidade".
 *
 * Combinação ponderada (v3):
 *   0.20·A + 0.20·B + 0.18·C + 0.16·D + 0.16·E + 0.10·F
 *
 * @param jogo Dezenas do jogo
 */
export function computeScoreV3(jogo: number[]): ScoreBreakdown {
  if (!jogo || jogo.length === 0) {
    return {
      total: 0,
      paridade: 0,
      uniformidade: 0,
      gaps: 0,
      soma: 0,
      entropia: 0,
      antiPopularidade: 0,
    }
  }
  const paridade = hypergeometricParityScore(jogo).score
  const uniformidade = ksUniformityScore(jogo).score
  const gaps = gapsAutocorrScore(jogo).score
  const soma = sumNormalScore(jogo).score
  const entropia = shannonEntropyScore(jogo).score
  const antiPopularidade = antiPopularidadeScore(jogo)

  const weighted =
    paridade * SCORE_WEIGHTS.paridade +
    uniformidade * SCORE_WEIGHTS.uniformidade +
    gaps * SCORE_WEIGHTS.gaps +
    soma * SCORE_WEIGHTS.soma +
    entropia * SCORE_WEIGHTS.entropia +
    antiPopularidade * SCORE_WEIGHTS.antiPopularidade
  const total = Math.round(clamp(weighted * 5, 0, 100) * 10) / 10

  return {
    total,
    paridade,
    uniformidade,
    gaps,
    soma,
    entropia,
    antiPopularidade,
  }
}

/**
 * Formata o breakdown do score para exibição em tooltip.
 * Inclui o critério F (Anti-Popularidade).
 */
export function formatScoreBreakdown(b: ScoreBreakdown): string {
  const f = (x: number) => x.toFixed(1)
  return `Paridade: ${f(b.paridade)} | Uniformidade: ${f(b.uniformidade)} | Gaps: ${f(b.gaps)} | Soma: ${f(b.soma)} | Entropia: ${f(b.entropia)} | Anti-Pop: ${f(b.antiPopularidade)}`
}

/**
 * Estatísticas de paridade para exibição (pares, ímpares, p-value).
 */
export function paridadeStats(jogo: number[]): ParidadeStats {
  const n = jogo.length
  const pares = jogo.filter((x) => x % 2 === 0).length
  const { pObs, pExp } = hypergeometricParityScore(jogo)
  const pValue = pExp > 0 ? clamp(1 - Math.abs(pObs - pExp) / pExp, 0, 1) : 1
  return { pares, impares: n - pares, pValue }
}

/**
 * Calcula estatísticas de soma para exibição (z-score).
 */
export function somaStats(jogo: number[]): { z: number; media: number; soma: number } {
  const n = jogo.length
  if (n === 0) return { z: 0, media: 0, soma: 0 }
  const soma = jogo.reduce((acc, x) => acc + x, 0)
  const media = n * 30.5
  const sigma = Math.sqrt((n * (MS_N * MS_N - 1)) / 12)
  const z = sigma > 0 ? (soma - media) / sigma : 0
  return { z, media, soma }
}

/* ============================================================
 * Premiação média Mega-Sena (valores atualizados 2025)
 * ============================================================ */
export const PRIZE_QUADRA = 1000
export const PRIZE_QUINA = 50000
export const PRIZE_SENA = 5000000

/**
 * Generates all combinations of k items from array arr.
 * Returns sorted combinations (each game sorted ascending).
 */
export function generateCombinations(arr: number[], k: number = 6): number[][] {
  const sorted = [...arr].sort((a, b) => a - b)
  const results: number[][] = []

  function backtrack(startIndex: number, current: number[]) {
    if (current.length === k) {
      results.push([...current])
      return
    }
    const needed = k - current.length
    const available = sorted.length - startIndex
    if (available < needed) return

    for (let i = startIndex; i < sorted.length; i++) {
      current.push(sorted[i])
      backtrack(i + 1, current)
      current.pop()
    }
  }

  backtrack(0, [])
  return results
}

/** Filter 1: Parity — keep games with 2, 3, or 4 even numbers. */
export function passesParityFilter(game: number[]): boolean {
  const evenCount = game.filter((n) => n % 2 === 0).length
  return evenCount >= 2 && evenCount <= 4
}

/** Filter 2: Sum — eliminate games where sum < 120 or sum > 240. */
export function passesSumFilter(game: number[]): boolean {
  const sum = game.reduce((acc, curr) => acc + curr, 0)
  return sum >= 120 && sum <= 240
}

/** Filter 3: Expected Value (datas) — eliminate 4+ numbers between 1-31. */
export function passesExpectedValueFilter(game: number[]): boolean {
  const calendarNumbersCount = game.filter((n) => n >= 1 && n <= 31).length
  return calendarNumbersCount < 4
}

/** Filter 4: Sequence — eliminate 3+ pure consecutive numbers. */
export function passesSequenceFilter(game: number[]): boolean {
  for (let i = 0; i <= game.length - 3; i++) {
    if (game[i + 1] === game[i] + 1 && game[i + 2] === game[i] + 2) {
      return false
    }
  }
  return true
}

/** Apply all enabled filters in sequence. */
export function applyFilters(combinations: number[][], filters: FilterOptions): number[][] {
  return combinations.filter((game) => {
    if (filters.parity && !passesParityFilter(game)) return false
    if (filters.sum && !passesSumFilter(game)) return false
    if (filters.expectedValue && !passesExpectedValueFilter(game)) return false
    if (filters.sequence && !passesSequenceFilter(game)) return false
    return true
  })
}

/** Format number with leading zero (e.g. 3 -> "03"). */
export function formatTwoDigits(num: number): string {
  return num < 10 ? `0${num}` : `${num}`
}

/** Format game numbers as "03 - 15 - 22 - 27 - 34 - 41". */
export function formatGameString(game: number[]): string {
  return game.map(formatTwoDigits).join(' - ')
}

/** Format currency in BRL (R$ 1.500,00). */
export function formatCurrencyBRL(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val)
}

/** Format integer numbers in pt-BR (e.g. 5005 -> "5.005"). */
export function formatNumberBR(num: number): string {
  return new Intl.NumberFormat('pt-BR').format(num)
}

/* ============================================================
 * Distribuição Hipergeométrica Exata
 * ============================================================
 * Em uma população de N elementos, K "sucessos" e N-K "falhas".
 * Retira-se uma amostra de tamanho n (sem reposição). A variável
 * X = nº de sucessos na amostra segue uma hipergeométrica:
 *
 *   P(X = k) = C(K, k) · C(N-K, n-k) / C(N, n)
 * ============================================================ */

/**
 * Probabilidade hipergeométrica exata P(X = k).
 *
 * @param k número de acertos desejado
 * @param n tamanho da amostra (dezenas apostadas)
 * @param N tamanho da população (60)
 * @param K número de "sucessos" na população (6 sorteadas)
 */
export function probabilidadeAcertos(k: number, n: number, N = 60, K = 6): number {
  if (k < 0 || k > Math.min(n, K)) return 0
  if (n - k > N - K) return 0
  const denom = binomialCoefficient(N, n)
  if (denom === 0) return 0
  const num = binomialCoefficient(K, k) * binomialCoefficient(N - K, n - k)
  return num / denom
}

/**
 * Probabilidade de acertar EXATAMENTE `k` dezenas num bilhete de 6
 * dezenas (jogo simples da Mega-Sena).
 */
export function probExataMegaSena(k: number): number {
  return probabilidadeAcertos(k, 6, 60, 6)
}

/**
 * Probabilidade de acertar PELO MENOS `kMin` dezenas num bilhete de
 * tamanho n (soma das hipergeométricas de kMin até min(n,K)).
 */
export function probPeloMenos(kMin: number, n: number, N = 60, K = 6): number {
  let total = 0
  const upper = Math.min(n, K)
  for (let k = kMin; k <= upper; k++) {
    total += probabilidadeAcertos(k, n, N, K)
  }
  return total
}

export interface ProbabilidadesJogo {
  quadra: number
  quina: number
  sena: number
  peloMenosQuadra: number
  peloMenosQuina: number
  peloMenosSena: number
  umEmQuadra: number
  tamanho: number
}

/**
 * Calcula as probabilidades hipergeométricas completas de um jogo.
 * Considera o tamanho real do bilhete (ex.: 5 dezenas no Modo 5 Jogos).
 */
export function calcularProbabilidadesJogo(jogo: number[]): ProbabilidadesJogo {
  const n = jogo.length
  const quadra = probabilidadeAcertos(4, n, 60, 6)
  const quina = probabilidadeAcertos(5, n, 60, 6)
  const sena = probabilidadeAcertos(6, n, 60, 6)
  const peloMenosQuadra = probPeloMenos(4, n, 60, 6)
  const peloMenosQuina = probPeloMenos(5, n, 60, 6)
  const peloMenosSena = sena
  const umEmQuadra = peloMenosQuadra > 0 ? 1 / peloMenosQuadra : Infinity
  return {
    quadra,
    quina,
    sena,
    peloMenosQuadra,
    peloMenosQuina,
    peloMenosSena,
    umEmQuadra,
    tamanho: n,
  }
}

/* ============================================================
 * Expected Value (EV) — Valor Esperado com prize pool real
 * ============================================================
 * EV por jogo = P(quadra)·1000 + P(quina)·50000 + P(sena)·5000000 − 5
 * ============================================================ */

/**
 * Calcula o Valor Esperado (EV) de um jogo em reais.
 */
export function calcularEV(jogo: number[]): number {
  const p = calcularProbabilidadesJogo(jogo)
  return p.quadra * PRIZE_QUADRA + p.quina * PRIZE_QUINA + p.sena * PRIZE_SENA - PRICE_PER_GAME
}

/** Calcula o EV total de um conjunto de jogos (soma dos EVs individuais). */
export function calcularEVConjunto(jogos: number[][]): number {
  return jogos.reduce((acc, j) => acc + calcularEV(j), 0)
}

/** Retorna o EV por real apostado (EV / custo total). */
export function calcularEVPorReal(jogos: number[][]): number {
  const custo = jogos.length * PRICE_PER_GAME
  if (custo === 0) return 0
  return calcularEVConjunto(jogos) / custo
}

/* ============================================================
 * Cobertura Combinada dos 5 Jogos (Union Probability)
 * ============================================================
 * Probabilidade de AO MENOS UM jogo acertar quadra+ usando o
 * princípio da inclusão-exclusão com aproximação de Bonferroni
 * (2ª ordem):
 *
 *   P(∪ Ai) ≈ Σ P(Ai) − Σ P(Ai ∩ Aj)
 * ============================================================ */

function probJogoPeloMenos(jogo: number[], kMin: number): number {
  return probPeloMenos(kMin, jogo.length, 60, 6)
}

/**
 * Aproxima a interseção P(Ai ∩ Aj) — probabilidade de AMBOS os jogos
 * acertarem pelo menos a quadra. Modelo: P(Ai∩Aj) ≈ Pi·Pj·(1 + ρ).
 */
function probIntersecaoQuadra(jogoA: number[], jogoB: number[]): number {
  const pA = probJogoPeloMenos(jogoA, 4)
  const pB = probJogoPeloMenos(jogoB, 4)
  if (pA === 0 || pB === 0) return 0
  const setA = new Set(jogoA)
  const shared = jogoB.filter((n) => setA.has(n)).length
  const n = Math.max(jogoA.length, jogoB.length, 1)
  const rho = Math.min(0.5, (shared / n) * 0.4)
  const inter = pA * pB * (1 + rho)
  return Math.max(0, Math.min(inter, Math.min(pA, pB)))
}

export interface ProbabilidadeCombinada {
  peloMenosQuadra: number
  peloMenosQuina: number
  peloMenosSena: number
  numJogos: number
}

/**
 * Calcula a probabilidade combinada de AO MENOS UM jogo do conjunto
 * acertar a faixa alvo (quadra+, quina+, sena) usando inclusão-
 * exclusão (Bonferroni 2ª ordem).
 */
export function calcularProbabilidadeCombinada(jogos: number[][]): ProbabilidadeCombinada {
  const m = jogos.length
  if (m === 0) {
    return { peloMenosQuadra: 0, peloMenosQuina: 0, peloMenosSena: 0, numJogos: 0 }
  }

  // --- Quadra+ ---
  let sumQuadra = 0
  for (let i = 0; i < m; i++) sumQuadra += probJogoPeloMenos(jogos[i], 4)
  let sumInterQuadra = 0
  for (let i = 0; i < m; i++) {
    for (let j = i + 1; j < m; j++) {
      sumInterQuadra += probIntersecaoQuadra(jogos[i], jogos[j])
    }
  }
  const peloMenosQuadra = Math.max(0, Math.min(1, sumQuadra - sumInterQuadra))

  // --- Quina+ ---
  let sumQuina = 0
  for (let i = 0; i < m; i++) sumQuina += probJogoPeloMenos(jogos[i], 5)
  let sumInterQuina = 0
  for (let i = 0; i < m; i++) {
    for (let j = i + 1; j < m; j++) {
      const pA = probJogoPeloMenos(jogos[i], 5)
      const pB = probJogoPeloMenos(jogos[j], 5)
      const setA = new Set(jogos[i])
      const shared = jogos[j].filter((n) => setA.has(n)).length
      const n = Math.max(jogos[i].length, jogos[j].length, 1)
      const rho = Math.min(0.4, (shared / n) * 0.3)
      sumInterQuina += Math.min(pA * pB * (1 + rho), Math.min(pA, pB))
    }
  }
  const peloMenosQuina = Math.max(0, Math.min(1, sumQuina - sumInterQuina))

  // --- Sena ---
  let complementSena = 1
  for (let i = 0; i < m; i++) {
    const p = probJogoPeloMenos(jogos[i], 6)
    complementSena *= 1 - p
  }
  const peloMenosSena = Math.max(0, Math.min(1, 1 - complementSena))

  return { peloMenosQuadra, peloMenosQuina, peloMenosSena, numJogos: m }
}

/* ============================================================
 * Frequência Histórica de Números
 * ============================================================ */

/**
 * Calcula a frequência (contagem de aparições) de cada dezena a
 * partir de um array de concursos.
 */
export function calcularFrequencias(concursos: Array<{ dezenas: number[] }>): Map<number, number> {
  const freq = new Map<number, number>()
  for (let d = 1; d <= 60; d++) freq.set(d, 0)
  for (const c of concursos) {
    if (!c || !Array.isArray(c.dezenas)) continue
    for (const n of c.dezenas) {
      if (n >= 1 && n <= 60) {
        freq.set(n, (freq.get(n) ?? 0) + 1)
      }
    }
  }
  return freq
}

/**
 * Calcula a frequência relativa média global (média de aparições
 * por dezena) a partir do Map de frequências.
 */
export function frequenciaMediaGlobal(freq: Map<number, number>): number {
  if (freq.size === 0) return 0
  let sum = 0
  let count = 0
  for (const v of freq.values()) {
    sum += v
    count++
  }
  return count > 0 ? sum / count : 0
}

/**
 * Calcula a frequência relativa (0..1) de uma dezena: contagem /
 * total de concursos.
 */
export function frequenciaRelativa(
  freq: Map<number, number>,
  totalConcursos: number,
): Map<number, number> {
  const rel = new Map<number, number>()
  if (totalConcursos <= 0) return rel
  for (const [dezena, contagem] of freq.entries()) {
    rel.set(dezena, contagem / totalConcursos)
  }
  return rel
}

/* ============================================================
 * Score de Acertividade — API de compatibilidade
 * ============================================================
 * `calculateGameScore` delega para `computeScoreV3` (motor
 * probabilístico avançado v3 com anti-popularidade).
 * ============================================================ */

export interface ScoreColor {
  /** Cor hex para a barra de progresso. */
  color: string
  /** Rótulo de classificação ("Ótimo", "Bom", "Regular", "Baixo"). */
  label: string
  /** Classe Tailwind de cor de texto. */
  textColor: string
  /** Classe Tailwind de cor de fundo (barra de progresso). */
  bgClass: string
}

/**
 * Calcula o Score de Acertividade de um jogo (0-100).
 * Usa o motor probabilístico avançado v3 (computeScoreV3): 6 critérios
 * (paridade, uniformidade, gaps, soma, entropia, anti-popularidade).
 */
export function calculateGameScore(
  game: number[],
  historicoFrequencias?: Map<number, number>,
): number {
  void historicoFrequencias
  return computeScoreV3(game).total
}

/**
 * Retorna a cor/label de classificação do score.
 * ≥80 = verde ("Ótimo"), ≥60 = âmbar ("Bom"),
 * ≥40 = laranja ("Regular"), <40 = vermelho ("Baixo").
 */
export function getScoreColor(score: number): ScoreColor {
  if (score >= 80) {
    return {
      color: '#10b981',
      label: 'Ótimo',
      textColor: 'text-emerald-400',
      bgClass: 'bg-emerald-500',
    }
  }
  if (score >= 60) {
    return {
      color: '#f59e0b',
      label: 'Bom',
      textColor: 'text-amber-400',
      bgClass: 'bg-amber-500',
    }
  }
  if (score >= 40) {
    return {
      color: '#f97316',
      label: 'Regular',
      textColor: 'text-orange-400',
      bgClass: 'bg-orange-500',
    }
  }
  return {
    color: '#ef4444',
    label: 'Baixo',
    textColor: 'text-red-400',
    bgClass: 'bg-red-500',
  }
}

/* ============================================================
 * Modo "5 Jogos" — otimizador de cobertura
 * ============================================================ */

export const FIVE_GAMES_COUNT = 5
export const FIVE_GAMES_SIZE = 6
export const FIVE_GAMES_MIN_SELECTION = 6
export const FIVE_GAMES_MAX_SELECTION = 25

export interface FiveGamesResult {
  /** Os 5 jogos gerados, cada um com 6 dezenas ordenadas. */
  games: number[][]
  /** Dezenas do grupo que aparecem em ao menos 1 jogo. */
  covered: number[]
  /** Dezenas do grupo que não foram usadas em nenhum jogo. */
  uncovered: number[]
  /** Cobertura percentual (0–100). */
  coveragePercent: number
  /** Tamanho do grupo selecionado. */
  groupSize: number
  /** Número total de slots (5 jogos × 6 dezenas). */
  totalSlots: number
  /** Score probabilístico (0-100) de cada um dos 5 jogos. */
  scores: number[]
}

/**
 * Distribui as dezenas selecionadas em 5 jogos de 6 dezenas,
 * maximizando a cobertura do grupo e balanceando a repetição.
 */
export function optimizeFiveGames(selected: number[]): FiveGamesResult {
  const group = [...new Set(selected)].sort((a, b) => a - b)
  const groupSize = group.length
  const totalSlots = FIVE_GAMES_COUNT * FIVE_GAMES_SIZE

  const games: number[][] = Array.from({ length: FIVE_GAMES_COUNT }, () => [])
  const usage = new Map<number, number>()
  group.forEach((n) => usage.set(n, 0))

  const pickOrder = (startOffset: number): number[] => {
    const order: number[] = []
    for (let i = 0; i < groupSize; i++) {
      order.push(group[(startOffset + i) % groupSize])
    }
    return order
  }

  let cursor = 0
  for (let round = 0; round < FIVE_GAMES_SIZE; round++) {
    for (let g = 0; g < FIVE_GAMES_COUNT; g++) {
      if (games[g].length >= FIVE_GAMES_SIZE) continue
      const gameIndex = (g + round) % FIVE_GAMES_COUNT
      if (games[gameIndex].length >= FIVE_GAMES_SIZE) continue
      const startOffset = (cursor + round * 2) % Math.max(groupSize, 1)
      const order = pickOrder(startOffset)
      let chosen: number | null = null
      let bestUsage = Infinity
      for (const n of order) {
        if (games[gameIndex].includes(n)) continue
        const u = usage.get(n) ?? 0
        if (u < bestUsage) {
          bestUsage = u
          chosen = n
        }
      }
      if (chosen === null) {
        bestUsage = Infinity
        for (const n of order) {
          const u = usage.get(n) ?? 0
          if (u < bestUsage) {
            bestUsage = u
            chosen = n
          }
        }
      }
      if (chosen === null) continue
      games[gameIndex].push(chosen)
      games[gameIndex].sort((a, b) => a - b)
      usage.set(chosen, (usage.get(chosen) ?? 0) + 1)
      cursor++
    }
  }

  for (let g = 0; g < FIVE_GAMES_COUNT; g++) {
    while (games[g].length < FIVE_GAMES_SIZE) {
      let least: number = group[0]
      let leastU = Infinity
      for (const n of group) {
        const u = usage.get(n) ?? 0
        if (u < leastU) {
          leastU = u
          least = n
        }
      }
      games[g].push(least)
      games[g].sort((a, b) => a - b)
      usage.set(least, (usage.get(least) ?? 0) + 1)
    }
  }

  const coveredSet = new Set<number>()
  games.forEach((g) => g.forEach((n) => coveredSet.add(n)))
  const covered = [...coveredSet].sort((a, b) => a - b)
  const uncovered = group.filter((n) => !coveredSet.has(n))
  const coveragePercent = groupSize > 0 ? Math.round((coveredSet.size / groupSize) * 1000) / 10 : 0

  return {
    games,
    covered,
    uncovered,
    coveragePercent,
    groupSize,
    totalSlots,
    scores: games.map((g) => calculateGameScore(g)),
  }
}

/* ============================================================
 * optimizeFiveGamesV2 — Motor probabilístico de cobertura
 * ============================================================ */
const V2_MAX_FULL_COMBINATIONS = 21

export type OptimizationMeta = 'cobertura' | 'equilibrado' | 'score' | 'elite' | 'ev-maximo'

export interface OptimizationWeights {
  score: number
  cobertura: number
  sobreposicao: number
}

export const META_WEIGHTS: Record<OptimizationMeta, OptimizationWeights> = {
  cobertura: { score: 1, cobertura: 6, sobreposicao: 2 },
  equilibrado: { score: 2, cobertura: 4, sobreposicao: 1 },
  score: { score: 5, cobertura: 1, sobreposicao: 1 },
  elite: { score: 9, cobertura: 0.2, sobreposicao: 0.5 },
  // Meta "EV Máximo": pesos especiais tratados no V3 via fórmula própria.
  'ev-maximo': { score: 2.5, cobertura: 1.5, sobreposicao: 1 },
}

/** Limiar de "Score Elite" (≥90%). */
export const SCORE_ELITE_THRESHOLD = 90

export const DEFAULT_META: OptimizationMeta = 'equilibrado'

export function optimizeFiveGamesV2(
  selected: number[],
  meta: OptimizationMeta = DEFAULT_META,
): FiveGamesResult {
  const w = META_WEIGHTS[meta]
  const group = [...new Set(selected)].sort((a, b) => a - b)
  const groupSize = group.length
  const totalSlots = FIVE_GAMES_COUNT * FIVE_GAMES_SIZE
  const k = FIVE_GAMES_SIZE

  let candidates: number[][]
  if (groupSize <= k) {
    candidates = [group]
  } else if (groupSize <= V2_MAX_FULL_COMBINATIONS) {
    candidates = generateCombinations(group, k)
  } else {
    candidates = generateCombinations(group.slice(0, V2_MAX_FULL_COMBINATIONS), k)
    const seed = 12345
    let s = seed
    const rand = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff
      return s / 0x7fffffff
    }
    const extra = 5000
    for (let t = 0; t < extra; t++) {
      const pool = [...group]
      const pick: number[] = []
      for (let i = 0; i < k; i++) {
        const idx = Math.floor(rand() * pool.length)
        pick.push(pool.splice(idx, 1)[0])
      }
      pick.sort((a, b) => a - b)
      candidates.push(pick)
    }
  }

  const scored = candidates.map((c) => ({ game: c, score: calculateGameScore(c) }))
  scored.sort((a, b) => b.score - a.score)

  const chosen: { game: number[]; score: number }[] = []
  const usage = new Map<number, number>()
  group.forEach((n) => usage.set(n, 0))
  const coveredSet = new Set<number>()

  const isElite = meta === 'elite'
  const isMaximin = meta === 'score'

  while (chosen.length < FIVE_GAMES_COUNT && scored.length > 0) {
    let bestIdx = -1
    let bestValue = -Infinity
    for (let i = 0; i < scored.length; i++) {
      const cand = scored[i]
      let newCoverage = 0
      let overlapPenalty = 0
      for (const num of cand.game) {
        if (!coveredSet.has(num)) newCoverage += 1
        const u = usage.get(num) ?? 0
        overlapPenalty += u
      }

      let value: number
      if (isElite) {
        value = cand.score * w.score + newCoverage * w.cobertura - overlapPenalty * w.sobreposicao
      } else if (isMaximin) {
        const currentMin = chosen.length > 0 ? Math.min(...chosen.map((c) => c.score)) : 0
        const newMin = Math.min(currentMin, cand.score)
        value = newMin * w.score + newCoverage * w.cobertura - overlapPenalty * w.sobreposicao
      } else {
        value = cand.score * w.score + newCoverage * w.cobertura - overlapPenalty * w.sobreposicao
      }

      if (value > bestValue) {
        bestValue = value
        bestIdx = i
      }
    }
    if (bestIdx === -1) break
    const picked = scored.splice(bestIdx, 1)[0]
    chosen.push(picked)
    for (const num of picked.game) {
      coveredSet.add(num)
      usage.set(num, (usage.get(num) ?? 0) + 1)
    }
  }

  while (chosen.length < FIVE_GAMES_COUNT && chosen.length > 0) {
    chosen.push(chosen[0])
  }

  const games = chosen.map((c) => [...c.game].sort((a, b) => a - b))
  const covered = [...coveredSet].sort((a, b) => a - b)
  const uncovered = group.filter((n) => !coveredSet.has(n))
  const coveragePercent = groupSize > 0 ? Math.round((coveredSet.size / groupSize) * 1000) / 10 : 0
  const scores = chosen.map((c) => c.score)

  return {
    games,
    covered,
    uncovered,
    coveragePercent,
    groupSize,
    totalSlots,
    scores,
  }
}

/* ============================================================
 * optimizeFiveGamesV3 — Otimizador de Cobertura Greedy (avançado)
 * ============================================================
 *  1. Gera todas as combinações de 5 a partir do grupo selecionado
 *     (quando viável) e pontua cada uma pelo score probabilístico.
 *  2. Seleciona o 1º jogo: maior score.
 *  3. Para jogos 2-5: seleciona o que maximiza
 *        score × 0.4 + cobertura_marginal × 0.6
 *  4. Garante que cada novo jogo tenha ao menos 2 números diferentes
 *     dos anteriores.
 * ============================================================ */

/**
 * Calcula os pares e trios contidos num jogo.
 * Retorna um Set de strings chave ("a-b" para pares, "a-b-c" para trios).
 */
function paresEtriosDoJogo(jogo: number[]): Set<string> {
  const sorted = [...jogo].sort((a, b) => a - b)
  const set = new Set<string>()
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      set.add(`${sorted[i]}-${sorted[j]}`)
    }
  }
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      for (let l = j + 1; l < sorted.length; l++) {
        set.add(`${sorted[i]}-${sorted[j]}-${sorted[l]}`)
      }
    }
  }
  return set
}

/**
 * Conta quantos NOVOS pares/trios o candidato adiciona ao conjunto
 * já coberto.
 */
function coberturaMarginal(candidato: number[], cobertos: Set<string>): number {
  const paresTrios = paresEtriosDoJogo(candidato)
  let novos = 0
  for (const pt of paresTrios) {
    if (!cobertos.has(pt)) novos++
  }
  return novos
}

/**
 * Conta quantas dezenas do candidato são diferentes de TODOS os
 * jogos já escolhidos (dezenas que ainda não apareceram).
 */
function dezenasNovas(candidato: number[], usadas: Set<number>): number {
  let novos = 0
  for (const n of candidato) {
    if (!usadas.has(n)) novos++
  }
  return novos
}

/**
 * Otimizador de Cobertura Greedy (V3) — nível mundial.
 *
 * Substitui `optimizeFiveGamesV2` mantendo a mesma assinatura e
 * retorno. Aceita opcionalmente o Map de frequências históricas
 * para o score probabilístico.
 */
export function optimizeFiveGamesV3(
  selected: number[],
  meta: OptimizationMeta = DEFAULT_META,
  historicoFrequencias?: Map<number, number>,
): FiveGamesResult {
  const group = [...new Set(selected)].sort((a, b) => a - b)
  const groupSize = group.length
  const totalSlots = FIVE_GAMES_COUNT * FIVE_GAMES_SIZE
  const k = FIVE_GAMES_SIZE

  const w = META_WEIGHTS[meta]

  let candidates: number[][]
  if (groupSize <= k) {
    candidates = [group]
  } else if (groupSize <= V2_MAX_FULL_COMBINATIONS) {
    candidates = generateCombinations(group, k)
  } else {
    candidates = generateCombinations(group.slice(0, V2_MAX_FULL_COMBINATIONS), k)
    const seed = 98765
    let s = seed
    const rand = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff
      return s / 0x7fffffff
    }
    const extra = 5000
    for (let t = 0; t < extra; t++) {
      const pool = [...group]
      const pick: number[] = []
      for (let i = 0; i < k; i++) {
        const idx = Math.floor(rand() * pool.length)
        pick.push(pool.splice(idx, 1)[0])
      }
      pick.sort((a, b) => a - b)
      candidates.push(pick)
    }
  }

  const scored = candidates.map((c) => ({
    game: c,
    score: calculateGameScore(c, historicoFrequencias),
  }))
  scored.sort((a, b) => b.score - a.score)

  const chosen: { game: number[]; score: number }[] = []
  const usadas = new Set<number>()
  const paresTriosCobertos = new Set<string>()

  const isElite = meta === 'elite'
  const isMaximin = meta === 'score'
  const isEvMaximo = meta === 'ev-maximo'

  while (chosen.length < FIVE_GAMES_COUNT && scored.length > 0) {
    let bestIdx = -1
    let bestValue = -Infinity

    for (let i = 0; i < scored.length; i++) {
      const cand = scored[i]

      if (chosen.length === 0) {
        // 1º jogo: maior score (ponderado pela meta)
        let value: number
        if (isEvMaximo) {
          const pop = estimatePopularityFactor(cand.game)
          value = cand.score * 2.5 + dezenasNovas(cand.game, usadas) * 1.5 + (2 - pop) * 12
        } else {
          value = cand.score * w.score + dezenasNovas(cand.game, usadas) * w.cobertura
        }
        if (value > bestValue) {
          bestValue = value
          bestIdx = i
        }
        continue
      }

      const novas = dezenasNovas(cand.game, usadas)
      if (!isElite && novas < 2 && groupSize > k) continue

      const margCobertura = coberturaMarginal(cand.game, paresTriosCobertos)
      let value: number
      if (isElite) {
        value = cand.score * (w.score / 2) + margCobertura * (w.cobertura / 4)
      } else if (isEvMaximo) {
        const pop = estimatePopularityFactor(cand.game)
        value = cand.score * 2.5 + margCobertura * 1.5 + (2 - pop) * 12
      } else if (isMaximin) {
        const currentMin = Math.min(...chosen.map((c) => c.score))
        const newMin = Math.min(currentMin, cand.score)
        value = newMin * 0.4 * (w.score / 2) + margCobertura * 0.6 * (w.cobertura / 4)
      } else {
        const pesoScore = 0.4 * (w.score / 2)
        const pesoCob = 0.6 * (w.cobertura / 4)
        value = cand.score * pesoScore + margCobertura * pesoCob
      }
      if (value > bestValue) {
        bestValue = value
        bestIdx = i
      }
    }

    if (bestIdx === -1) {
      for (let i = 0; i < scored.length; i++) {
        const cand = scored[i]
        const margCobertura = coberturaMarginal(cand.game, paresTriosCobertos)
        const value = cand.score * 0.4 + margCobertura * 0.6
        if (value > bestValue) {
          bestValue = value
          bestIdx = i
        }
      }
    }

    if (bestIdx === -1) break
    const picked = scored.splice(bestIdx, 1)[0]
    chosen.push(picked)
    for (const num of picked.game) usadas.add(num)
    for (const pt of paresEtriosDoJogo(picked.game)) paresTriosCobertos.add(pt)
  }

  while (chosen.length < FIVE_GAMES_COUNT && chosen.length > 0) {
    chosen.push(chosen[0])
  }

  const games = chosen.map((c) => [...c.game].sort((a, b) => a - b))
  const covered = [...usadas].filter((n) => group.includes(n)).sort((a, b) => a - b)
  const uncovered = group.filter((n) => !usadas.has(n))
  const coveragePercent = groupSize > 0 ? Math.round((covered.length / groupSize) * 1000) / 10 : 0
  const scores = chosen.map((c) => c.score)

  return {
    games,
    covered,
    uncovered,
    coveragePercent,
    groupSize,
    totalSlots,
    scores,
  }
}

/**
 * Recalcula o FiveGamesResult a partir de jogos editados manualmente
 * (após drag-and-drop). Recalcula cobertura, cobertas/fora e scores.
 */
export function recomputeFiveGamesResult(
  games: number[][],
  group: number[],
  historicoFrequencias?: Map<number, number>,
): FiveGamesResult {
  const sortedGroup = [...new Set(group)].sort((a, b) => a - b)
  const groupSize = sortedGroup.length
  const totalSlots = FIVE_GAMES_COUNT * FIVE_GAMES_SIZE
  const coveredSet = new Set<number>()
  games.forEach((g) => g.forEach((n) => coveredSet.add(n)))
  const covered = [...coveredSet].sort((a, b) => a - b)
  const uncovered = sortedGroup.filter((n) => !coveredSet.has(n))
  const coveragePercent = groupSize > 0 ? Math.round((coveredSet.size / groupSize) * 1000) / 10 : 0
  const scores = games.map((g) => calculateGameScore(g, historicoFrequencias))
  return {
    games: games.map((g) => [...g].sort((a, b) => a - b)),
    covered,
    uncovered,
    coveragePercent,
    groupSize,
    totalSlots,
    scores,
  }
}

/* ============================================================
 * Probabilidade combinada de acerto — API legada (mantida)
 * ============================================================ */
export function probabilityAtLeastFourPlus(games: number[][]): number {
  if (!games || games.length === 0) return 0
  return calcularProbabilidadeCombinada(games).peloMenosQuadra
}

/**
 * Exporta os 5 jogos otimizados para um arquivo .txt formatado.
 * Inclui popularidade, EV por jogo e eficiência de Schönheim.
 */
export function buildFiveGamesExportText(result: FiveGamesResult, selected: number[]): string {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = now.getFullYear()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')

  // Eficiência de Schönheim (cobertura t=2: garantir todos os pares)
  const eficienciaSchonheim = coverageEfficiency(
    result.groupSize,
    result.games.length,
    FIVE_GAMES_SIZE,
    2,
  )

  const header = [
    `# ==========================================================`,
    `# Otimizador Estratégico Mega-Sena — Modo 5 Jogos`,
    `# Data de Geração: ${day}/${month}/${year} às ${hours}:${minutes}`,
    `# Dezenas do Grupo (${selected.length}): ${selected.map(formatTwoDigits).join(', ')}`,
    `# Cobertura: ${result.coveragePercent}% | Cobertas: ${result.covered.length} | Fora: ${result.uncovered.length}`,
    `# Eficiência de Cobertura (Schönheim, t=2): ${eficienciaSchonheim}% do limite teórico`,
    `# ==========================================================`,
    ``,
  ].join('\n')

  const body = result.games
    .map((game, idx) => {
      const score = result.scores[idx] ?? 0
      const { label } = getScoreColor(score)
      const probs = calcularProbabilidadesJogo(game)
      const pQuadraUmEm = Number.isFinite(probs.umEmQuadra)
        ? `1 em ${formatNumberBR(Math.round(probs.umEmQuadra))}`
        : '—'
      const pop = estimatePopularityFactor(game)
      const popLabel = popularidadeLabel(pop)
      const evReal = calculateRealEVJogo(game, PRIZE_SENA)
      return `Jogo ${String(idx + 1).padStart(2, '0')}: ${formatGameString(game)} | Score: ${score}% (${label}) | P(≥Quadra): ${pQuadraUmEm} | Popularidade: ${popLabel} (${pop.toFixed(2)}) | EV Real: ${formatCurrencyBRL(evReal.ev)}`
    })
    .join('\n')

  const avgScore =
    result.scores.length > 0
      ? Math.round(result.scores.reduce((acc, s) => acc + s, 0) / result.scores.length)
      : 0

  const comb = calcularProbabilidadeCombinada(result.games)
  const evTotal = calcularEVConjunto(result.games)
  const combPct = (comb.peloMenosQuadra * 100).toFixed(4)

  const footer = [
    ``,
    `# Score Médio dos 5 Jogos: ${avgScore}%`,
    `# Prob. combinada de ≥Quadra (Bonferroni 2ª ordem): ${combPct}%`,
    `# Valor Esperado (EV) total: ${formatCurrencyBRL(evTotal)} (custo: ${formatCurrencyBRL(result.games.length * PRICE_PER_GAME)})`,
    `# Eficiência Schönheim (t=2): ${eficienciaSchonheim}% do limite teórico`,
    `# Motor probabilístico v3: hipergeométrica, KS, gaps, soma normal, entropia, anti-popularidade, Bonferroni, Schönheim`,
  ].join('\n')

  return `${header}\n${body}\n${footer}\n`
}
