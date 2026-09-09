import type { FiltrosLotofacil } from '@/modules/lotofacil/types'

interface FiltrosPainelProps {
  filtros: FiltrosLotofacil
  onChange: (f: FiltrosLotofacil) => void
}

function RangeRow({
  label,
  minKey,
  maxKey,
  filtros,
  onChange,
  absMin,
  absMax,
}: {
  label: string
  minKey: keyof FiltrosLotofacil
  maxKey: keyof FiltrosLotofacil
  filtros: FiltrosLotofacil
  onChange: (f: FiltrosLotofacil) => void
  absMin: number
  absMax: number
}) {
  const minVal = Number(filtros[minKey])
  const maxVal = Number(filtros[maxKey])
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] text-zinc-400">
        <span>{label}</span>
        <span className="tabular-nums text-violet-300 font-semibold">
          {minVal}–{maxVal}
        </span>
      </div>
      <div className="flex gap-2">
        <input
          type="range"
          min={absMin}
          max={absMax}
          value={minVal}
          onChange={(e) => {
            const v = Number(e.target.value)
            onChange({ ...filtros, [minKey]: Math.min(v, maxVal) })
          }}
          className="w-full accent-violet-500"
        />
        <input
          type="range"
          min={absMin}
          max={absMax}
          value={maxVal}
          onChange={(e) => {
            const v = Number(e.target.value)
            onChange({ ...filtros, [maxKey]: Math.max(v, minVal) })
          }}
          className="w-full accent-violet-500"
        />
      </div>
    </div>
  )
}

export function FiltrosPainel({ filtros, onChange }: FiltrosPainelProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-400 leading-relaxed">
        Faixas baseadas na curva histórica da Lotofácil (moldura, paridade, primos, Fibonacci, soma
        e repetência do concurso anterior).
      </p>
      <RangeRow
        label="Moldura (9–11 ideal)"
        minKey="molduraMin"
        maxKey="molduraMax"
        filtros={filtros}
        onChange={onChange}
        absMin={5}
        absMax={15}
      />
      <RangeRow
        label="Ímpares (7–8 ideal)"
        minKey="imparesMin"
        maxKey="imparesMax"
        filtros={filtros}
        onChange={onChange}
        absMin={4}
        absMax={11}
      />
      <RangeRow
        label="Primos (4–6 ideal)"
        minKey="primosMin"
        maxKey="primosMax"
        filtros={filtros}
        onChange={onChange}
        absMin={1}
        absMax={9}
      />
      <RangeRow
        label="Fibonacci (3–5 ideal)"
        minKey="fibonacciMin"
        maxKey="fibonacciMax"
        filtros={filtros}
        onChange={onChange}
        absMin={0}
        absMax={7}
      />
      <RangeRow
        label="Soma (175–225 ideal)"
        minKey="somaMin"
        maxKey="somaMax"
        filtros={filtros}
        onChange={onChange}
        absMin={120}
        absMax={280}
      />
      <label className="flex items-center gap-2 text-xs text-zinc-300">
        <input
          type="checkbox"
          checked={filtros.exigirRepetencia}
          onChange={(e) => onChange({ ...filtros, exigirRepetencia: e.target.checked })}
          className="accent-violet-500"
        />
        Exigir repetência do concurso anterior (8–10)
      </label>
      {filtros.exigirRepetencia ? (
        <RangeRow
          label="Repetência N−1"
          minKey="repetenciaMin"
          maxKey="repetenciaMax"
          filtros={filtros}
          onChange={onChange}
          absMin={5}
          absMax={12}
        />
      ) : null}
    </div>
  )
}
