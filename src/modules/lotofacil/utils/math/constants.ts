/** Constantes oficiais / estatísticas da Lotofácil. */

export const LF_UNIVERSO = 25
export const LF_TICKET = 15
export const LF_MIN_POOL = 15
export const LF_MAX_POOL = 20

/** Preço vigente da aposta simples (15 dezenas) — Caixa, 2026. */
export const LF_PRECO_SIMPLES = 3.5

/** Moldura (borda do volante 5×5). */
export const LF_MOLDURA = new Set([
  1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25,
])

/** Miolo / centro. */
export const LF_MIOLO = new Set([7, 8, 9, 12, 13, 14, 17, 18, 19])

export const LF_PRIMOS = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23])

export const LF_FIBONACCI = new Set([1, 2, 3, 5, 8, 13, 21])

/** Teto seguro do covering guloso no browser (C(20,15)=15504). */
export const LF_FECHAMENTO_MAX_POOL = 20
export const LF_FECHAMENTO_SOFT_POOL = 18
