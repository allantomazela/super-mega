import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL
const CAIXA = 'https://loteriascaixa-api.herokuapp.com/api/megasena'
const CONCURRENCY = 6
const BATCH = 200
const full = process.argv.includes('--full')

if (!DATABASE_URL) {
  if (process.env.SKIP_IF_NO_URL === '1') {
    console.log('DATABASE_URL ausente. Pulando sincronização.')
    process.exit(0)
  }
  console.error('DATABASE_URL ausente. Use: pnpm db:sync-concursos')
  process.exit(1)
}

function toIsoDate(brDate) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(brDate ?? '').trim())
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null
}

function normalizar(dados) {
  const numero = dados.numero ?? dados.concurso
  const brutos = dados.listaDezenas ?? dados.dezenas ?? []
  const dezenas = brutos
    .map((d) => (typeof d === 'number' ? d : parseInt(String(d), 10)))
    .filter((n) => n >= 1 && n <= 60)
    .sort((a, b) => a - b)
  const data_sorteio = toIsoDate(dados.dataApuracao ?? dados.data)
  if (!numero || dezenas.length !== 6 || !data_sorteio) return null
  return { numero, data_sorteio, dezenas }
}

async function fetchJson(url, tentativas = 4) {
  let lastError
  for (let i = 0; i < tentativas; i++) {
    try {
      const resp = await fetch(url, {
        headers: {
          Accept: 'application/json, text/plain, */*',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          Referer: 'https://loterias.caixa.gov.br/',
        },
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      return await resp.json()
    } catch (error) {
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, 400 * (i + 1)))
    }
  }
  throw lastError
}

async function mapPool(items, limit, worker) {
  const results = new Array(items.length)
  let next = 0
  async function run() {
    while (next < items.length) {
      const i = next++
      results[i] = await worker(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()))
  return results
}

async function baixarConcursos(numeros) {
  const fetched = await mapPool(numeros, CONCURRENCY, async (numero) => {
    try {
      return normalizar(await fetchJson(`${CAIXA}/${numero}`))
    } catch {
      return null
    }
  })
  return fetched.filter(Boolean)
}

async function gravarLotes(sql, rows) {
  let gravados = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const lote = rows.slice(i, i + BATCH)
    await sql.query(
      `INSERT INTO public.concursos (numero, data_sorteio, dezenas)
       SELECT
         (r->>'numero')::int,
         (r->>'data_sorteio')::date,
         ARRAY(SELECT jsonb_array_elements_text(r->'dezenas')::smallint)
       FROM jsonb_array_elements($1::jsonb) AS r
       ON CONFLICT (numero) DO UPDATE SET
         data_sorteio = EXCLUDED.data_sorteio,
         dezenas = EXCLUDED.dezenas,
         updated_at = now()`,
      [JSON.stringify(lote)],
    )
    gravados += lote.length
    console.log(`Gravados ${gravados}/${rows.length}`)
  }
  return gravados
}

const sql = neon(DATABASE_URL)

console.log('Buscando último concurso oficial da Caixa...')
const ultimo = normalizar(await fetchJson(`${CAIXA}/latest`))
if (!ultimo) {
  console.error('Não foi possível ler o último concurso da Caixa.')
  process.exit(1)
}

let alvos
if (full) {
  alvos = Array.from({ length: ultimo.numero }, (_, i) => i + 1)
  console.log(`Modo completo: concursos 1..${ultimo.numero}`)
} else {
  const faltando = await sql`
    SELECT gs AS numero
    FROM generate_series(1, ${ultimo.numero}::int) AS gs
    WHERE NOT EXISTS (
      SELECT 1 FROM public.concursos c WHERE c.numero = gs
    )
  `
  const set = new Set(faltando.map((r) => Number(r.numero)))
  set.add(ultimo.numero)
  alvos = [...set].sort((a, b) => a - b)
  console.log(`Modo incremental: ${alvos.length} concurso(s) para atualizar (último: ${ultimo.numero})`)
}

const rows = await baixarConcursos(alvos)
const ok = new Set(rows.map((r) => r.numero))
const aindaFaltando = alvos.filter((n) => !ok.has(n))
if (aindaFaltando.length > 0) {
  console.log(`Recuperando ${aindaFaltando.length} concursos faltantes...`)
  const extra = await baixarConcursos(aindaFaltando)
  rows.push(...extra)
}

if (rows.length === 0) {
  console.log('Nada novo para gravar.')
  process.exit(0)
}

console.log(`${rows.length} concursos baixados. Gravando no Neon...`)
await gravarLotes(sql, rows.sort((a, b) => a.numero - b.numero))

const [{ total }] = await sql`SELECT COUNT(*)::int AS total FROM public.concursos`
console.log(`Sincronização concluída. Concursos no Neon: ${total}`)
