import { useEffect, useState } from 'react'
import { CONCURSOS_HISTORICOS, type ConcursoHistorico } from '@/data/concursosHistoricos'
import { carregarConcursos, type OrigemConcursos } from '@/data/carregarConcursos'

export function useConcursos() {
  const [concursos, setConcursos] = useState<ConcursoHistorico[]>(CONCURSOS_HISTORICOS)
  const [origem, setOrigem] = useState<OrigemConcursos>('estatica')

  useEffect(() => {
    let cancelado = false
    carregarConcursos(50)
      .then((resultado) => {
        if (cancelado) return
        setConcursos(resultado.concursos)
        setOrigem(resultado.origem)
      })
      .catch(() => {
        /* mantém base estática */
      })
    return () => {
      cancelado = true
    }
  }, [])

  return { concursos, origem }
}
