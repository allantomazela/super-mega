/* ============================================================
 * Base estática de concursos históricos da Mega-Sena
 *
 * Contém os resultados reais dos últimos concursos (do mais
 * recente para o mais antigo). Utilizada pela Simulação Histórica
 * para comparar os jogos gerados contra sorteios reais.
 *
 * Fonte: resultados oficiais divulgados pelas Loterias Caixa.
 * ============================================================ */

export interface ConcursoHistorico {
  /** Número do concurso. */
  numero: number
  /** Data do sorteio no formato DD/MM/AAAA. */
  data: string
  /** As 6 dezenas sorteadas, ordenadas. */
  dezenas: number[]
}

/**
 * Últimos 50 concursos da Mega-Sena (mais recente primeiro).
 * Base estática — usada como fallback quando a API ao vivo
 * estiver indisponível.
 */
export const CONCURSOS_HISTORICOS: ConcursoHistorico[] = [
  { numero: 2954, data: '20/12/2025', dezenas: [1, 9, 37, 39, 42, 44] },
  { numero: 2953, data: '18/12/2025', dezenas: [5, 10, 24, 25, 47, 54] },
  { numero: 2952, data: '16/12/2025', dezenas: [1, 20, 45, 48, 51, 58] },
  { numero: 2951, data: '13/12/2025', dezenas: [5, 8, 30, 31, 37, 45] },
  { numero: 2950, data: '11/12/2025', dezenas: [21, 23, 42, 49, 50, 60] },
  { numero: 2949, data: '09/12/2025', dezenas: [4, 6, 11, 38, 49, 54] },
  { numero: 2948, data: '06/12/2025', dezenas: [6, 24, 37, 52, 53, 58] },
  { numero: 2947, data: '04/12/2025', dezenas: [4, 10, 15, 37, 39, 44] },
  { numero: 2946, data: '02/12/2025', dezenas: [4, 13, 17, 21, 49, 54] },
  { numero: 2945, data: '29/11/2025', dezenas: [1, 2, 3, 7, 27, 33] },
  { numero: 2944, data: '27/11/2025', dezenas: [8, 15, 23, 39, 40, 59] },
  { numero: 2943, data: '25/11/2025', dezenas: [8, 29, 30, 36, 39, 60] },
  { numero: 2942, data: '22/11/2025', dezenas: [12, 30, 40, 46, 54, 60] },
  { numero: 2941, data: '18/11/2025', dezenas: [14, 30, 33, 35, 48, 51] },
  { numero: 2940, data: '14/11/2025', dezenas: [7, 8, 9, 13, 22, 53] },
  { numero: 2939, data: '11/11/2025', dezenas: [22, 31, 33, 37, 42, 49] },
  { numero: 2938, data: '08/11/2025', dezenas: [10, 14, 15, 35, 44, 56] },
  { numero: 2937, data: '06/11/2025', dezenas: [12, 17, 26, 34, 44, 52] },
  { numero: 2936, data: '04/11/2025', dezenas: [4, 7, 9, 15, 29, 32] },
  { numero: 2935, data: '01/11/2025', dezenas: [9, 18, 28, 34, 38, 57] },
  { numero: 2934, data: '30/10/2025', dezenas: [9, 17, 23, 26, 33, 59] },
  { numero: 2933, data: '28/10/2025', dezenas: [1, 18, 22, 42, 48, 50] },
  { numero: 2932, data: '25/10/2025', dezenas: [4, 13, 25, 36, 40, 53] },
  { numero: 2931, data: '23/10/2025', dezenas: [4, 19, 23, 36, 47, 52] },
  { numero: 2930, data: '21/10/2025', dezenas: [1, 11, 13, 14, 36, 45] },
  { numero: 2929, data: '18/10/2025', dezenas: [3, 7, 8, 34, 35, 51] },
  { numero: 2928, data: '16/10/2025', dezenas: [14, 24, 29, 32, 46, 48] },
  { numero: 2927, data: '14/10/2025', dezenas: [11, 27, 34, 55, 56, 58] },
  { numero: 2926, data: '11/10/2025', dezenas: [3, 4, 14, 35, 45, 49] },
  { numero: 2925, data: '09/10/2025', dezenas: [7, 9, 12, 13, 24, 27] },
  { numero: 2924, data: '07/10/2025', dezenas: [10, 19, 30, 40, 48, 54] },
  { numero: 2923, data: '04/10/2025', dezenas: [18, 27, 32, 39, 55, 56] },
  { numero: 2922, data: '02/10/2025', dezenas: [4, 23, 30, 39, 40, 41] },
  { numero: 2921, data: '30/09/2025', dezenas: [9, 12, 14, 16, 26, 36] },
  { numero: 2920, data: '27/09/2025', dezenas: [8, 12, 16, 19, 31, 58] },
  { numero: 2919, data: '25/09/2025', dezenas: [3, 26, 28, 37, 42, 53] },
  { numero: 2918, data: '23/09/2025', dezenas: [11, 27, 31, 41, 48, 54] },
  { numero: 2917, data: '20/09/2025', dezenas: [6, 19, 38, 41, 46, 57] },
  { numero: 2916, data: '18/09/2025', dezenas: [5, 11, 16, 27, 40, 45] },
  { numero: 2915, data: '16/09/2025', dezenas: [10, 11, 15, 38, 52, 60] },
  { numero: 2914, data: '13/09/2025', dezenas: [18, 25, 35, 40, 46, 47] },
  { numero: 2913, data: '11/09/2025', dezenas: [17, 21, 34, 52, 55, 60] },
  { numero: 2912, data: '09/09/2025', dezenas: [9, 25, 37, 41, 51, 59] },
  { numero: 2911, data: '06/09/2025', dezenas: [23, 27, 32, 54, 56, 59] },
  { numero: 2910, data: '04/09/2025', dezenas: [3, 4, 11, 15, 28, 29] },
  { numero: 2909, data: '02/09/2025', dezenas: [8, 21, 31, 41, 53, 58] },
  { numero: 2908, data: '30/08/2025', dezenas: [20, 35, 36, 37, 38, 50] },
  { numero: 2907, data: '28/08/2025', dezenas: [30, 33, 42, 44, 52, 56] },
  { numero: 2906, data: '26/08/2025', dezenas: [17, 33, 37, 41, 46, 49] },
  { numero: 2905, data: '23/08/2025', dezenas: [4, 17, 18, 26, 43, 52] },
]

