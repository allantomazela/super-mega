import { useEffect, useState } from 'react'
import { CONCURSOS_HISTORICOS, type ConcursoHistorico } from '@/data/concursosHistoricos'
import {
  carregarHistoricoCompleto,
  type OrigemConcursos,
} from '@/data/carregarConcursos'

/** Histórico completo (snapshot Neon) para validação / simulação. */
export function useConcursos() {
  const [concursos, setConcursos] = useState<ConcursoHistorico[]>(CONCURSOS_HISTORICOS)
  const [origem, setOrigem] = useState<OrigemConcursos>('estatica')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let cancelado = false
    setCarregando(true)
    carregarHistoricoCompleto()
      .then((resultado) => {
        if (cancelado) return
        setConcursos(resultado.concursos)
        setOrigem(resultado.origem)
      })
      .catch(() => {
        /* mantém base estática */
      })
      .finally(() => {
        if (!cancelado) setCarregando(false)
      })
    return () => {
      cancelado = true
    }
  }, [])

  return { concursos, origem, carregando }
}
