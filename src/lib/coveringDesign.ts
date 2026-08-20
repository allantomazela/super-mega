/**
 * Fechamentos escaláveis L(n, 6, 6, t) para a Mega-Sena.
 *
 * Notação: n dezenas escolhidas, blocos de 6 (volante simples),
 * se as 6 sorteadas estiverem nas n, garante ≥ t acertos em algum bloco.
 *
 * v1+: só matrizes do REGISTRY após CHECKLIST em scripts/fechamento/.
 * Pipeline offline: npm run fechamento:gerar | fechamento:validar | fechamento:smoke
 */

import { combinacoesSimples } from '@/lib/caixaOficial'
import { MATRIZ_L11_QUINA } from '@/lib/fechamento/matrizes/l11-quina'
import { MATRIZ_L12_QUINA } from '@/lib/fechamento/matrizes/l12-quina'

export type GarantiaFechamento = 'quadra' | 'quina'

export const GARANTIA_T: Record<GarantiaFechamento, number> = {
  quadra: 4,
  quina: 5,
}

export const GARANTIA_LABEL: Record<GarantiaFechamento, string> = {
  quadra: 'Quadra',
  quina: 'Quina',
}

export const FECHAMENTO_N_MIN = 6
export const FECHAMENTO_N_MAX = 20

/** Matriz L(10,6,6,4) — 3 jogos, garantia de Quadra (validada 210/210). */
export const MATRIZ_L10_QUADRA: number[][] = [
  [1, 2, 3, 4, 5, 6],
  [1, 2, 7, 8, 9, 10],
  [3, 4, 5, 6, 7, 8],
]

/** Matriz clássica L(10,6,6,5) — índices 1..10 = D1..D10. */
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

export type StatusMatriz = 'verificada' | 'melhor_conhecida'

export interface MatrizFechamento {
  n: number
  garantia: GarantiaFechamento
  blocos: number[][]
  /** Ex.: L(10,6,6,5) */
  label: string
  fonte: string
  status: StatusMatriz
  /** true se o tamanho for ótimo conhecido na literatura / validado no app */
  otima?: boolean
}

const REGISTRY: MatrizFechamento[] = [
  {
    n: 10,
    garantia: 'quina',
    blocos: MATRIZ_L10,
    label: 'L(10,6,6,5)',
    fonte: 'Matriz clássica validada exaustivamente (210/210 sextetos)',
    status: 'verificada',
    otima: true,
  },
  {
    n: 10,
    garantia: 'quadra',
    blocos: MATRIZ_L10_QUADRA,
    label: 'L(10,6,6,4)',
    fonte:
      'Gerada offline (greedy+anneal, seed 42); validada 210/210 — scripts/fechamento/candidatos/L10-t4-3j-ok.json',
    status: 'verificada',
    otima: false,
  },
  {
    n: 11,
    garantia: 'quina',
    blocos: MATRIZ_L11_QUINA,
    label: 'L(11,6,6,5)',
    fonte:
      'Busca offline 8 seeds (searchBest); 24 jogos; validada 462/462 — L11-t5-24j-busca-ok.json (LB≥15, não ótima)',
    status: 'verificada',
    otima: false,
  },
  {
    n: 12,
    garantia: 'quina',
    blocos: MATRIZ_L12_QUINA,
    label: 'L(12,6,6,5)',
    fonte:
      'Busca offline 8 seeds (searchBest); 44 jogos; validada 924/924 — L12-t5-44j-busca-ok.json (LB≥25, não ótima)',
    status: 'verificada',
    otima: false,
  },
]

function chaveMatriz(n: number, garantia: GarantiaFechamento): string {
  return `${n}:${garantia}`
}

const REGISTRY_MAP = new Map(REGISTRY.map((m) => [chaveMatriz(m.n, m.garantia), m]))

export function listarMatrizesDisponiveis(): MatrizFechamento[] {
  return [...REGISTRY]
}

export function obterMatriz(n: number, garantia: GarantiaFechamento): MatrizFechamento | null {
  return REGISTRY_MAP.get(chaveMatriz(n, garantia)) ?? null
}