/* ============================================================
 * Tipos da Simulação Histórica
 * ============================================================ */

export interface ResultadoJogoSimulacao {
  /** O jogo avaliado. */
  jogo: number[]
  /** Número de concursos com quadra (4 acertos). */
  quadras: number
  /** Número de concursos com quina (5 acertos). */
  quinas: number
  /** Número de concursos com sena (6 acertos). */
  senas: number
  /** Taxa de acerto = concursos com ≥ quadra / total × 100. */
  taxaAcerto: number
}

export interface ResumoSimulacao {
  /** Resultado por jogo. */
  jogos: ResultadoJogoSimulacao[]
  /** Total de concursos avaliados. */
  totalConcursos: number
  /** Média da taxa de acerto de todos os jogos. */
  taxaAcertoMedia: number
  /** Soma de quadras de todos os jogos. */
  totalQuadras: number
  /** Soma de quinas de todos os jogos. */
  totalQuinas: number
  /** Soma de senas de todos os jogos. */
  totalSenas: number
  /** Origem dos dados: 'api' ou 'estatica'. */
  origem: 'api' | 'estatica'
}

/* ============================================================
 * Lógica de simulação
 * ============================================================ */

/**
 * Conta quantas dezenas do jogo estão presentes no concurso.
 */
function contarAcertos(jogo: number[], concurso: number[]): number {
  const setConcurso = new Set(concurso)
  let acertos = 0
  for (const n of jogo) {
    if (setConcurso.has(n)) acertos++
  }
  return acertos
}

/**
 * Avalia um único jogo contra todos os concursos históricos.
 */
export function simularJogo(
  jogo: number[],
  concursos: ConcursoHistorico[],
): ResultadoJogoSimulacao {
  let quadras = 0
  let quinas = 0
  let senas = 0
  let comPeloMenosQuadra = 0

  for (const c of concursos) {
    const acertos = contarAcertos(jogo, c.dezenas)
    if (acertos >= 6) {
      senas++
      quinas++
      quadras++
      comPeloMenosQuadra++
    } else if (acertos === 5) {
      quinas++
      quadras++
      comPeloMenosQuadra++
    } else if (acertos === 4) {
      quadras++
      comPeloMenosQuadra++
    }
  }

  const total = concursos.length
  const taxaAcerto = total > 0 ? Math.round((comPeloMenosQuadra / total) * 1000) / 10 : 0

  return { jogo, quadras, quinas, senas, taxaAcerto }
}

/**
 * Simula uma lista de jogos contra a base histórica.
 * Cada jogo é avaliado individualmente.
 */
export function simularJogos(
  jogos: number[][],
  concursos: ConcursoHistorico[],
): ResultadoJogoSimulacao[] {
  return jogos.map((jogo) => simularJogo(jogo, concursos))
}

/**
 * Simulação combinada de um conjunto de jogos (Modo 5 Jogos):
 * para cada concurso, se QUALQUER um dos jogos acertou ≥ quadra,
 * conta como acerto do conjunto. Retorna um único resultado agregado.
 */
