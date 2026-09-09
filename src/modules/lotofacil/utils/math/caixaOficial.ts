import {
  LF_MAX_POOL,
  LF_MIN_POOL,
  LF_PRECO_SIMPLES,
  LF_TICKET,
} from '@/modules/lotofacil/utils/math/constants'
import { binomialCoefficient } from '@/modules/lotofacil/utils/math/combinacoes'

export function clampPoolLotofacil(n: number): number {
  if (!Number.isFinite(n)) return LF_TICKET
  return Math.min(LF_MAX_POOL, Math.max(LF_MIN_POOL, Math.round(n)))
}

/** Preço oficial: C(n,15) × preço simples (desdobramento no mesmo volante). */
export function precoOficialLotofacil(dezenas: number): number {
  const n = clampPoolLotofacil(dezenas)
  return binomialCoefficient(n, LF_TICKET) * LF_PRECO_SIMPLES
}

export function formatCurrencyBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