export function matrizDisponivel(n: number, garantia: GarantiaFechamento): boolean {
  return REGISTRY_MAP.has(chaveMatriz(n, garantia))
}

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
  let c = 0
  for (const x of a) if (bSet.has(x)) c++
  return c
}

/**
 * Valida lotto design: todo p-subconjunto de {1..n} encontra um bloco
 * com interseção ≥ t. Na Mega-Sena, p = 6 (dezenas sorteadas).
 */
export function validarLottoDesign(
  blocos: number[][],
  n: number,
  t: number,
  p = 6,
): boolean {
  if (n < p || t < 1 || t > Math.min(6, p)) return false
  for (const bloco of blocos) {
    if (bloco.length !== 6) return false
    if (bloco.some((i) => i < 1 || i > n)) return false
  }
  for (const sorteio of combinar(n, p)) {
    const set = new Set(sorteio)
    if (!blocos.some((b) => intersecao(b, set) >= t)) return false
  }
  return true
}

/** Confere se todo sexteto de {1..10} encontra um bloco com ≥ 5 acertos. */
export function validarMatrizL10(blocos = MATRIZ_L10): boolean {
  return validarLottoDesign(blocos, 10, 5, 6)
}

const _validacaoCache = new Map<string, boolean>()

export function matrizEstaVerificada(matriz: MatrizFechamento): boolean {
  const key = chaveMatriz(matriz.n, matriz.garantia)
  const cached = _validacaoCache.get(key)
  if (cached != null) return cached
  const ok = validarLottoDesign(matriz.blocos, matriz.n, GARANTIA_T[matriz.garantia], 6)
  _validacaoCache.set(key, ok)
  return ok
}

export function aplicarFechamento(
  dezenas: number[],
  n: number,
  garantia: GarantiaFechamento,
): number[][] {
  const matriz = obterMatriz(n, garantia)
  if (!matriz) {
    throw new Error(`Matriz L(${n},6,6,${GARANTIA_T[garantia]}) ainda não disponível.`)
  }
  const ordenadas = [...new Set(dezenas)].sort((a, b) => a - b)
  if (ordenadas.length !== n) {
    throw new Error(`O fechamento ${matriz.label} exige exatamente ${n} dezenas.`)
  }
  return matriz.blocos.map((bloco) =>
    bloco.map((i) => ordenadas[i - 1]).sort((a, b) => a - b),
  )
}

export function aplicarFechamentoL10(dezenas: number[]): number[][] {
  return aplicarFechamento(dezenas, 10, 'quina')
}

export interface EstatisticaFechamento {
  jogos: number
  combinacoesTotais: number
  reducaoPct: number
  custoFechamento: number
  custoCompleto: number
  custoOficialCaixa: number
  /** P(Sena | 6 nas n) ≈ jogos / C(n,6) sob a matriz */
  pSenaSe6NasN: number
  /** @deprecated use pSenaSe6NasN */
  pSenaSe6Nas10: number
  label: string
  garantia: GarantiaFechamento
  status: StatusMatriz
  fonte: string
  otima?: boolean
}

export function estatisticaFechamento(
  n: number,
  garantia: GarantiaFechamento,
  precoSimples: number,
): EstatisticaFechamento | null {
  const matriz = obterMatriz(n, garantia)
  if (!matriz) return null
  const jogos = matriz.blocos.length
  const combinacoesTotais = combinacoesSimples(n, 6)
  const p = jogos / combinacoesTotais
  return {
    jogos,
    combinacoesTotais,
    reducaoPct: Math.round((1 - jogos / combinacoesTotais) * 1000) / 10,
    custoFechamento: jogos * precoSimples,
    custoCompleto: combinacoesTotais * precoSimples,
    custoOficialCaixa: combinacoesTotais * precoSimples,
    pSenaSe6NasN: p,
    pSenaSe6Nas10: p,
    label: matriz.label,
    garantia: matriz.garantia,
    status: matriz.status,
    fonte: matriz.fonte,
    otima: matriz.otima,
  }
}

export function estatisticaFechamentoL10(precoSimples: number): EstatisticaFechamento {
  const stats = estatisticaFechamento(10, 'quina', precoSimples)
  if (!stats) throw new Error('Matriz L10 ausente do registry')
  return stats
}
