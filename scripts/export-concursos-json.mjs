import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL
const OUT = path.resolve('public', 'concursos.json')
const CAIXA = 'https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena'

await mkdir(path.resolve('public'), { recursive: true })
try {
  const resp = await fetch(`${CAIXA}/`, {
    headers: {
      Accept: 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Referer: 'https://loterias.caixa.gov.br/',
    },
  })
  if (resp.ok) {
    const ultimo = await resp.json()
    const outUltimo = path.resolve('public', 'ultimo-oficial.json')
    await writeFile(outUltimo, `${JSON.stringify(ultimo)}\n`, 'utf8')
    console.log(`Último concurso oficial gravado em ${outUltimo} (${ultimo.numero}).`)
  }
} catch (error) {
  console.warn('Não foi possível gravar ultimo-oficial.json:', error)
}

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
