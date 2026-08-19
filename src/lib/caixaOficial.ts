/** Preço vigente da aposta simples da Mega-Sena (Caixa, 2026). */
export const PRECO_SIMPLES_CAIXA = 6

/** Mínimo e máximo oficiais de dezenas no volante da Mega-Sena. */
export const MEGA_MIN_DEZENAS = 6
export const MEGA_MAX_DEZENAS = 20

export interface FaixaApostaCaixa {
  dezenas: number
  combinacoes: number
  preco: number
}

export function combinacoesSimples(n: number, k = 6): number {
  if (k < 0 || k > n) return 0
  if (k === 0 || k === n) return 1
  const kk = Math.min(k, n - k)
  let result = 1
  for (let i = 1; i <= kk; i++) {
    result = (result * (n - kk + i)) / i
  }
  return Math.round(result)
}

export function precoOficialCaixa(dezenas: number): number {
  return combinacoesSimples(dezenas) * PRECO_SIMPLES_CAIXA
}

/** Tabela oficial: 6 a 20 dezenas no mesmo volante (desdobramento da Caixa). */
export const TABELA_OFICIAL_MEGA: FaixaApostaCaixa[] = Array.from({ length: 15 }, (_, i) => {
  const dezenas = i + MEGA_MIN_DEZENAS
  const combinacoes = combinacoesSimples(dezenas)
  return { dezenas, combinacoes, preco: combinacoes * PRECO_SIMPLES_CAIXA }
})
