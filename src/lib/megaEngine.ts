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
