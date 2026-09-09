import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import { formatTwoDigits } from '@/modules/lotofacil/utils/math/combinacoes'
import {
  buscarUltimoResultadoLotofacil,
  CAIXA_LOTOFACIL_RESULTADOS_URL,
} from '@/modules/lotofacil/services/caixaLotofacil'
import type { ResultadoOficialLotofacil } from '@/modules/lotofacil/types'

export function UltimoSorteioLotofacil() {
  const [info, setInfo] = useState<ResultadoOficialLotofacil | null>(null)
  const [falhou, setFalhou] = useState(false)

  useEffect(() => {
    let cancelado = false
    void (async () => {
      const oficial = await buscarUltimoResultadoLotofacil()
      if (cancelado) return
      if (oficial) setInfo(oficial)
      else setFalhou(true)
    })()
    return () => {
      cancelado = true
    }
  }, [])

  if (!info) {
    if (!falhou) return null
    return (
      <section className="rounded-2xl border border-amber-500/25 bg-[#12161b] px-4 py-3 text-xs text-amber-200">
        Não foi possível consultar o resultado oficial da Lotofácil.{' '}
        <a
          href={CAIXA_LOTOFACIL_RESULTADOS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-violet-300"
        >
          Ver no site das Loterias
        </a>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-violet-500/25 bg-[#12161b] px-3 py-2.5 sm:px-5 sm:py-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-5">
        <div className="flex items-center gap-2 text-violet-400 shrink-0">
          <Trophy className="w-4 h-4" />
          <div>
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Último sorteio</div>
            <div className="text-sm font-bold text-white">
              Concurso {info.numero}
              <span className="ml-2 font-medium text-zinc-400">{info.data}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {info.dezenas.map((n) => (
            <span
              key={n}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-violet-500 text-white text-[11px] sm:text-xs font-bold flex items-center justify-center"
            >
              {formatTwoDigits(n)}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
