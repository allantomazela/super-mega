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
  }
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
    .map((game, idx) => `Jogo ${String(idx + 1).padStart(2, '0')}: ${formatGameString(game)}`)
    .join('\n')

  return `${header}\n${body}\n`
}
