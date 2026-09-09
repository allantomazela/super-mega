import { binomialCoefficient } from '@/modules/lotofacil/utils/math/combinacoes'
import { LF_TICKET, LF_UNIVERSO } from '@/modules/lotofacil/utils/math/constants'
import type { ConcursoLotofacil } from '@/modules/lotofacil/types'
import { compararComHistorico } from '@/modules/lotofacil/utils/math/analiseHistorica'

/** Hipergeométrica: N=25, K=15 sorteadas, n=15 no volante. */
export function probabilidadeAcertosLotofacil(k: number, n = LF_TICKET): number {
  if (k < 0 || k > n || n > LF_UNIVERSO) return 0
  const N = LF_UNIVERSO
  const K = LF_TICKET
  const miss = n - k
  if (miss < 0 || miss > N - K) return 0
  const denom = binomialCoefficient(N, n)
  if (denom === 0) return 0
  return (binomialCoefficient(K, k) * binomialCoefficient(N - K, miss)) / denom
}

export function probabilidadePremioLotofacil(n = LF_TICKET): {
  p11: number
  p12: number
  p13: number
  p14: number
  p15: number
  pPremio: number
} {
  const p11 = probabilidadeAcertosLotofacil(11, n)
  const p12 = probabilidadeAcertosLotofacil(12, n)
  const p13 = probabilidadeAcertosLotofacil(13, n)
  const p14 = probabilidadeAcertosLotofacil(14, n)
  const p15 = probabilidadeAcertosLotofacil(15, n)
  return { p11, p12, p13, p14, p15, pPremio: p15 }
}

/** % de dezenas do jogo que batem com a sugestão de previsão (0–100). */
export function afinidadeComPrevisao(jogo: number[], previsao: number[]): number {
  if (jogo.length === 0 || previsao.length === 0) return 0
  const set = new Set(previsao)
  const hits = jogo.filter((n) => set.has(n)).length
  return Math.round((hits / Math.min(jogo.length, LF_TICKET)) * 100)
}

export interface RetrospectivaLotofacil {
  janela: number
  melhor: number
  media: number
  faixas: Record<'11' | '12' | '13' | '14' | '15', number>
  /** Quantas vezes acertou exatamente 15 (alvo de premiação do app). */
  vezesPremio: number
}

export function resumoRetrospectiva(
  jogo: number[],
  concursos: ConcursoLotofacil[],
  janela = 50,
): RetrospectivaLotofacil {
  const comps = compararComHistorico(jogo, concursos, janela)
  const faixas = { '11': 0, '12': 0, '13': 0, '14': 0, '15': 0 }
  let melhor = 0
  let soma = 0
  let vezesPremio = 0
  for (const c of comps) {
    soma += c.acertos
    melhor = Math.max(melhor, c.acertos)
    if (c.acertos >= 11 && c.acertos <= 15) {
      faixas[String(c.acertos) as keyof typeof faixas]++
    }
    if (c.acertos >= 15) vezesPremio++
  }
  return {
    janela: comps.length,
    melhor,
    media: comps.length ? soma / comps.length : 0,
    faixas,
    vezesPremio,
  }
}

/** Neste app o alvo de premiação Lotofácil é somente 15 pontos. */
export function labelPremioLotofacil(acertos: number): string | null {
  if (acertos >= 15) return '15 pontos'
  return null
}

export function formatChance1Em(p: number): string {
  if (p <= 0) return '—'
  const n = Math.round(1 / p)
  return `1 em ${n.toLocaleString('pt-BR')}`
}
