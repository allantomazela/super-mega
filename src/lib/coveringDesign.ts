/**
 * Fechamento combinatório L(10, 6, 6, 5): 14 volantes de 6 dezenas
 * que cobrem as 210 combinações C(10,6) com garantia de quina
 * se as 6 sorteadas estiverem entre as 10 escolhidas.
 *
 * Índices 1..10 correspondem a D1..D10 (dezenas em ordem crescente).
 */
export const MATRIZ_L10: number[][] = [
  [2, 4, 5, 7, 8, 9],
  [2, 5, 6, 7, 9, 10],
  [1, 3, 6, 7, 9, 10],
  [1, 2, 3, 6, 7, 8],
  [1, 3, 4, 5, 7, 9],
  [2, 3, 4, 8, 9, 10],
  [1, 4, 5, 6, 8, 10],
  [2, 3, 4, 5, 6, 10],
  [1, 2, 7, 8, 9, 10],
  [1, 3, 5, 6, 8, 9],
  [3, 4, 5, 7, 8, 10],
  [3, 4, 6, 7, 8, 10],
  [1, 2, 3, 4, 5, 10],
  [1, 2, 4, 6, 7, 9],
]

export const FECHAMENTO_L10_JOGOS = MATRIZ_L10.length
export const FECHAMENTO_L10_UNIVERSO = 10
export const FECHAMENTO_L10_TOTAL_COMBOS = 210

function combinar(n: number, k: number): number[][] {
  const out: number[][] = []
  const acc: number[] = []
  function rec(start: number) {
    if (acc.length === k) {
      out.push([...acc])
      return
    }
    for (let i = start; i <= n - (k - acc.length) + 1; i++) {
      acc.push(i)
      rec(i + 1)
      acc.pop()
    }
  }
  rec(1)
  return out
}

function intersecao(a: number[], bSet: Set<number>): number {
  let n = 0
  for (const x of a) if (bSet.has(x)) n++
  return n
}

/** Confere se todo sexteto de {1..10} encontra um bloco com ≥ 5 acertos. */
export function validarMatrizL10(blocos = MATRIZ_L10): boolean {
  for (const sexteto of combinar(10, 6)) {
    const set = new Set(sexteto)
    if (!blocos.some((b) => intersecao(b, set) >= 5)) return false
  }
  return true
}

export function aplicarFechamentoL10(dezenas: number[]): number[][] {
  const ordenadas = [...new Set(dezenas)].sort((a, b) => a - b)
  if (ordenadas.length !== 10) {
    throw new Error('O fechamento L(10,6,6,5) exige exatamente 10 dezenas.')
  }
  return MATRIZ_L10.map((bloco) => bloco.map((i) => ordenadas[i - 1]).sort((a, b) => a - b))
}

export interface EstatisticaFechamento {
  jogos: number
  combinacoesTotais: number
  reducaoPct: number
  custoFechamento: number
  custoCompleto: number
  custoOficialCaixa: number
  pSenaSe6Nas10: number
}

export function estatisticaFechamentoL10(precoSimples: number): EstatisticaFechamento {
  const jogos = FECHAMENTO_L10_JOGOS
  const combinacoesTotais = FECHAMENTO_L10_TOTAL_COMBOS
  return {
    jogos,
    combinacoesTotais,
    reducaoPct: Math.round((1 - jogos / combinacoesTotais) * 1000) / 10,
    custoFechamento: jogos * precoSimples,
    custoCompleto: combinacoesTotais * precoSimples,
    custoOficialCaixa: combinacoesTotais * precoSimples,
    pSenaSe6Nas10: jogos / combinacoesTotais,
  }
}
