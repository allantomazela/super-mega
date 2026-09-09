/** Combinações e utilitários numéricos (funções puras). */

export function binomialCoefficient(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  if (k === 0 || k === n) return 1
  const kk = Math.min(k, n - k)
  let result = 1
  for (let i = 1; i <= kk; i++) {
    result = (result * (n - kk + i)) / i
  }
  return Math.round(result)
}

export function getCombinations<T>(pool: T[], k: number): T[][] {
  const result: T[][] = []
  if (k < 0 || k > pool.length) return result
  const current: T[] = []
  function backtrack(start: number) {
    if (current.length === k) {
      result.push([...current])
      return
    }
    for (let i = start; i < pool.length; i++) {
      current.push(pool[i]!)
      backtrack(i + 1)
      current.pop()
    }
  }
  backtrack(0)
  return result
}

/** Embaralha in-place (Fisher–Yates) e devolve a mesma referência. */
export function shuffleInPlace<T>(arr: T[], rng: () => number = Math.random): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = arr[i]!
    arr[i] = arr[j]!
    arr[j] = tmp
  }
  return arr
}

export function formatTwoDigits(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

export function formatGameString(jogo: number[]): string {
  return [...jogo]
    .sort((a, b) => a - b)
    .map(formatTwoDigits)
    .join(' - ')
}

export function countIntersection(a: number[], b: Set<number>): number {
  let n = 0
  for (const x of a) if (b.has(x)) n++
  return n
}
