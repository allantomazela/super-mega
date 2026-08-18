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

export const PRICE_PER_GAME = 5.0

/* ============================================================
 * Motor Probabilístico Avançado (nível mundial) — v3
 * ============================================================
 * Score de 0–100 baseado em 5 critérios rigorosos (cada 0–20):
 *   A) Distribuição Hipergeométrica Multivariada (Paridade)
 *   B) Teste de Kolmogorov-Smirnov para Uniformidade
 *   C) Análise de Gaps e Autocorrelação (CV dos gaps)
 *   D) Soma com Distribuição Normal (Z-score, gaussiana)
 *   E) Entropia de Shannon + Informação Mútua (6 décadas)
 *
 * Combinação ponderada:
 *   0.22·A + 0.22·B + 0.20·C + 0.18·D + 0.18·E
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

/** Pesos de combinação do score final (A..E). */
const SCORE_WEIGHTS = {
  paridade: 0.22, // A
  uniformidade: 0.22, // B
  gaps: 0.2, // C
  soma: 0.18, // D
  entropia: 0.18, // E
} as const

/** Clamp utilitário. */
function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x))
}

/* ------------------------------------------------------------
 * A) Distribuição Hipergeométrica Multivariada — Paridade (0-20)
 * ------------------------------------------------------------
 * Em [1,60] há exatamente 30 pares e 30 ímpares. A contagem de
 * pares num jogo de tamanho n segue a hipergeométrica:
 *
 *   P(pares = p) = C(30, p) · C(30, n−p) / C(60, n)
 *
 * A configuração esperada (moda) é p* ≈ n/2. Comparamos a
 * probabilidade observada P_obs com a probabilidade esperada
 * P_exp (= P no modo) e pontuamos por proximidade relativa:
 *
 *   score = 20 · (1 − |P_obs − P_exp| / P_exp), clamp [0,20].
 *
 * Quando P_exp = 0 (configuração impossível), fallback pelo
 * desvio normalizado da contagem.
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

  // Probabilidade observada da configuração (pares, ímpares)
  const numObs = binomialCoefficient(MS_EVEN, pares) * binomialCoefficient(MS_ODD, impares)
  const pObs = numObs / denom

  // Moda esperada: p* = inteiro mais próximo de n/2 dentro de [0,n]
  const pStar = Math.max(0, Math.min(n, Math.round(n / 2)))
  const numExp = binomialCoefficient(MS_EVEN, pStar) * binomialCoefficient(MS_ODD, n - pStar)
  const pExp = numExp / denom

  let score: number
  if (pExp > 0) {
    const rel = Math.abs(pObs - pExp) / pExp
    score = 20 * (1 - rel)
  } else {
    // Fallback: desvio normalizado da contagem em relação a n/2
    const dev = Math.abs(pares - n / 2) / (n / 2 || 1)
    score = 20 * (1 - dev)
  }
  return { score: clamp(score, 0, 20), pares, pObs, pExp }
}

/* ------------------------------------------------------------
 * B) Kolmogorov-Smirnov para Uniformidade (0-20)
 * ------------------------------------------------------------
 * Trata as n dezenas como amostra de Uniforme(1,60). A CDF
 * esperada é F(x) = x/60. Calculamos a estatística D de KS:
 *
 *   D = max |F_obs(x) − F_exp(x)|
 *
 * D baixo ⇒ distribuição mais uniforme ⇒ melhor.
 *   score = 20 · (1 − D), com D ∈ [0,1].
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
 * ------------------------------------------------------------
 * Calcula os gaps entre dezenas consecutivas ordenadas. O gap
 * esperado é ≈ (60−1)/(n−1) = 59/(n−1). Avaliamos o coeficiente
 * de variação (CV = σ/μ) dos gaps:
 *   - CV ≈ 0  → gaps idênticos (padrão humano, muito regular)
 *   - CV ≈ 0.5 → variação natural ligeira (ótimo)
 *   - CV muito alto → espaçamento caótico/concentrado
 *
 * Também penalizamos gaps puramente iguais (todos iguais) e
 * padrões periódicos (autocorrelação positiva de lag-1).
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

  // Score por CV: máximo em cv ≈ 0.5, decai dos dois lados.
  // Ideal = 0.5; penaliza regularidade (cv→0) e caos (cv→alto).
  const ideal = 0.5
  const dev = Math.abs(cv - ideal)
  const cvScore = Math.exp(-(dev * dev) / (2 * 0.45 * 0.45))

  // Penalidade por gaps todos iguais (padrão humano)
  const allEqual = gaps.every((g) => g === gaps[0])
  const equalPenalty = allEqual ? 0.4 : 1.0

  // Autocorrelação lag-1 dos gaps
  let autocov = 0
  for (let i = 0; i < m - 1; i++) {
    autocov += (gaps[i] - meanGap) * (gaps[i + 1] - meanGap)
  }
  autocov = m > 1 ? autocov / (m - 1) : 0
  const autocorr = variance > 0 ? autocov / variance : 0
  // |autocorr| alto → padrão periódico → penaliza
  const autocorrPenalty = 1 - Math.min(0.5, Math.abs(autocorr))

  const score = 20 * cvScore * equalPenalty * autocorrPenalty
  return { score: clamp(score, 0, 20), cv }
}

/* ------------------------------------------------------------
 * D) Soma com Distribuição Normal (0-20)
 * ------------------------------------------------------------
 * μ = n·30.5, σ = √(n·(60²−1)/12). z = |soma−μ|/σ.
 * Score = 20·exp(−z²/2) — penalização gaussiana.
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
 * ------------------------------------------------------------
 * Divide [1,60] em 6 décadas (1-10, 11-20, …, 51-60). Calcula a
 * entropia H = −Σ pi·ln(pi) normalizada por ln(6). Bônus quando
 * a distribuição entre décadas é próxima da uniforme.
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
  const hNorm = hmax > 0 ? h / hmax : 0 // 0..1

  // Base pela entropia normalizada (0..14 pts)
  const base = 14 * hNorm

  // Bônus (0..6 pts) se a distribuição é próxima da uniforme.
  // Mede o desvio máximo de cada década em relação a n/6.
  const expected = n / 6
  const maxDev = Math.max(...decades.map((c) => Math.abs(c - expected)))
  const maxDevRel = expected > 0 ? maxDev / expected : 1
  const bonus = 6 * Math.exp(-(maxDevRel * maxDevRel) / (2 * 0.5 * 0.5))

  const score = base + bonus
  return { score: clamp(score, 0, 20), h: hNorm }
}

/**
 * Calcula o Score Probabilístico Avançado (computeScoreV2) de um jogo,
 * com breakdown detalhado dos 5 critérios (cada 0-20, total 0-100).
 *
 * Combinação ponderada:
 *   0.22·A + 0.22·B + 0.20·C + 0.18·D + 0.18·E
 * normalizado para 0-100 com precisão de 1 casa decimal.
 *
 * @param jogo Dezenas do jogo
 * @param _historicoFrequencias Opcional (mantido para compat. de assinatura;
 *   o novo motor não depende de frequências históricas).
 */
