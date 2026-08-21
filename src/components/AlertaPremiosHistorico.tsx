import { useEffect, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import { useHistoricoUsuario } from '@/hooks/useHistoricoUsuario'
import { carregarHistoricoUsuario, labelPremio } from '@/lib/historicoUsuarioStorage'
import { formatGameString } from '@/lib/megaEngine'
import { buscarUltimoResultadoOficial } from '@/lib/caixaLoterias'

/**
 * Conferência automática dos jogos confirmados (pendentes) contra o último
 * sorteio oficial. Emite toast se houver Quadra/Quina/Sena.
 */
export function AlertaPremiosHistorico() {
  const { userId, confirmados, conferirJogosContraSorteio, marcarConferido, adicionarConferencia, registrarAlertaVisto } =
    useHistoricoUsuario()

  const pendingKey = useMemo(
    () =>
      confirmados
        .filter((c) => c.status === 'pendente')
        .map((c) => c.id)
        .join('|'),
    [confirmados],
  )

  const processadosSessao = useRef(new Set<string>())

  useEffect(() => {
    if (!userId || !pendingKey) return
    let cancelado = false

    void (async () => {
      const oficial = await buscarUltimoResultadoOficial()
      if (cancelado || !oficial || oficial.dezenas.length !== 6) return

      const fresco = carregarHistoricoUsuario(userId)
      const pendentes = fresco.confirmados.filter((c) => c.status === 'pendente')

      for (const item of pendentes) {
        const chave = `${item.id}:${oficial.numero}`
        if (processadosSessao.current.has(chave)) continue
        if (item.concursoNumero != null && oficial.numero < item.concursoNumero) continue

        processadosSessao.current.add(chave)

        const jogos = conferirJogosContraSorteio(item.jogos, oficial.dezenas)
        const melhor = Math.max(0, ...jogos.map((j) => j.acertos))
        marcarConferido(item.id, {
          dezenasSorteadas: oficial.dezenas,
          jogos,
          concursoNumero: oficial.numero,
        })
        adicionarConferencia({
          modo: item.modo,
          dezenasSorteadas: oficial.dezenas,
          jogos,
          grupo: `Confirmado · concurso ${oficial.numero}`,
        })

        const premio = labelPremio(melhor)
        const alertaId = `premio:${item.id}:${oficial.numero}`
        if (premio && !fresco.alertasVistos.includes(alertaId)) {
          const destaque = jogos.find((j) => j.acertos === melhor)
          toast.success(`Premiação no histórico: ${premio}`, {
            description: `Concurso ${oficial.numero}: ${melhor} acertos${
              destaque ? ` · ${formatGameString(destaque.jogo)}` : ''
            }`,
            duration: 12_000,
          })
          registrarAlertaVisto(alertaId)
        }
      }
    })()

    return () => {
      cancelado = true
    }
  }, [
    userId,
    pendingKey,
    conferirJogosContraSorteio,
    marcarConferido,
    adicionarConferencia,
    registrarAlertaVisto,
  ])

  return null
}
