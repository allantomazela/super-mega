import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import { formatTwoDigits } from '@/lib/megaEngine'
import {
  buscarUltimoResultadoOficial,
  CAIXA_RESULTADOS_URL,
  type ResultadoOficialMega,
} from '@/lib/caixaLoterias'

export function UltimoSorteio() {
  const [info, setInfo] = useState<ResultadoOficialMega | null>(null)
  const [falhou, setFalhou] = useState(false)

  useEffect(() => {
    let cancelado = false
    void (async () => {
      const oficial = await buscarUltimoResultadoOficial()
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
        Não foi possível consultar o resultado oficial da Caixa.{' '}
        <a
          href={CAIXA_RESULTADOS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-emerald-300"
        >
          Ver no site das Loterias
        </a>
      </section>
    )
  }

  const senaGanha = !info.acumulado && info.ganhadoresSena > 0

  return (
    <section className="rounded-2xl border border-emerald-500/25 bg-[#12161b] px-4 py-3 sm:px-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
        <div className="flex items-center gap-2 text-emerald-400 shrink-0">
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
              className="w-8 h-8 rounded-full emerald-gradient text-white text-xs font-bold flex items-center justify-center"
            >
              {formatTwoDigits(n)}
            </span>
          ))}
        </div>
        <div className="sm:ml-auto text-xs text-zinc-400">
          {senaGanha ? (
            <span className="text-emerald-300 font-semibold">
              {info.ganhadoresSena} ganhador{info.ganhadoresSena === 1 ? '' : 'es'} da Sena
            </span>
          ) : (
            <span className="text-amber-300 font-semibold">Acumulou (sem ganhador da Sena)</span>
          )}
          {info.proximo && info.estimado ? (
            <span className="block sm:inline sm:ml-2">
              Próx. {info.proximo}
              {info.dataProximo ? ` (${info.dataProximo})` : ''}:{' '}
              {info.estimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          ) : null}
          <a
            href={CAIXA_RESULTADOS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block sm:inline sm:ml-2 text-zinc-500 hover:text-emerald-300 underline-offset-2 hover:underline"
          >
            Fonte: Loterias Caixa
          </a>
        </div>
      </div>
    </section>
  )
}