export function computeScoreV2(
  jogo: number[],
  _historicoFrequencias?: Map<number, number>,
): ScoreBreakdown {
  if (!jogo || jogo.length === 0) {
    return { total: 0, paridade: 0, uniformidade: 0, gaps: 0, soma: 0, entropia: 0 }
  }
  const paridade = hypergeometricParityScore(jogo).score
  const uniformidade = ksUniformityScore(jogo).score
  const gaps = gapsAutocorrScore(jogo).score
  const soma = sumNormalScore(jogo).score
  const entropia = shannonEntropyScore(jogo).score

  const weighted =
    paridade * SCORE_WEIGHTS.paridade +
    uniformidade * SCORE_WEIGHTS.uniformidade +
    gaps * SCORE_WEIGHTS.gaps +
    soma * SCORE_WEIGHTS.soma +
    entropia * SCORE_WEIGHTS.entropia
  // Cada critério é 0-20; a soma dos pesos = 1, logo weighted ∈ [0,20].
  // Normaliza para 0-100 (×5) e arredonda para 1 casa decimal.
  const total = Math.round(clamp(weighted * 5, 0, 100) * 10) / 10

  return {
    total,
    paridade,
    uniformidade,
    gaps,
    soma,
    entropia,
  }
}

/**
 * Formata o breakdown do score para exibição em tooltip.
 * Formato: "Paridade: 18.2 | Uniformidade: 17.5 | Gaps: 16.8 | Soma: 19.1 | Entropia: 15.4"
 */
