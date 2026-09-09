import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/lib/AuthContext'
import {
  listarJogosLotofacil,
  marcarConferidoLotofacil,
} from '@/modules/lotofacil/services/historicoJogosNeon'
import { buscarUltimoResultadoLotofacil } from '@/modules/lotofacil/services/caixaLotofacil'
import { formatGameString } from '@/modules/lotofacil/utils/math/combinacoes'
import { labelPremioLotofacil } from '@/modules/lotofacil/utils/math/probabilidade'
import {
  carregarAlertasLotofacilVistos,
  registrarAlertaLotofacilVisto,
} from '@/modules/lotofacil/lib/alertasPremioStorage'

/**
 * Conferência automática dos jogos Lotofácil pendentes (Neon)
 * contra o último sorteio oficial. Toast se houver 11–15 pontos.
 */
export function AlertaPremiosLotofacil() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const processadosSessao = useRef(new Set<string>())
  const rodando = useRef(false)

  useEffect(() => {
    if (!user?.id) return
    let cancelado = false

    void (async () => {
      if (rodando.current) return
      rodando.current = true
      try {
        const [oficial, jogos] = await Promise.all([
          buscarUltimoResultadoLotofacil(),
          listarJogosLotofacil(),
        ])
        if (cancelado || !oficial || oficial.dezenas.length !== 15) return

        const sorteio = new Set(oficial.dezenas)
        const vistos = carregarAlertasLotofacilVistos(user.id)
        const pendentes = jogos.filter((j) => j.status === 'pendente')

        for (const item of pendentes) {
          const chave = `${item.id}:${oficial.numero}`
          if (processadosSessao.current.has(chave)) continue
          if (item.concurso_alvo != null && oficial.numero < item.concurso_alvo) continue

          processadosSessao.current.add(chave)

          const acertadas = item.dezenas.filter((d) => sorteio.has(d)).sort((a, b) => a - b)
          const acertos = acertadas.length

          try {
            await marcarConferidoLotofacil(item.id, {
              concurso: oficial.numero,
              dezenas: oficial.dezenas,
              acertos,
              acertadas,
            })
          } catch {
            processadosSessao.current.delete(chave)
            continue
          }

          if (cancelado) return

          const premio = labelPremioLotofacil(acertos)
          const alertaId = `lf-premio:${item.id}:${oficial.numero}`
          if (premio && !vistos.includes(alertaId)) {
            toast.success(`Lotofácil: ${premio}!`, {
              description: `Concurso ${oficial.numero}: ${acertos} acertos · ${formatGameString(item.dezenas)}`,
              duration: 14_000,
              action: {
                label: 'Histórico',
                onClick: () => navigate('/lotofacil/historico'),
              },
            })
            registrarAlertaLotofacilVisto(user.id, alertaId)
            vistos.push(alertaId)
          }
        }
      } catch {
        /* rede / auth — silencioso no header */
      } finally {
        rodando.current = false
      }
    })()

    return () => {
      cancelado = true
    }
  }, [user?.id, navigate])

  return null
}
