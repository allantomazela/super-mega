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
 * Score de Acertividade (Motor Probabilístico)
 * Pontua cada jogo de 0 a 100 com base em 5 critérios de 20pts,
 * cada um fundamentado em matemática probabilística rigorosa:
 *   a) Paridade ........... Distribuição Hipergeométrica
 *   b) Soma ................ Z-Score Gaussiano
 *   c) Datas/EV ............ Probabilidade Binomial
 *   d) Décadas ............. Entropia de Shannon
 *   e) Gaps ................ Teste de Regularidade (CV dos gaps)
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
 * a) Paridade — Distribuição Hipergeométrica (0-20pts)
 *
 * Em 60 dezenas há K=30 pares (e 30 ímpares). A divisão par/ímpar
 * num jogo de tamanho n segue uma hipergeométrica:
 *   P(evens) = C(30, evens) * C(30, odds) / C(60, n)
 * Score = 20 * (P_observada / P_máxima), onde P_máxima é a
 * probabilidade da divisão mais equilibrada possível para n.
 */
function parityScore(game: number[]): number {
  const n = game.length
  if (n === 0) return 0
  const evens = game.filter((num) => num % 2 === 0).length
  const odds = n - evens

  // Probabilidade exata da divisão observada
  const total = binomialCoefficient(60, n)
  const probObserved = (binomialCoefficient(30, evens) * binomialCoefficient(30, odds)) / total

  // Probabilidade máxima: divisão mais equilibrada (evens ≈ n/2)
  const balancedEven = Math.floor(n / 2)
  const balancedOdd = n - balancedEven
  const probMax =
    (binomialCoefficient(30, balancedEven) * binomialCoefficient(30, balancedOdd)) / total

  const score = probMax > 0 ? 20 * (probObserved / probMax) : 0
  return Math.max(0, Math.min(20, score))
}

/**
 * b) Soma — Z-Score Gaussiano (0-20pts)
 *
 * A soma de n números uniformes [1,60] tem:
 *   μ = n * 30.5
 *   σ = sqrt(n * (60² - 1) / 12)   (variância da uniforme discreta)
 * z = |soma - μ| / σ. Quanto menor o z, mais próximo da média.
 * Score = max(0, 20 - z * 8).
 */
function sumScore(game: number[]): number {
  const n = game.length
  if (n === 0) return 0
  const sum = game.reduce((acc, curr) => acc + curr, 0)
  const mu = n * 30.5
  const sigma = Math.sqrt((n * (60 * 60 - 1)) / 12)
  const z = Math.abs(sum - mu) / sigma
  return Math.max(0, 20 - z * 8)
}

/**
 * c) Datas/EV — Probabilidade Binomial (0-20pts)
 *
 * Probabilidade de uma dezena ser de calendário (1-31): p = 31/60.
 * Número esperado de dezenas de calendário: n * p.
 * Score máximo quando ≤ 1 dezena de calendário, decaindo linearmente
 * com a distância acima do esperado até 0.
 */
function expectedValueScore(game: number[]): number {
  const n = game.length
  if (n === 0) return 0
  const p = 31 / 60
  const calendarCount = game.filter((num) => num >= 1 && num <= 31).length

  // Score máximo quando há no máximo 1 dezena de calendário
  if (calendarCount <= 1) return 20

  // Esperado = n * p. Distância acima do esperado penaliza o score.
  const expected = n * p
  const excess = Math.max(0, calendarCount - Math.max(1, expected))
  // Decai ~6 pts por dezena acima do esperado/limite
  const score = 20 - excess * 6
  return Math.max(0, Math.min(20, score))
}

/**
 * d) Entropia de Décadas (0-20pts)
 *
 * Divide [1,60] em 6 faixas de 10. Calcula a entropia de Shannon
 * H = -Σ(pi * ln(pi)) com pi = count_i / n.
 * Entropia máxima = ln(6) ≈ 1.791 (distribuição uniforme).
 * Score = 20 * (H / ln(6)).
 */
