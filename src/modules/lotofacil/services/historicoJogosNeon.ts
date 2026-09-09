import { neonData } from '@/lib/neonDataClient'
import type { RetrospectivaLotofacil } from '@/modules/lotofacil/utils/math/probabilidade'

export type StatusJogoLotofacil = 'pendente' | 'conferido'

export interface JogoLotofacilSalvo {
  id: string
  user_id: string
  dezenas: number[]
  modo: string
  status: StatusJogoLotofacil
  concurso_alvo: number | null
  afinidade_previsao: number | null
  score_filtros: number | null
  perfil_previsao: string | null
  previsao_dezenas: number[] | null
  retrospectiva: RetrospectivaLotofacil | null
  nota: string | null
  resultado_concurso: number | null
  resultado_dezenas: number[] | null
  resultado_acertos: number | null
  resultado_acertadas: number[] | null
  created_at: string
  updated_at: string
}

export interface NovoJogoLotofacil {
  dezenas: number[]
  modo?: string
  concurso_alvo?: number | null
  afinidade_previsao?: number | null
  score_filtros?: number | null
  perfil_previsao?: string | null
  previsao_dezenas?: number[] | null
  retrospectiva?: RetrospectivaLotofacil | null
  nota?: string | null
}

function erroMsg(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return fallback
}

export async function listarJogosLotofacil(): Promise<JogoLotofacilSalvo[]> {
  const { data, error } = await neonData
    .from('jogos_lotofacil')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw new Error(erroMsg(error, 'Não foi possível carregar o histórico Lotofácil.'))
  return (data ?? []) as JogoLotofacilSalvo[]
}

export async function salvarJogosLotofacil(
  jogos: NovoJogoLotofacil[],
): Promise<JogoLotofacilSalvo[]> {
  if (!jogos.length) return []
  const payload = jogos.map((j) => ({
    dezenas: j.dezenas,
    modo: j.modo ?? 'manual',
    status: 'pendente' as const,
    concurso_alvo: j.concurso_alvo ?? null,
    afinidade_previsao: j.afinidade_previsao ?? null,
    score_filtros: j.score_filtros ?? null,
    perfil_previsao: j.perfil_previsao ?? null,
    previsao_dezenas: j.previsao_dezenas ?? null,
    retrospectiva: j.retrospectiva ?? null,
    nota: j.nota ?? null,
  }))

  const { data, error } = await neonData.from('jogos_lotofacil').insert(payload).select('*')
  if (error) throw new Error(erroMsg(error, 'Falha ao salvar jogos na nuvem (Neon).'))
  return (data ?? []) as JogoLotofacilSalvo[]
}

export async function removerJogoLotofacil(id: string): Promise<void> {
  const { error } = await neonData.from('jogos_lotofacil').delete().eq('id', id)
  if (error) throw new Error(erroMsg(error, 'Não foi possível remover o jogo.'))
}

export async function marcarConferidoLotofacil(
  id: string,
  resultado: {
    concurso: number
    dezenas: number[]
    acertos: number
    acertadas: number[]
  },
): Promise<JogoLotofacilSalvo> {
  const { data, error } = await neonData
    .from('jogos_lotofacil')
    .update({
      status: 'conferido',
      resultado_concurso: resultado.concurso,
      resultado_dezenas: resultado.dezenas,
      resultado_acertos: resultado.acertos,
      resultado_acertadas: resultado.acertadas,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(erroMsg(error, 'Falha ao conferir o jogo.'))
  return data as JogoLotofacilSalvo
}
