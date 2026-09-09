import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  FILTROS_LOTOFACIL_PADRAO,
  type FiltrosLotofacil,
} from '@/modules/lotofacil/types'
import { LF_MAX_POOL, LF_TICKET, LF_UNIVERSO } from '@/modules/lotofacil/utils/math/constants'
import { clampPoolLotofacil } from '@/modules/lotofacil/utils/math/caixaOficial'
import { shuffleInPlace } from '@/modules/lotofacil/utils/math/combinacoes'

type LotofacilMode = 'filtros' | 'fechamento'

interface LotofacilContextValue {
  selected: number[]
  toggleNumber: (n: number) => void
  clearSelection: () => void
  randomSelect: (qtd: number) => void
  filtros: FiltrosLotofacil
  setFiltros: (f: FiltrosLotofacil | ((prev: FiltrosLotofacil) => FiltrosLotofacil)) => void
  mode: LotofacilMode
  setMode: (m: LotofacilMode) => void
  targetHits: number
  setTargetHits: (n: number) => void
  jogosGerados: number[][]
  setJogosGerados: (j: number[][]) => void
}

const LotofacilContext = createContext<LotofacilContextValue | null>(null)

const KEY = 'lotofacil_state_v1'

function loadState(): Partial<{
  selected: number[]
  filtros: FiltrosLotofacil
  mode: LotofacilMode
  targetHits: number
}> {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return {}
    return JSON.parse(raw) as ReturnType<typeof loadState>
  } catch {
    return {}
  }
}

function saveState(state: object) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

export function LotofacilProvider({ children }: { children: ReactNode }) {
  const initial = loadState()
  const [selected, setSelected] = useState<number[]>(() =>
    Array.isArray(initial.selected)
      ? initial.selected.filter((n) => n >= 1 && n <= LF_UNIVERSO).slice(0, LF_MAX_POOL)
      : [],
  )
  const [filtros, setFiltros] = useState<FiltrosLotofacil>(
    () => initial.filtros ?? FILTROS_LOTOFACIL_PADRAO,
  )
  const [mode, setMode] = useState<LotofacilMode>(() => initial.mode ?? 'filtros')
  const [targetHits, setTargetHits] = useState(() => initial.targetHits ?? 14)
  const [jogosGerados, setJogosGerados] = useState<number[][]>([])

  const persist = useCallback(
    (next: {
      selected?: number[]
      filtros?: FiltrosLotofacil
      mode?: LotofacilMode
      targetHits?: number
    }) => {
      saveState({
        selected: next.selected ?? selected,
        filtros: next.filtros ?? filtros,
        mode: next.mode ?? mode,
        targetHits: next.targetHits ?? targetHits,
      })
    },
    [selected, filtros, mode, targetHits],
  )

  const toggleNumber = useCallback(
    (n: number) => {
      setSelected((prev) => {
        let next: number[]
        if (prev.includes(n)) next = prev.filter((x) => x !== n)
        else if (prev.length >= LF_MAX_POOL) next = prev
        else next = [...prev, n].sort((a, b) => a - b)
        persist({ selected: next })
        return next
      })
    },
    [persist],
  )

  const clearSelection = useCallback(() => {
    setSelected([])
    setJogosGerados([])
    persist({ selected: [] })
  }, [persist])

  const randomSelect = useCallback(
    (qtd: number) => {
      const size = clampPoolLotofacil(qtd)
      const pool = Array.from({ length: LF_UNIVERSO }, (_, i) => i + 1)
      shuffleInPlace(pool)
      const next = pool.slice(0, size).sort((a, b) => a - b)
      setSelected(next)
      persist({ selected: next })
    },
    [persist],
  )

  const value = useMemo<LotofacilContextValue>(
    () => ({
      selected,
      toggleNumber,
      clearSelection,
      randomSelect,
      filtros,
      setFiltros: (f) => {
        setFiltros((prev) => {
          const next = typeof f === 'function' ? f(prev) : f
          persist({ filtros: next })
          return next
        })
      },
      mode,
      setMode: (m) => {
        setMode(m)
        persist({ mode: m })
      },
      targetHits,
      setTargetHits: (n) => {
        setTargetHits(n)
        persist({ targetHits: n })
      },
      jogosGerados,
      setJogosGerados,
    }),
    [
      selected,
      toggleNumber,
      clearSelection,
      randomSelect,
      filtros,
      mode,
      targetHits,
      jogosGerados,
      persist,
    ],
  )

  return <LotofacilContext.Provider value={value}>{children}</LotofacilContext.Provider>
}

export function useLotofacil() {
  const ctx = useContext(LotofacilContext)
  if (!ctx) throw new Error('useLotofacil deve ser usado dentro de LotofacilProvider')
  return ctx
}

export { LF_TICKET }
