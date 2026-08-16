import React, { createContext, useContext, useState, useEffect } from 'react'
import { FilterOptions, DEFAULT_FILTERS } from './megaEngine'

interface MegaContextType {
  selectedNumbers: number[]
  setSelectedNumbers: React.Dispatch<React.SetStateAction<number[]>>
  toggleNumber: (n: number) => void
  clearNumbers: () => void
  filters: FilterOptions
  setFilters: React.Dispatch<React.SetStateAction<FilterOptions>>
  toggleFilter: (key: keyof FilterOptions) => void
  resetAll: () => void
}

const STORAGE_KEY_NUMBERS = 'mega_selected_numbers'
const STORAGE_KEY_FILTERS = 'mega_filters'

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

  const toggleNumber = (n: number) => {
    setSelectedNumbers((prev) => {
      if (prev.includes(n)) {
        return prev.filter((item) => item !== n)
      } else {
        if (prev.length >= 15) return prev // Max 15
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
