import { useEffect, useState } from 'react'
import { Trophy, Banknote } from 'lucide-react'
import { formatTwoDigits } from '@/lib/megaEngine'
import {
  buscarUltimoResultadoOficial,
  CAIXA_RESULTADOS_URL,
  type ResultadoOficialMega,
} from '@/lib/caixaLoterias'

function formatBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

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

  const senaGanha = info.ganhadoresSena > 0
  const temEstimado = Boolean(info.proximo && info.estimado && info.estimado > 0)

  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-emerald-500/25 bg-[#12161b] px-4 py-3 sm:px-5">
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
      </div>

      {temEstimado ? (
        <div className="rounded-2xl border border-amber-500/35 bg-gradient-to-br from-amber-950/50 via-[#161a1f] to-[#12161b] px-4 py-4 sm:px-5 shadow-[0_0_24px_rgba(245,158,11,0.08)]">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
                <Banknote className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-amber-400/90 font-semibold">
                  Prêmio estimado do próximo concurso
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-amber-200 tabular-nums tracking-tight">
                  {formatBRL(info.estimado!)}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  Concurso {info.proximo}
                  {info.dataProximo ? ` · ${info.dataProximo}` : ''}
                  {info.acumulado || !senaGanha
                    ? ' — valor aproximado divulgado pela Caixa caso ninguém leve a Sena (acumulado).'
                    : ' — estimativa oficial da Caixa para o próximo sorteio.'}{' '}
                  Pode variar com as apostas até o fechamento do concurso.
                </p>
              </div>
            </div>
            <a
              href={CAIXA_RESULTADOS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="sm:ml-auto shrink-0 text-[11px] font-semibold text-amber-200/90 border border-amber-500/30 rounded-lg px-3 py-2 hover:bg-amber-500/10 transition-colors text-center"
            >
              Confirmar na Caixa
            </a>
          </div>
        </div>
      ) : null}
    </section>
  )
}