export function simularConjunto(
  jogos: number[][],
  concursos: ConcursoHistorico[],
): ResultadoJogoSimulacao {
  let quadras = 0
  let quinas = 0
  let senas = 0
  let comPeloMenosQuadra = 0

  for (const c of concursos) {
    let melhorAcerto = 0
    for (const jogo of jogos) {
      const acertos = contarAcertos(jogo, c.dezenas)
      if (acertos > melhorAcerto) melhorAcerto = acertos
    }
    if (melhorAcerto >= 6) {
      senas++
      quinas++
      quadras++
      comPeloMenosQuadra++
    } else if (melhorAcerto === 5) {
      quinas++
      quadras++
      comPeloMenosQuadra++
    } else if (melhorAcerto === 4) {
      quadras++
      comPeloMenosQuadra++
    }
  }

  const total = concursos.length
  const taxaAcerto = total > 0 ? Math.round((comPeloMenosQuadra / total) * 1000) / 10 : 0

  // "jogo" aqui é a união das dezenas (apenas para exibição)
  const uniao = [...new Set(jogos.flat())].sort((a, b) => a - b)
  return { jogo: uniao, quadras, quinas, senas, taxaAcerto }
}

/**
 * Monta o resumo completo da simulação de múltiplos jogos.
 */
export function montarResumoSimulacao(
  jogos: number[][],
  concursos: ConcursoHistorico[],
  origem: 'api' | 'estatica' = 'estatica',
): ResumoSimulacao {
  const resultados = simularJogos(jogos, concursos)
  const totalQuadras = resultados.reduce((acc, r) => acc + r.quadras, 0)
  const totalQuinas = resultados.reduce((acc, r) => acc + r.quinas, 0)
  const totalSenas = resultados.reduce((acc, r) => acc + r.senas, 0)
  const taxaAcertoMedia =
    resultados.length > 0
      ? Math.round(
          (resultados.reduce((acc, r) => acc + r.taxaAcerto, 0) / resultados.length) * 10,
        ) / 10
      : 0

  return {
    jogos: resultados,
    totalConcursos: concursos.length,
    taxaAcertoMedia,
    totalQuadras,
    totalQuinas,
    totalSenas,
    origem,
  }
}

/* ============================================================
 * Fetch ao vivo (com fallback para base estática)
 * ============================================================ */

const API_BASE = 'https://loteriascaixa-api.herokuapp.com/api/mega-sena'

interface ApiConcurso {
  numero?: number
  data?: string
  dezenas?: string[]
  listaDezenas?: string[]
}

/**
 * Busca concursos ao vivo da API loteriascaixa-api.
 * Tenta buscar os últimos N concursos a partir do mais recente.
 * Retorna null se a API estiver indisponível.
 */
export async function buscarConcursosAoVivo(quantidade = 50): Promise<ConcursoHistorico[] | null> {
  try {
    // Busca o concurso mais recente para descobrir o número atual
    const respLatest = await fetch(`${API_BASE}/latest`, {
      signal: AbortSignal.timeout(6000),
    })
    if (!respLatest.ok) return null
    const latest = (await respLatest.json()) as ApiConcurso
    const numeroLatest = latest?.numero
    if (!numeroLatest || !latest?.dezenas) return null

    // Busca os concursos anteriores em paralelo (lotes)
    const alvos: number[] = []
    for (let i = 0; i < quantidade; i++) {
      alvos.push(numeroLatest - i)
    }

    const resultados: ConcursoHistorico[] = []
    // Busca em lotes de 10 para não estourar simultaneidade
    const TAMANHO_LOTE = 10
    for (let ini = 0; ini < alvos.length; ini += TAMANHO_LOTE) {
      const lote = alvos.slice(ini, ini + TAMANHO_LOTE)
      const respostas = await Promise.allSettled(
        lote.map(async (num) => {
          const r = await fetch(`${API_BASE}/${num}`, { signal: AbortSignal.timeout(6000) })
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        }),
      )
      for (const r of respostas) {
        if (r.status === 'fulfilled') {
          const dados = r.value as ApiConcurso
          const dezenas = (dados.dezenas ?? dados.listaDezenas ?? [])
            .map((d) => parseInt(d, 10))
            .filter((n) => !Number.isNaN(n))
            .sort((a, b) => a - b)
          if (dezenas.length === 6 && dados.numero && dados.data) {
            resultados.push({ numero: dados.numero, data: dados.data, dezenas })
          }
        }
      }
    }

    // Ordena do mais recente para o mais antigo
    resultados.sort((a, b) => b.numero - a.numero)

    if (resultados.length < 10) return null // muito poucos — usa fallback
    return resultados.slice(0, quantidade)
  } catch {
    return null
  }
}
