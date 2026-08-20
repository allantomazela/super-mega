import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { FilterOptions, DEFAULT_FILTERS, FIVE_GAMES_MAX_SELECTION } from './megaEngine'
import {
  FECHAMENTO_N_MAX,
  FECHAMENTO_N_MIN,
  type GarantiaFechamento,
} from './coveringDesign'

export type AppMode = 'desdobramento' | 'cinco-jogos' | 'torneio' | 'fechamento'

export const MODE_LABELS: Record<AppMode, string> = {
  desdobramento: 'Modo Desdobramento',
  'cinco-jogos': 'Modo 5 Jogos',
  torneio: 'Modo Torneio',
  fechamento: 'Modo Fechamento',
}

interface MegaContextType {
  selectedNumbers: number[]
  setSelectedNumbers: React.Dispatch<React.SetStateAction<number[]>>
  toggleNumber: (n: number) => void
  clearNumbers: () => void
  filters: FilterOptions
  setFilters: React.Dispatch<React.SetStateAction<FilterOptions>>
  toggleFilter: (key: keyof FilterOptions) => void
  resetAll: () => void
  mode: AppMode
  setMode: React.Dispatch<React.SetStateAction<AppMode>>
  /** Limite máximo de dezenas conforme o modo ativo. */
  maxSelection: number
  /** Tamanho do grupo no Modo Fechamento (6–20). */
  fechamentoN: number
  setFechamentoN: (n: number) => void
  /** Garantia desejada: Quadra (t=4) ou Quina (t=5). */
  fechamentoGarantia: GarantiaFechamento
  setFechamentoGarantia: (g: GarantiaFechamento) => void
}

const STORAGE_KEY_NUMBERS = 'mega_selected_numbers'
const STORAGE_KEY_FILTERS = 'mega_filters'
const STORAGE_KEY_MODE = 'mega_mode'
const STORAGE_KEY_FECH_N = 'mega_fechamento_n'
const STORAGE_KEY_FECH_G = 'mega_fechamento_garantia'

function clampFechamentoN(n: number): number {
  if (!Number.isFinite(n)) return 10
  return Math.min(FECHAMENTO_N_MAX, Math.max(FECHAMENTO_N_MIN, Math.round(n)))
}

const MegaContext = createContext<MegaContextType | undefined>(undefined)

export const MegaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY_NUMBERS)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) return parsed
      }
    } catch {
      // ignore
    }
    return []
  })

  const [filters, setFilters] = useState<FilterOptions>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY_FILTERS)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch {
      // ignore
    }
    return DEFAULT_FILTERS
  })

  const [mode, setMode] = useState<AppMode>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY_MODE)
      if (
        saved === 'cinco-jogos' ||
        saved === 'desdobramento' ||
        saved === 'torneio' ||
        saved === 'fechamento'
      ) {
        return saved
      }
    } catch {
      // ignore
    }
    return 'desdobramento'
  })

  const [fechamentoN, setFechamentoNState] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY_FECH_N)
      if (saved) return clampFechamentoN(Number(saved))
    } catch {
      // ignore
    }
    return 10
  })

  const [fechamentoGarantia, setFechamentoGarantiaState] = useState<GarantiaFechamento>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY_FECH_G)
      if (saved === 'quadra' || saved === 'quina') return saved
    } catch {
      // ignore
    }
    return 'quina'
  })

  const maxSelection =
    mode === 'fechamento'
      ? fechamentoN
      : mode === 'cinco-jogos' || mode === 'torneio'
        ? FIVE_GAMES_MAX_SELECTION
        : 20

  const setFechamentoN = useCallback((n: number) => {
    const next = clampFechamentoN(n)
    setFechamentoNState(next)
    setSelectedNumbers((prev) => (prev.length > next ? prev.slice(0, next) : prev))
  }, [])

  const setFechamentoGarantia = useCallback((g: GarantiaFechamento) => {
    setFechamentoGarantiaState(g)
  }, [])

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY_NUMBERS, JSON.stringify(selectedNumbers))
    } catch {
      // ignore
    }
  }, [selectedNumbers])

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY_FILTERS, JSON.stringify(filters))
    } catch {
      // ignore
    }
  }, [filters])

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY_MODE, mode)
    } catch {
      // ignore
    }
  }, [mode])

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY_FECH_N, String(fechamentoN))
    } catch {
      // ignore
    }
  }, [fechamentoN])

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY_FECH_G, fechamentoGarantia)
    } catch {
      // ignore
    }
  }, [fechamentoGarantia])

  const toggleNumber = (n: number) => {
    setSelectedNumbers((prev) => {
      if (prev.includes(n)) {
        return prev.filter((item) => item !== n)
      } else {
        if (prev.length >= maxSelection) return prev
        return [...prev, n].sort((a, b) => a - b)
      }
    })
  }

  const clearNumbers = () => {
    setSelectedNumbers([])
  }

  const toggleFilter = (key: keyof FilterOptions) => {
    setFilters((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const resetAll = () => {
    setSelectedNumbers([])
    setFilters(DEFAULT_FILTERS)
  }

  return (
    <MegaContext.Provider
      value={{
        selectedNumbers,
        setSelectedNumbers,
        toggleNumber,
        clearNumbers,
        filters,
        setFilters,
        toggleFilter,
        resetAll,
        mode,
        setMode,
        maxSelection,
        fechamentoN,
        setFechamentoN,
        fechamentoGarantia,
        setFechamentoGarantia,
      }}
    >
      {children}
    </MegaContext.Provider>
  )
}

export function useMega() {
  const context = useContext(MegaContext)
  if (!context) {
    throw new Error('useMega must be used within a MegaProvider')
  }
  return context
}