function decadeScore(game: number[]): number {
  const n = game.length
  if (n === 0) return 0
  const decades = new Array(6).fill(0)
  game.forEach((num) => {
    const idx = Math.min(Math.floor((num - 1) / 10), 5)
    decades[idx] += 1
  })

  let entropy = 0
  decades.forEach((c) => {
    if (c > 0) {
      const pi = c / n
      entropy -= pi * Math.log(pi)
    }
  })

  const maxEntropy = Math.log(6) // ≈ 1.791
  const score = maxEntropy > 0 ? 20 * (entropy / maxEntropy) : 0
  return Math.max(0, Math.min(20, score))
}

/**
 * e) Uniformidade de Gaps — Teste de Regularidade (0-20pts)
 *
 * Para n números ordenados há n-1 gaps. O gap esperado sob
 * distribuição uniforme é ≈ (60 - n) / (n + 1). O coeficiente de
 * variação (CV = desvio_padrão / média) dos gaps aproxima 1 para
 * um RNG uniforme (gaps ~ exponencial). Score = max(0, 20 - |CV-1|*15).
 */
function gapScore(game: number[]): number {
  const n = game.length
  if (n < 2) return 0
  const sorted = [...game].sort((a, b) => a - b)
  const gaps: number[] = []
  for (let i = 1; i < n; i++) {
    gaps.push(sorted[i] - sorted[i - 1])
  }
  const mean = gaps.reduce((acc, g) => acc + g, 0) / gaps.length
  if (mean === 0) return 0
  const variance = gaps.reduce((acc, g) => acc + (g - mean) ** 2, 0) / gaps.length
  const stdDev = Math.sqrt(variance)
  const cv = stdDev / mean
  return Math.max(0, 20 - Math.abs(cv - 1) * 15)
}

/**
 * Calcula o Score de Acertividade de um jogo (0-100).
 * Soma de 5 critérios probabilísticos de 20 pontos cada,
 * arredondada para inteiro.
 */
