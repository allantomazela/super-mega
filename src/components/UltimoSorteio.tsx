import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import { useConcursos } from '@/hooks/useConcursos'
import { formatTwoDigits } from '@/lib/megaEngine'

const API_LATEST = 'https://loteriascaixa-api.herokuapp.com/api/megasena/latest'

interface UltimoInfo {
  numero: number
  data: string
  dezenas: number[]
  acumulou?: boolean
  proximo?: number
  dataProximo?: string
  estimado?: number
}

export function UltimoSorteio() {
  const { concursos } = useConcursos()
  const [info, setInfo] = useState<UltimoInfo | null>(null)

  useEffect(() => {
    let cancelado = false
    void (async () => {
      try {
        const resp = await fetch(API_LATEST)
        if (!resp.ok) return
        const d = (await resp.json()) as {
          concurso?: number
          numero?: number
          data?: string
          dezenas?: string[]
          acumulou?: boolean
          proximoConcurso?: number
          dataProximoConcurso?: string
          valorEstimadoProximoConcurso?: number
        }
        const numero = d.concurso ?? d.numero
        const dezenas = (d.dezenas ?? [])
          .map((x) => parseInt(x, 10))
          .filter((n) => n >= 1 && n <= 60)
          .sort((a, b) => a - b)
        if (!numero || !d.data || dezenas.length !== 6 || cancelado) return
        setInfo({
          numero,
          data: d.data,
          dezenas,
          acumulou: d.acumulou,
          proximo: d.proximoConcurso,
          dataProximo: d.dataProximoConcurso,
          estimado: d.valorEstimadoProximoConcurso,
        })
      } catch {
        /* usa fallback do histórico */
      }
    })()
    return () => {
      cancelado = true
    }
  }, [])

  const base = concursos[0]
  const atual: UltimoInfo | null = info ?? (base
    ? { numero: base.numero, data: base.data, dezenas: base.dezenas }
    : null)

  if (!atual) return null

  return (
    <section className="rounded-2xl border border-emerald-500/25 bg-[#12161b] px-4 py-3 sm:px-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
        <div className="flex items-center gap-2 text-emerald-400 shrink-0">
          <Trophy className="w-4 h-4" />
          <div>
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Último sorteio</div>
            <div className="text-sm font-bold text-white">
              Concurso {atual.numero}
              <span className="ml-2 font-medium text-zinc-400">{atual.data}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {atual.dezenas.map((n) => (
            <span
              key={n}
              className="w-8 h-8 rounded-full emerald-gradient text-white text-xs font-bold flex items-center justify-center"
            >
              {formatTwoDigits(n)}
            </span>
          ))}
        </div>
        <div className="sm:ml-auto text-xs text-zinc-400">
          {atual.acumulou ? (
            <span className="text-amber-300 font-semibold">Acumulou</span>
          ) : (
            <span className="text-emerald-300">Houve ganhador(es) da Sena</span>
          )}
          {atual.proximo && atual.estimado ? (
            <span className="block sm:inline sm:ml-2">
              Próx. {atual.proximo}
              {atual.dataProximo ? ` (${atual.dataProximo})` : ''}:{' '}
              {atual.estimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  )
}
