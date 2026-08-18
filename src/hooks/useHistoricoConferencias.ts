import { useCallback, useEffect, useState } from 'react'

/* ============================================================
 * useHistoricoConferencias — hook para persistir conferências
 * realizadas no localStorage.
 *
 * Cada conferência contém: data, dezenas sorteadas, jogos
 * conferidos e acertos por jogo.
 *
 * Funciona tanto para o Modo 5 Jogos quanto para o Modo
 * Desdobramento (campo `modo` diferencia a origem).
 * ============================================================ */

export interface ConferenciaRealizadaJogo {
  /** Dezenas do jogo conferido. */
  jogo: number[]
  /** Número de acertos contra as dezenas sorteadas. */
  acertos: number
  /** Dezenas acertadas (interseção). */
  acertadas: number[]
}

export interface ConferenciaRealizada {
  /** ID único (timestamp). */
  id: string
  /** ISO date da conferência. */
  data: string
  /** Modo de origem: 'desdobramento' | 'cinco-jogos' | 'torneio'. */
  modo: string
  /** Dezenas sorteadas (6). */
  dezenasSorteadas: number[]
  /** Jogos conferidos com seus acertos. */
  jogos: ConferenciaRealizadaJogo[]
  /** Rótulo opcional (ex.: "Grupo A" no torneio). */
  grupo?: string
}

const STORAGE_KEY = 'mega_historico_conferencias'
const MAX_ITENS = 50

function carregar(): ConferenciaRealizada[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (c) =>
        c &&
        typeof c.id === 'string' &&
        Array.isArray(c.dezenasSorteadas) &&
        Array.isArray(c.jogos),
    )
  } catch {
    return []
  }
}

function salvar(lista: ConferenciaRealizada[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista.slice(0, MAX_ITENS)))
  } catch {
    // ignore
  }
}

export function useHistoricoConferencias() {
  const [historico, setHistorico] = useState<ConferenciaRealizada[]>(() => carregar())

  // Sincroniza com outras abas / mudanças externas
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setHistorico(carregar())
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const adicionar = useCallback(
    (conf: Omit<ConferenciaRealizada, 'id' | 'data'> & { data?: string }) => {
      const item: ConferenciaRealizada = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        data: conf.data ?? new Date().toISOString(),
        modo: conf.modo,
        dezenasSorteadas: [...conf.dezenasSorteadas].sort((a, b) => a - b),
        jogos: conf.jogos,
        grupo: conf.grupo,
      }
      setHistorico((prev) => {
        const next = [item, ...prev].slice(0, MAX_ITENS)
        salvar(next)
        return next
      })
    },
    [],
  )

  const limpar = useCallback(() => {
    setHistorico([])
    salvar([])
  }, [])

  const remover = useCallback((id: string) => {
    setHistorico((prev) => {
      const next = prev.filter((c) => c.id !== id)
      salvar(next)
      return next
    })
  }, [])

  return { historico, adicionar, limpar, remover }
}