export function formatScoreBreakdown(b: ScoreBreakdown): string {
  const f = (x: number) => x.toFixed(1)
  return `Paridade: ${f(b.paridade)} | Uniformidade: ${f(b.uniformidade)} | Gaps: ${f(b.gaps)} | Soma: ${f(b.soma)} | Entropia: ${f(b.entropia)}`
}

/**
 * Estatísticas de paridade para exibição (pares, ímpares, p-value).
 */
export function paridadeStats(jogo: number[]): ParidadeStats {
  const n = jogo.length
  const pares = jogo.filter((x) => x % 2 === 0).length
  const { pObs, pExp } = hypergeometricParityScore(jogo)
  // p-Value aproximado: 1 − razão entre P_obs e P_exp (quanto mais
  // próximo de 1, mais "esperada" é a configuração).
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
 * Usada para o cálculo de Valor Esperado (EV).
 * ============================================================ */
export const PRIZE_QUADRA = 1000
export const PRIZE_QUINA = 50000
export const PRIZE_SENA = 5000000

/**
 * Generates all combinations of k items from array arr
 * Returns sorted combinations (each game sorted ascending)
 */
export function generateCombinations(arr: number[], k: number = 6): number[][] {
  const sorted = [...arr].sort((a, b) => a - b)
  const results: number[][] = []

  function backtrack(startIndex: number, current: number[]) {
    if (current.length === k) {
      results.push([...current])
      return
    }

    // If remaining elements are not enough to reach k, prune
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

/**
 * Filter 1: Parity (Paridade)
 * Keep games with 2, 3, or 4 even numbers (eliminate 0, 1, 5, 6 evens)
 */
export function passesParityFilter(game: number[]): boolean {
  const evenCount = game.filter((n) => n % 2 === 0).length
  return evenCount >= 2 && evenCount <= 4
}

/**
 * Filter 2: Sum (Soma)
 * Eliminate games where sum < 120 or sum > 240
 */
export function passesSumFilter(game: number[]): boolean {
  const sum = game.reduce((acc, curr) => acc + curr, 0)
  return sum >= 120 && sum <= 240
}

/**
 * Filter 3: Expected Value (Valor Esperado - Datas)
 * Eliminate games with 4 or more numbers between 1 and 31 (inclusive)
 */
export function passesExpectedValueFilter(game: number[]): boolean {
  const calendarNumbersCount = game.filter((n) => n >= 1 && n <= 31).length
  return calendarNumbersCount < 4
}

/**
 * Filter 4: Sequence (Sequência)
 * Eliminate games with 3 or more numbers in pure consecutive sequence (e.g. n, n+1, n+2)
 */
export function passesSequenceFilter(game: number[]): boolean {
  // Game is already sorted in ascending order
  for (let i = 0; i <= game.length - 3; i++) {
    if (game[i + 1] === game[i] + 1 && game[i + 2] === game[i] + 2) {
      return false
    }
  }
  return true
}

/**
 * Apply all enabled filters in sequence
 */
export function applyFilters(combinations: number[][], filters: FilterOptions): number[][] {
  return combinations.filter((game) => {
    if (filters.parity && !passesParityFilter(game)) return false
    if (filters.sum && !passesSumFilter(game)) return false
    if (filters.expectedValue && !passesExpectedValueFilter(game)) return false
    if (filters.sequence && !passesSequenceFilter(game)) return false
    return true
  })
}

/**
 * Format number with leading zero (e.g. 3 -> "03")
 */
export function formatTwoDigits(num: number): string {
  return num < 10 ? `0${num}` : `${num}`
}

/**
 * Format game numbers as formatted string "03 - 15 - 22 - 27 - 34 - 41"
 */
export function formatGameString(game: number[]): string {
  return game.map(formatTwoDigits).join(' - ')
}

/**
 * Format currency in BRL (R$ 1.500,00)
 */
export function formatCurrencyBRL(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val)
}

/**
 * Format integer numbers in pt-BR (e.g. 5005 -> "5.005")
 */
export function formatNumberBR(num: number): string {
  return new Intl.NumberFormat('pt-BR').format(num)
}

/* ============================================================
 * Coeficiente Binomial — C(n, k)
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
 * Funções estatísticas auxiliares (log-gama, qui-quadrado, normal)
 * Mantidas para referência/futuras extensões; o motor de score v3
 * não depende mais delas, mas são usadas por cálculos de probabilidade.
 * ============================================================ */

/**
 * Função log-gama (aproximação de Lanczos). Retorna ln(Γ(x)).
 */
function logGamma(x: number): number {
  const g = 7
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ]
  if (x < 0.5) {
    // Reflexão: Γ(x)Γ(1-x) = π / sin(πx)
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x)
  }
  x -= 1
  let a = c[0]
  const t = x + g + 0.5
  for (let i = 1; i < g + 2; i++) {
    a += c[i] / (x + i)
  }
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a)
}

