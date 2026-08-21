import type { ConcursoHistorico } from '@/data/concursosHistoricos'

export type FaixaPremioHistorico = 'quadra' | 'quina' | 'sena'

export interface AcertoHistoricoConcurso {
  concurso: ConcursoHistorico
  /** Melhor faixa entre os jogos (≥4). */
  faixa: FaixaPremioHistorico
  melhorAcertos: number
  /** Índice do jogo (0-based) que alcançou o melhor acerto. */
  jogoIndex: number
  jogo: number[]
  acertadas: number[]
}

export interface ValidacaoHistoricaResultado {
  totalConcursos: number
  totalPremiacoes: number
  quadras: number
  quinas: number
  senas: number
  /** % de concursos com ≥ quadra. */
  taxaPremiacao: number
  acertos: AcertoHistoricoConcurso[]
}

function faixaDeAcertos(acertos: number): FaixaPremioHistorico | null {
  if (acertos >= 6) return 'sena'
  if (acertos === 5) return 'quina'
  if (acertos === 4) return 'quadra'
  return null
}

/**
 * Confere os jogos gerados (próximo sorteio) contra todos os concursos
 * já realizados: em cada sorteio passado, usa o melhor jogo do conjunto.
 * Contagens de faixa são exclusivas (sena não soma em quina/quadra).
 */
export function validarJogosContraHistorico(
  jogos: number[][],
  concursos: ConcursoHistorico[],
): ValidacaoHistoricaResultado {
  const acertos: AcertoHistoricoConcurso[] = []
  let quadras = 0
  let quinas = 0
  let senas = 0

  if (jogos.length === 0 || concursos.length === 0) {
    return {
      totalConcursos: concursos.length,
      totalPremiacoes: 0,
      quadras: 0,
      quinas: 0,
      senas: 0,
      taxaPremiacao: 0,
      acertos,
    }
  }

  for (const concurso of concursos) {
    const set = new Set(concurso.dezenas)
    let melhorAcertos = 0
    let melhorIdx = 0
    let melhorAcertadas: number[] = []

    for (let i = 0; i < jogos.length; i++) {
      const jogo = jogos[i]
      const acertadas = jogo.filter((n) => set.has(n))
      if (acertadas.length > melhorAcertos) {
        melhorAcertos = acertadas.length
        melhorIdx = i
        melhorAcertadas = acertadas
      }
    }

    const faixa = faixaDeAcertos(melhorAcertos)
    if (!faixa) continue

    if (faixa === 'sena') senas++
    else if (faixa === 'quina') quinas++
    else quadras++

    acertos.push({
      concurso,
      faixa,
      melhorAcertos,
      jogoIndex: melhorIdx,
      jogo: [...jogos[melhorIdx]].sort((a, b) => a - b),
      acertadas: [...melhorAcertadas].sort((a, b) => a - b),
    })
  }

  const totalPremiacoes = acertos.length
  const taxaPremiacao =
    concursos.length > 0
      ? Math.round((totalPremiacoes / concursos.length) * 1000) / 10
      : 0

  return {
    totalConcursos: concursos.length,
    totalPremiacoes,
    quadras,
    quinas,
    senas,
    taxaPremiacao,
    acertos,
  }
}