export function calculateGameScore(game: number[]): number {
  if (!game || game.length === 0) return 0
  const total =
    parityScore(game) +
    sumScore(game) +
    expectedValueScore(game) +
    decadeScore(game) +
    gapScore(game)
  return Math.round(Math.max(0, Math.min(100, total)))
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
 * Gera exatamente 5 jogos de 5 dezenas cada a partir de um
 * grupo de dezenas selecionadas, maximizando a cobertura do
 * grupo (cada dezena aparece no maior número possível de
 * jogos) e balanceando a repetição entre as dezenas.
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
 *
 * Estratégia (gulosa por "rounds"):
 *  - Cada jogo é preenchido por rodadas (round 0 = 1ª dezena de
 *    cada jogo, round 1 = 2ª dezena, ...). Isso espalha cada
 *    dezena em jogos diferentes, evitando concentrá-la.
 *  - Em cada rodada, percorremos os 5 jogos em ordem cíclica
 *    (offset alterna a cada rodada para variar a distribuição)
 *    e atribuímos a próxima dezena menos usada que ainda não
 *    está naquele jogo. A dezena mais usada é evitada, então a
 *    repetição é uniforme.
 *  - Quando o grupo acaba, repetimos dezenas seguindo a ordem
 *    de menos usadas → mais usadas, nunca colocando a mesma
 *    dezena duas vezes no mesmo jogo.
 */
export function optimizeFiveGames(selected: number[]): FiveGamesResult {
  const group = [...new Set(selected)].sort((a, b) => a - b)
  const groupSize = group.length
  const totalSlots = FIVE_GAMES_COUNT * FIVE_GAMES_SIZE // 25

  const games: number[][] = Array.from({ length: FIVE_GAMES_COUNT }, () => [])
  const usage = new Map<number, number>()
  group.forEach((n) => usage.set(n, 0))

  // Próxima dezena a ser inserida (cicla pelo grupo)
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

      // Offset do jogo alterna por rodada para variar quem recebe o quê
      const gameIndex = (g + round) % FIVE_GAMES_COUNT
      if (games[gameIndex].length >= FIVE_GAMES_SIZE) continue

      const startOffset = (cursor + round * 2) % Math.max(groupSize, 1)
      const order = pickOrder(startOffset)

      // 1ª tentativa: dezena do grupo ainda não neste jogo, menos usada
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

      // 2ª tentativa (grupo pequeno): dezena do grupo neste jogo,
      // escolhendo a menos usada — repete quando inevitável
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

  // Garante que cada jogo tenha exatamente 5 dezenas
  for (let g = 0; g < FIVE_GAMES_COUNT; g++) {
    while (games[g].length < FIVE_GAMES_SIZE) {
      // Preenche eventual lacuna com a dezena menos usada do grupo
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
 *
 * Nova versão que combina cobertura máxima do grupo com scores
 * probabilísticos individuais, minimizando a sobreposição de
 * dezenas entre os 5 jogos.
 *
 * Estratégia:
 *  a) Gera todas as C(n,5) combinações do grupo quando n ≤ 21
 *     (≤ 20349 candidatas). Acima disso, usa amostragem gulosa.
 *  b) Calcula o score probabilístico de cada candidata.
 *  c) Seleciona 5 jogos que maximizam a cobertura do grupo E os
 *     scores individuais, penalizando sobreposição de dezenas.
 * ============================================================ */
const V2_MAX_FULL_COMBINATIONS = 21 // n ≤ 21 → enumera tudo

/**
 * Meta de otimização do Modo 5 Jogos. Ajusta os pesos internos
 * do algoritmo guloso de seleção:
 *  - cobertura: máxima cobertura do grupo (prioriza dezenas novas)
 *  - score:      prioriza o score probabilístico individual
 *  - sobrepos:   penaliza repetição de dezenas entre jogos
 */
export type OptimizationMeta = 'cobertura' | 'equilibrado' | 'score'

export interface OptimizationWeights {
  score: number
  cobertura: number
  sobreposicao: number
}

/**
 * Pesos por meta. Equilibrado é o padrão (comportamento atual).
 */
export const META_WEIGHTS: Record<OptimizationMeta, OptimizationWeights> = {
  cobertura: { score: 1, cobertura: 6, sobreposicao: 2 },
  equilibrado: { score: 2, cobertura: 4, sobreposicao: 1 },
  score: { score: 5, cobertura: 1, sobreposicao: 1 },
}

export const DEFAULT_META: OptimizationMeta = 'equilibrado'

export function optimizeFiveGamesV2(
  selected: number[],
  meta: OptimizationMeta = DEFAULT_META,
): FiveGamesResult {
  const w = META_WEIGHTS[meta]
  const group = [...new Set(selected)].sort((a, b) => a - b)
  const groupSize = group.length
  const totalSlots = FIVE_GAMES_COUNT * FIVE_GAMES_SIZE // 25
  const k = FIVE_GAMES_SIZE // 5

  // Gera candidatas
  let candidates: number[][]
  if (groupSize <= k) {
    // Grupo mínimo: repete para preencher 5 jogos
    candidates = [group]
  } else if (groupSize <= V2_MAX_FULL_COMBINATIONS) {
    candidates = generateCombinations(group, k)
  } else {
    // Amostragem gulosa: combinações das primeiras 21 dezenas
    // (garante cobertura do núcleo) + candidatas aleatórias
    // determinísticas envolvendo as dezenas restantes.
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

  // Pontua todas as candidatas
  const scored = candidates.map((c) => ({ game: c, score: calculateGameScore(c) }))
  // Ordena por score decrescente
  scored.sort((a, b) => b.score - a.score)

  const chosen: { game: number[]; score: number }[] = []
  const usage = new Map<number, number>()
  group.forEach((n) => usage.set(n, 0))
  const coveredSet = new Set<number>()

  // Seleção gulosa: maximiza (score + cobertura nova - penalidade por repetição)
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
      // Valor = score + cobertura nova - sobreposição (pesos conforme a meta)
      const value =
        cand.score * w.score + newCoverage * w.cobertura - overlapPenalty * w.sobreposicao
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

  // Preenche jogos faltantes (grupo muito pequeno) repetindo o melhor
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

/**
 * Recalcula o FiveGamesResult a partir de jogos editados manualmente
 * (após drag-and-drop). Recalcula cobertura, cobertas/fora e scores,
 * mantendo o mesmo shape retornado pelo otimizador.
 */
export function recomputeFiveGamesResult(games: number[][], group: number[]): FiveGamesResult {
  const sortedGroup = [...new Set(group)].sort((a, b) => a - b)
  const groupSize = sortedGroup.length
  const totalSlots = FIVE_GAMES_COUNT * FIVE_GAMES_SIZE
  const coveredSet = new Set<number>()
  games.forEach((g) => g.forEach((n) => coveredSet.add(n)))
  const covered = [...coveredSet].sort((a, b) => a - b)
  const uncovered = sortedGroup.filter((n) => !coveredSet.has(n))
  const coveragePercent = groupSize > 0 ? Math.round((coveredSet.size / groupSize) * 1000) / 10 : 0
  const scores = games.map((g) => calculateGameScore(g))
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
 * Probabilidade combinada de acerto (análise do Modo 5 Jogos)
 *
 * Calcula a probabilidade de ao menos 1 dos jogos acertar 4 ou
 * mais dezenas (quadra+), considerando a UNIÃO das dezenas dos 5
 * jogos. A Mega-Sena sorteia 6 dezenas de 60; cada jogo possui 5
 * dezenas. A probabilidade de um jogo de 5 dezenas acertar exatamente
 * j dezenas do sorteio é hipergeométrica:
 *   P(j | m=5) = C(m, j) * C(60 - m, 6 - j) / C(60, 6)
 * Para 4+ acertos num jogo de 5 dezenas, somamos j=4 e j=5.
 *
 * Aproximação da união: com k jogos independentes e probabilidades
 * p_i por jogo, P(ao menos 1) ≈ 1 - Π(1 - p_i). Como os jogos
 * compartilham dezenas (dependência), esta é uma estimativa
 * razoável (limite superior) usada para fins informativos.
 * ============================================================ */
export function probabilityAtLeastFourPlus(games: number[][]): number {
  if (!games || games.length === 0) return 0
  const total60 = binomialCoefficient(60, 6)
  let complement = 1 // Π(1 - p_i)

  for (const game of games) {
    const m = game.length
    if (m === 0) continue
    // P(acertar 4+) num jogo de m dezenas
    let p4plus = 0
    for (let j = 4; j <= Math.min(m, 6); j++) {
      const ways = binomialCoefficient(m, j) * binomialCoefficient(60 - m, 6 - j)
      p4plus += ways / total60
    }
    complement *= 1 - p4plus
  }
  return Math.max(0, 1 - complement)
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
      return `Jogo ${String(idx + 1).padStart(2, '0')}: ${formatGameString(game)} | Score: ${score}% (${label})`
    })
    .join('\n')

  const avgScore =
    result.scores.length > 0
      ? Math.round(result.scores.reduce((acc, s) => acc + s, 0) / result.scores.length)
      : 0
  const footer = [
    ``,
    `# Score Médio dos 5 Jogos: ${avgScore}%`,
    `# Motor probabilístico: hipergeométrica, z-score, binomial, entropia de Shannon, regularidade de gaps`,
  ].join('\n')

  return `${header}\n${body}\n${footer}\n`
}
