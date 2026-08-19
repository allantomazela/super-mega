import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('DATABASE_URL ausente. Copie .env-dev.example para .env-dev e preencha a connection string do Neon.')
  process.exit(1)
}

const sql = neon(DATABASE_URL)

try {
  const [ping] = await sql`SELECT now() AS agora, current_database() AS banco`
  console.log(`Conectado ao Neon. Banco: ${ping.banco} | agora: ${ping.agora}`)
} catch (error) {
  console.error('Falha ao conectar no Neon:', error instanceof Error ? error.message : error)
  process.exit(1)
}

try {
  const [row] = await sql`SELECT COUNT(*)::int AS total FROM public.concursos`
  console.log(`Tabela concursos: ${row.total} registro(s).`)
} catch {
  console.log('Tabela concursos ainda não existe. Rode: pnpm db:sync-concursos')
}
