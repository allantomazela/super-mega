import { readFileSync, writeFileSync } from 'node:fs'

const d = JSON.parse(readFileSync('public/data/lotofacil.json', 'utf8'))
const top = d.concursos.slice(0, 20)
const body = top
  .map(
    (c) =>
      `  {\n    numero: ${c.numero},\n    data: '${c.data}',\n    dezenas: [${c.dezenas.join(', ')}],\n  }`,
  )
  .join(',\n')

const out = `import type { ConcursoLotofacil } from '@/modules/lotofacil/types'

/**
 * Base mínima embutida (fallback offline).
 * Snapshot completo: public/data/lotofacil.json (${d.total} concursos, atualizado ${d.atualizadoEm}).
 */
export const CONCURSOS_LOTOFACIL_ESTATICOS: ConcursoLotofacil[] = [
${body},
]
`

writeFileSync('src/modules/lotofacil/data/concursosHistoricos.ts', out)
console.log(`Fallback atualizado com ${top.length} concursos (${top[0].numero}..${top[top.length - 1].numero}).`)