/**
 * CDF (função de distribuição acumulada) da distribuição qui-quadrado
 * com `df` graus de liberdade. Implementa a série da função gama
 * incompleta regularizada P(a, x).
 */
function chiSquareCDF(x: number, df: number): number {
  if (x <= 0) return 0
  if (df <= 0) return 1
  const a = df / 2
  const xx = x / 2
  if (xx < a + 1) {
    let term = 1 / a
    let sum = term
    for (let n = 1; n < 200; n++) {
      term *= xx / (a + n)
      sum += term
      if (Math.abs(term) < Math.abs(sum) * 1e-12) break
    }
    const logPrefix = a * Math.log(xx) - xx - logGamma(a)
    return Math.max(0, Math.min(1, Math.exp(logPrefix) * sum))
  } else {
    let b = xx + 1 - a
    let c = Number.MAX_VALUE / 10
    let d = 1 / b
    let h = d
    for (let i = 1; i < 200; i++) {
      const an = -i * (i - a)
      b += 2
      d = an * d + b
      if (Math.abs(d) < 1e-300) d = 1e-300
      c = b + an / c
      if (Math.abs(c) < 1e-300) c = 1e-300
      d = 1 / d
      const del = d * c
      h *= del
      if (Math.abs(del - 1) < 1e-12) break
    }
    const logPrefix = a * Math.log(xx) - xx - logGamma(a)
    const q = Math.exp(logPrefix) * h
    return Math.max(0, Math.min(1, 1 - q))
  }
}

/**
 * Retorna o p-value do teste qui-quadrado: P(X² ≥ estat) com df.
 */
function chiSquarePValue(stat: number, df: number): number {
  if (df <= 0) return 1
  return Math.max(0, Math.min(1, 1 - chiSquareCDF(stat, df)))
}

/**
 * CDF da distribuição normal padrão Φ(z). Aproximação de Abramowitz &
 * Stegun 7.1.26.
 */
