import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
import {
  carregarHistoricoUsuario,
  salvarHistoricoUsuario,
  novoId,
  conferirJogosContraSorteio,
  type ConferenciaRealizada,
  type JogoConfirmado,
  type HistoricoUsuarioStore,
  type ConferenciaRealizadaJogo,
} from '@/lib/historicoUsuarioStorage'

export type {
  ConferenciaRealizada,
  ConferenciaRealizadaJogo,
  JogoConfirmado,
} from '@/lib/historicoUsuarioStorage'

/**
 * Histórico isolado por usuário autenticado.
 * Sem user → listas vazias (não acessa dados de terceiros).
 */
export function useHistoricoUsuario() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [store, setStore] = useState<HistoricoUsuarioStore>(() =>
    userId ? carregarHistoricoUsuario(userId) : { conferencias: [], confirmados: [], alertasVistos: [] },
  )

  useEffect(() => {
    if (!userId) {
      setStore({ conferencias: [], confirmados: [], alertasVistos: [] })
      return
    }
    setStore(carregarHistoricoUsuario(userId))
  }, [userId])

  useEffect(() => {
    if (!userId) return
    const onStorage = (e: StorageEvent) => {
      if (e.key === `mega_hist_user_v1:${userId}`) {
        setStore(carregarHistoricoUsuario(userId))
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [userId])

  const persist = useCallback(
    (updater: (prev: HistoricoUsuarioStore) => HistoricoUsuarioStore) => {
      if (!userId) return
      setStore((prev) => {
        const next = updater(prev)
        salvarHistoricoUsuario(userId, next)
        return next
      })
    },
    [userId],
  )

  const adicionarConferencia = useCallback(
    (conf: Omit<ConferenciaRealizada, 'id' | 'data'> & { data?: string }) => {
      if (!userId) return
      const item: ConferenciaRealizada = {
        id: novoId(),
        data: conf.data ?? new Date().toISOString(),
        modo: conf.modo,
        dezenasSorteadas: [...conf.dezenasSorteadas].sort((a, b) => a - b),
        jogos: conf.jogos,
        grupo: conf.grupo,
      }
      persist((prev) => ({
        ...prev,
        conferencias: [item, ...prev.conferencias],
      }))
    },
    [persist, userId],
  )

  const limparConferencias = useCallback(() => {
    persist((prev) => ({ ...prev, conferencias: [] }))
  }, [persist])

  const removerConferencia = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        conferencias: prev.conferencias.filter((c) => c.id !== id),
      }))
    },
    [persist],
  )

  const confirmarJogos = useCallback(
    (payload: { modo: string; jogos: number[][]; concursoNumero?: number }) => {
      if (!userId || payload.jogos.length === 0) return null
      const item: JogoConfirmado = {
        id: novoId(),
        data: new Date().toISOString(),
        modo: payload.modo,
        jogos: payload.jogos.map((j) => [...j].sort((a, b) => a - b)),
        status: 'pendente',
        concursoNumero: payload.concursoNumero,
      }
      persist((prev) => ({
        ...prev,
        confirmados: [item, ...prev.confirmados],
      }))
      return item.id
    },
    [persist, userId],
  )

  const removerConfirmado = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        confirmados: prev.confirmados.filter((c) => c.id !== id),
      }))
    },
    [persist],
  )

  const limparConfirmados = useCallback(() => {
    persist((prev) => ({ ...prev, confirmados: [] }))
  }, [persist])

  const marcarConferido = useCallback(
    (
      id: string,
      resultado: {
        dezenasSorteadas: number[]
        jogos: ConferenciaRealizadaJogo[]
        concursoNumero?: number
      },
    ) => {
      const melhor = Math.max(0, ...resultado.jogos.map((j) => j.acertos))
      persist((prev) => ({
        ...prev,
        confirmados: prev.confirmados.map((c) =>
          c.id === id
            ? {
                ...c,
                status: 'conferido' as const,
                concursoNumero: resultado.concursoNumero ?? c.concursoNumero,
                resultado: {
                  dezenasSorteadas: [...resultado.dezenasSorteadas].sort((a, b) => a - b),
                  melhorAcertos: melhor,
                  jogos: resultado.jogos,
                },
              }
            : c,
        ),
      }))
    },
    [persist],
  )

  const registrarAlertaVisto = useCallback(
    (alertaId: string) => {
      persist((prev) =>
        prev.alertasVistos.includes(alertaId)
          ? prev
          : { ...prev, alertasVistos: [...prev.alertasVistos, alertaId] },
      )
    },
    [persist],
  )

  return {
    userId,
    conferencias: store.conferencias,
    confirmados: store.confirmados,
    alertasVistos: store.alertasVistos,
    adicionarConferencia,
    limparConferencias,
    removerConferencia,
    confirmarJogos,
    removerConfirmado,
    limparConfirmados,
    marcarConferido,
    registrarAlertaVisto,
    conferirJogosContraSorteio,
  }
}

/** Compat: mesma API antiga, mas isolada por usuário. */
export function useHistoricoConferencias() {
  const h = useHistoricoUsuario()
  return {
    historico: h.conferencias,
    adicionar: h.adicionarConferencia,
    limpar: h.limparConferencias,
    remover: h.removerConferencia,
  }
}
