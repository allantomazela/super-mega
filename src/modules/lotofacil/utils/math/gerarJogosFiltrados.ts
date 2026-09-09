import type { FiltrosLotofacil } from '@/modules/lotofacil/types'
import { getCombinations, shuffleInPlace } from '@/modules/lotofacil/utils/math/combinacoes'
import { avaliarFiltros, scoreFiltros } from '@/modules/lotofacil/utils/math/filtros'
import { LF_MAX_POOL, LF_TICKET } from '@/modules/lotofacil/utils/math/constants'

export const LF_QTD_JOGOS_MIN = 1
export const LF_QTD_JOGOS_MAX = 50
export const LF_QTD_JOGOS_PADRAO = 10
const MAX_SAMPLE = 8000

export function clampQtdJogosLotofacil(n: number): number {
  if (!Number.isFinite(n)) return LF_QTD_JOGOS_PADRAO
  return Math.min(LF_QTD_JOGOS_MAX, Math.max(LF_QTD_JOGOS_MIN, Math.round(n)))
}

/**
 * Une dezenas dos jogos escolhidos, priorizando as que mais se repetem
 * (úteis para montar um pool “dos melhores scores”).
 */
export function combinarPoolDeJogos(jogos: number[][], maxPool = LF_MAX_POOL): number[] {
  const freq = new Map<number, number>()
  for (const jogo of jogos) {
    for (const n of jogo) {
      if (n < 1 || n > 25) continue
      freq.set(n, (freq.get(n) ?? 0) + 1)
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, maxPool)
    .map(([n]) => n)
    .sort((a, b) => a - b)
}

export function gerarJogosFiltrados(
  pool: number[],
  filtros: FiltrosLotofacil,
  anterior: number[] | null,
  quantidade: number,
): { jogos: number[][]; aviso?: string } {
  const qtd = clampQtdJogosLotofacil(quantidade)
  const numeros = [...new Set(pool)].filter((n) => n >= 1 && n <= 25).sort((a, b) => a - b)

  if (numeros.length < LF_TICKET) {
    return {
      jogos: [],
      aviso: `Pool com ${numeros.length} dezenas — precisa de ao menos ${LF_TICKET}.`,
    }
  }

  if (numeros.length === LF_TICKET) {
    const av = avaliarFiltros(numeros, filtros, anterior)
    return {
      jogos: [numeros],
      aviso: av.ok ? undefined : `Jogo único fora das faixas: ${av.motivos.join('; ')}`,
    }
  }

  const all = getCombinations(numeros, LF_TICKET)
  const sample = all.length > MAX_SAMPLE ? shuffleInPlace([...all]).slice(0, MAX_SAMPLE) : all

  const ranqueados = sample
    .map((jogo) => ({
      jogo,
      ok: avaliarFiltros(jogo, filtros, anterior).ok,
      score: scoreFiltros(jogo, filtros, anterior),
    }))
    .filter((x) => x.ok)
    .sort((a, b) => b.score - a.score)

  const escolhidos = ranqueados.slice(0, qtd).map((x) => x.jogo)
  if (escolhidos.length === 0) {
    return {
      jogos: [],
      aviso:
        'Nenhum bilhete de 15 passou nos filtros neste pool. Afrouxe as faixas ou mude as dezenas.',
    }
  }

  return {
    jogos: escolhidos,
    aviso:
      escolhidos.length < qtd
        ? `Só ${escolhidos.length} de ${qtd} bilhetes passaram nos filtros com este pool.`
        : undefined,
  }
}
