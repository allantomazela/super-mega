import type { ConcursoLotofacil } from '@/modules/lotofacil/types'

/**
 * Base mínima embutida (fallback offline).
 * O histórico completo vem de Neon (`public/data/lotofacil.json`) ou API Caixa.
 */
export const CONCURSOS_LOTOFACIL_ESTATICOS: ConcursoLotofacil[] = [
  {
    numero: 3200,
    data: '01/01/2026',
    dezenas: [1, 2, 4, 5, 7, 9, 11, 12, 14, 16, 18, 20, 22, 23, 25],
  },
  {
    numero: 3199,
    data: '31/12/2025',
    dezenas: [1, 3, 4, 6, 8, 10, 11, 13, 15, 17, 19, 21, 22, 24, 25],
  },
  {
    numero: 3198,
    data: '30/12/2025',
    dezenas: [2, 3, 5, 6, 7, 9, 12, 13, 14, 16, 18, 19, 21, 23, 24],
  },
]
