import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL
const OUT = path.resolve('public', 'concursos.json')

if (!DATABASE_URL) {
  if (process.env.SKIP_IF_NO_URL === '1') {
    console.log('DATABASE_URL ausente. Pulando exportação do snapshot Neon.')
    process.exit(0)
  }
  console.error('DATABASE_URL ausente. Use: pnpm db:export-concursos')
  process.exit(1)
}

function isoParaBr(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''))
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(iso ?? '')
}

const sql = neon(DATABASE_URL)
const rows = await sql`
  SELECT numero, data_sorteio::text AS data_sorteio, dezenas
  FROM public.concursos
  ORDER BY numero DESC
`

const concursos = rows.map((row) => ({
  numero: Number(row.numero),
  data: isoParaBr(row.data_sorteio),
  dezenas: (row.dezenas ?? []).map((n) => Number(n)),
}))

const payload = {
  atualizadoEm: new Date().toISOString(),
  origem: 'neon',
  total: concursos.length,
  concursos,
}

await mkdir(path.dirname(OUT), { recursive: true })
await writeFile(OUT, `${JSON.stringify(payload)}\n`, 'utf8')
console.log(`Snapshot gravado em ${OUT} (${concursos.length} concursos).`)
