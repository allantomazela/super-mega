import { useEffect, useState } from 'react'
import type { ConcursoLotofacil, OrigemConcursosLotofacil } from '@/modules/lotofacil/types'
import { CONCURSOS_LOTOFACIL_ESTATICOS } from '@/modules/lotofacil/data/concursosHistoricos'
import { carregarHistoricoLotofacil } from '@/modules/lotofacil/services/carregarConcursos'

export function useLotofacilConcursos() {
  const [concursos, setConcursos] = useState<ConcursoLotofacil[]>(CONCURSOS_LOTOFACIL_ESTATICOS)
  const [origem, setOrigem] = useState<OrigemConcursosLotofacil>('estatica')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let cancelado = false
    void (async () => {
      const r = await carregarHistoricoLotofacil()
      if (cancelado) return
      setConcursos(r.concursos)
      setOrigem(r.origem)
      setCarregando(false)
    })()
    return () => {
      cancelado = true
    }
  }, [])

  return { concursos, origem, carregando }
}