function normalCDF(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989422804014327 * Math.exp(-0.5 * z * z)
  const p =
    d *
    t *
    (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
  return z > 0 ? 1 - p : p
}

/* chiSquarePValue e normalCDF são mantidas para referência/futuras
 * extensões estatísticas; o motor de score v3 não as invoca. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
void chiSquarePValue
// eslint-disable-next-line @typescript-eslint/no-unused-vars
void normalCDF
// eslint-disable-next-line @typescript-eslint/no-unused-vars
void chiSquareCDF
// eslint-disable-next-line @typescript-eslint/no-unused-vars
void logGamma

/* ============================================================
 * Distribuição Hipergeométrica Exata
 * ============================================================
 * Em uma população de N elementos, K "sucessos" e N-K "falhas".
 * Retira-se uma amostra de tamanho n (sem reposição). A variável
 * X = nº de sucessos na amostra segue uma hipergeométrica:
 *
 *   P(X = k) = C(K, k) · C(N-K, n-k) / C(N, n)
 *
 * Para a Mega-Sena: N = 60 dezenas, K = 6 sorteadas, n = nº de
 * dezenas apostadas no bilhete.
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
  /** Probabilidade de acertar exatamente 4 (quadra). */
  quadra: number
  /** Probabilidade de acertar exatamente 5 (quina). */
  quina: number
  /** Probabilidade de acertar exatamente 6 (sena). */
  sena: number
  /** Probabilidade de acertar pelo menos a quadra. */
  peloMenosQuadra: number
  /** Probabilidade de acertar pelo menos a quina. */
  peloMenosQuina: number
  /** Probabilidade de acertar a sena. */
  peloMenosSena: number
  /** "1 em X" para pelo menos quadra. */
  umEmQuadra: number
  /** Tamanho do bilhete (n dezenas). */
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
 * (custo de R$ 5,00 por bilhete simples).
 * ============================================================ */

/**
 * Calcula o Valor Esperado (EV) de um jogo em reais, considerando a
 * premiação média da Mega-Sena (2025) e o custo de R$ 5,00.
 */
export function calcularEV(jogo: number[]): number {
  const p = calcularProbabilidadesJogo(jogo)
  return p.quadra * PRIZE_QUADRA + p.quina * PRIZE_QUINA + p.sena * PRIZE_SENA - PRICE_PER_GAME
}

/**
 * Calcula o EV total de um conjunto de jogos (soma dos EVs individuais).
 */
export function calcularEVConjunto(jogos: number[][]): number {
  return jogos.reduce((acc, j) => acc + calcularEV(j), 0)
}

/**
 * Retorna o EV por real apostado (EV / custo total).
 */
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
 *
 * A interseção P(Ai ∩ Aj) aproxima a probabilidade de AMBOS os
 * jogos acertarem quadra+. Quando os jogos compartilham dezenas,
 * usamos a hipergeométrica multivariada aproximada pelo produto
 * das probabilidades marginais ponderado pelo fator de correlação
 * derivado do número de dezenas compartilhadas.
 * ============================================================ */

/**
 * Probabilidade de um jogo de tamanho n acertar pelo menos `kMin`
 * dezenas (marginal hipergeométrica).
 */
function probJogoPeloMenos(jogo: number[], kMin: number): number {
  return probPeloMenos(kMin, jogo.length, 60, 6)
}

/**
 * Aproxima a interseção P(Ai ∩ Aj) — probabilidade de AMBOS os jogos
 * acertarem pelo menos a quadra. Como os jogos compartilham dezenas,
 * os eventos não são independentes. Estimamos a correlação via o nº
 * de dezenas compartilhadas.
 *
 * Modelo: P(Ai∩Aj) ≈ Pi·Pj·(1 + ρ), onde ρ depende da sobreposição.
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
  /** P(∪Ai) para quadra+ — aproximação de Bonferroni 2ª ordem. */
  peloMenosQuadra: number
  /** P(∪Ai) para quina+. */
  peloMenosQuina: number
  /** P(∪Ai) para sena. */
  peloMenosSena: number
  /** Número de jogos considerados. */
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
 * `calculateGameScore` delega para `computeScoreV2` (motor
 * probabilístico avançado v3). Mantém a assinatura original.
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
 * Usa o motor probabilístico avançado (computeScoreV2): hipergeométrica
 * multivariada, KS de uniformidade, gaps/autocorrelação, soma normal e
 * entropia de Shannon, combinados com pesos 0.22/0.22/0.20/0.18/0.18.
 * Aceita opcionalmente um Map de frequências históricas (compat).
 */
export function calculateGameScore(
  game: number[],
  historicoFrequencias?: Map<number, number>,
): number {
  return computeScoreV2(game, historicoFrequencias).total
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
export const FIVE_GAMES_SIZE = 5
export const FIVE_GAMES_MIN_SELECTION = 5
export const FIVE_GAMES_MAX_SELECTION = 25

export interface FiveGamesResult {
  /** Os 5 jogos gerados, cada um com 5 dezenas ordenadas. */
  games: number[][]
  /** Dezenas do grupo que aparecem em ao menos 1 jogo. */
  covered: number[]
  /** Dezenas do grupo que não foram usadas em nenhum jogo. */
  uncovered: number[]
  /** Cobertura percentual (0–100). */
  coveragePercent: number
  /** Tamanho do grupo selecionado. */
  groupSize: number
  /** Número total de slots (sempre 25 = 5 × 5). */
  totalSlots: number
  /** Score probabilístico (0-100) de cada um dos 5 jogos. */
  scores: number[]
}

/**
 * Distribui as dezenas selecionadas em 5 jogos de 5 dezenas,
 * maximizando a cobertura do grupo e balanceando a repetição.
 */
export function optimizeFiveGames(selected: number[]): FiveGamesResult {
  const group = [...new Set(selected)].sort((a, b) => a - b)
  const groupSize = group.length
  const totalSlots = FIVE_GAMES_COUNT * FIVE_GAMES_SIZE // 25

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

export type OptimizationMeta = 'cobertura' | 'equilibrado' | 'score' | 'elite'

export interface OptimizationWeights {
  score: number
  cobertura: number
  sobreposicao: number
}

export const META_WEIGHTS: Record<OptimizationMeta, OptimizationWeights> = {
  cobertura: { score: 1, cobertura: 6, sobreposicao: 2 },
  equilibrado: { score: 2, cobertura: 4, sobreposicao: 1 },
  score: { score: 5, cobertura: 1, sobreposicao: 1 },
  // Meta "Score Elite": prioriza o score máximo mesmo sacrificando cobertura.
  elite: { score: 9, cobertura: 0.2, sobreposicao: 0.5 },
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

  // Meta "Score Elite": prioriza jogos com score máximo (≥90%) mesmo
  // sacrificando cobertura — escolhe sequencialmente os de maior score.
  // Meta "Melhor Score": maximin — maximiza o score MÍNIMO entre os 5
  // jogos (não apenas a média).
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
        // Elite: foco quase total no score do próprio candidato.
        value = cand.score * w.score + newCoverage * w.cobertura - overlapPenalty * w.sobreposicao
      } else if (isMaximin) {
        // Maximin: valoriza elevar o score mínimo do conjunto.
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
 * Novo algoritmo de nível mundial para o Modo 5 Jogos:
 *  1. Gera todas as combinações de 5 a partir do grupo selecionado
 *     (quando viável) e pontua cada uma pelo score probabilístico.
 *  2. Seleciona o 1º jogo: maior score.
 *  3. Para jogos 2-5: seleciona o que maximiza
 *        score × 0.4 + cobertura_marginal × 0.6
 *     onde cobertura_marginal = nº de NOVOS pares/trios cobertos.
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
  // Pares
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      set.add(`${sorted[i]}-${sorted[j]}`)
    }
  }
  // Trios
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

  // Pesos por meta (mesma semântica de V2, aplicados no score base)
  const w = META_WEIGHTS[meta]

  // 1. Gera candidatas
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

  // 2. Pontua cada candidata (score V2 com frequências históricas)
  const scored = candidates.map((c) => ({
    game: c,
    score: calculateGameScore(c, historicoFrequencias),
  }))
  scored.sort((a, b) => b.score - a.score)

  const chosen: { game: number[]; score: number }[] = []
  const usadas = new Set<number>()
  const paresTriosCobertos = new Set<string>()

  // Meta "Score Elite": prioriza jogos de score máximo (≥90%) mesmo
  // sacrificando cobertura. Meta "Melhor Score": maximin (maximiza o
  // score MÍNIMO entre os 5 jogos, não apenas a média).
  const isElite = meta === 'elite'
  const isMaximin = meta === 'score'

  // 3. Seleção greedy
  while (chosen.length < FIVE_GAMES_COUNT && scored.length > 0) {
    let bestIdx = -1
    let bestValue = -Infinity

    for (let i = 0; i < scored.length; i++) {
      const cand = scored[i]

      if (chosen.length === 0) {
        // 1º jogo: maior score (ponderado pela meta)
        const value = cand.score * w.score + dezenasNovas(cand.game, usadas) * w.cobertura
        if (value > bestValue) {
          bestValue = value
          bestIdx = i
        }
        continue
      }

      // Jogos 2-5: garante ao menos 2 dezenas diferentes das já usadas
      // (exceto na meta Elite, que ignora cobertura para maximizar score)
      const novas = dezenasNovas(cand.game, usadas)
      if (!isElite && novas < 2 && groupSize > k) continue

      const margCobertura = coberturaMarginal(cand.game, paresTriosCobertos)
      let value: number
      if (isElite) {
        // Elite: foco quase total no score; cobertura desprezível.
        value = cand.score * (w.score / 2) + margCobertura * (w.cobertura / 4)
      } else if (isMaximin) {
        // Maximin: valoriza elevar o score mínimo do conjunto.
        const currentMin = Math.min(...chosen.map((c) => c.score))
        const newMin = Math.min(currentMin, cand.score)
        value = newMin * 0.4 * (w.score / 2) + margCobertura * 0.6 * (w.cobertura / 4)
      } else {
        // score × 0.4 + cobertura_marginal × 0.6 (ajustado pela meta)
        const pesoScore = 0.4 * (w.score / 2)
        const pesoCob = 0.6 * (w.cobertura / 4)
        value = cand.score * pesoScore + margCobertura * pesoCob
      }
      if (value > bestValue) {
        bestValue = value
        bestIdx = i
      }
    }

    // Se nenhum candidato satisfaz a restrição de 2 dezenas novas,
    // relaxa e pega o de maior score
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

  // Preenche jogos faltantes (grupo muito pequeno)
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
 * ============================================================
 * Calcula a probabilidade de ao menos 1 dos jogos acertar 4 ou
 * mais dezenas (quadra+). Delega para o motor avançado
 * (Bonferroni 2ª ordem).
 * ============================================================ */
export function probabilityAtLeastFourPlus(games: number[][]): number {
  if (!games || games.length === 0) return 0
  return calcularProbabilidadeCombinada(games).peloMenosQuadra
}

/**
 * Exporta os 5 jogos otimizados para um arquivo .txt formatado.
 */
export function buildFiveGamesExportText(result: FiveGamesResult, selected: number[]): string {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = now.getFullYear()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')

  const header = [
    `# ==========================================================`,
    `# Otimizador Estratégico Mega-Sena — Modo 5 Jogos`,
    `# Data de Geração: ${day}/${month}/${year} às ${hours}:${minutes}`,
    `# Dezenas do Grupo (${selected.length}): ${selected.map(formatTwoDigits).join(', ')}`,
    `# Cobertura: ${result.coveragePercent}% | Cobertas: ${result.covered.length} | Fora: ${result.uncovered.length}`,
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
      return `Jogo ${String(idx + 1).padStart(2, '0')}: ${formatGameString(game)} | Score: ${score}% (${label}) | P(≥Quadra): ${pQuadraUmEm}`
    })
    .join('\n')

  const avgScore =
    result.scores.length > 0
      ? Math.round(result.scores.reduce((acc, s) => acc + s, 0) / result.scores.length)
      : 0

  // Análise combinada
  const comb = calcularProbabilidadeCombinada(result.games)
  const evTotal = calcularEVConjunto(result.games)
  const combPct = (comb.peloMenosQuadra * 100).toFixed(4)

  const footer = [
    ``,
    `# Score Médio dos 5 Jogos: ${avgScore}%`,
    `# Prob. combinada de ≥Quadra (Bonferroni 2ª ordem): ${combPct}%`,
    `# Valor Esperado (EV) total: ${formatCurrencyBRL(evTotal)} (custo: ${formatCurrencyBRL(result.games.length * PRICE_PER_GAME)})`,
    `# Motor probabilístico: hipergeométrica multivariada, KS de uniformidade, gaps/autocorrelação, soma normal, entropia de Shannon, Bonferroni`,
  ].join('\n')

  return `${header}\n${body}\n${footer}\n`
}
