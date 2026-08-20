#!/usr/bin/env node
/**
 * Gera candidato de matriz L(n,6,6,t) offline (guloso + SA opcional).
 *
 * Uso:
 *   node scripts/fechamento/gerar-matriz.mjs --n 10 --t 4
 *   node scripts/fechamento/gerar-matriz.mjs --n 12 --t 5 --anneal --ms 60000
 *   node scripts/fechamento/gerar-matriz.mjs --prioridades
 */

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  PRIORIDADES,
  annealShrink,
  buildCandidatePayload,
  greedyCover,
  lowerBoundWeak,
  validateLotto,
} from './lotto-core.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, 'candidatos')

function parseArgs(argv) {
  const out = {
    n: null,
    t: 5,
    anneal: false,
    ms: 30_000,
    seed: 42,
    prioridades: false,
    dry: false,
  }
  const positionals = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('-')) {
      positionals.push(a)
      continue
    }
    const eq = a.indexOf('=')
    const key = eq === -1 ? a : a.slice(0, eq)
    const inline = eq === -1 ? null : a.slice(eq + 1)
    const next = () => (inline != null ? inline : argv[++i])

    // Evitar --n / --t: o npm engole --n como opção própria.
    if (key === '--size' || key === '--grupo' || key === '--n') out.n = Number(next())
    else if (key === '--target' || key === '--garantia-t' || key === '--t') out.t = Number(next())
    else if (key === '--anneal') out.anneal = true
    else if (key === '--ms') out.ms = Number(next())
    else if (key === '--seed') out.seed = Number(next())
    else if (key === '--prioridades') out.prioridades = true
    else if (key === '--dry') out.dry = true
    else if (key === '--help' || key === '-h') out.help = true
  }
  if (out.n == null && positionals[0] != null) out.n = Number(positionals[0])
  if (positionals[1] != null) out.t = Number(positionals[1])
  return out
}

function printHelp() {
  console.log(`Gera matriz candidata L(n,6,6,t) (offline).

Opções:
  --size <6-20>    tamanho do grupo (evite --n via npm; o npm engole --n)
  --target <4|5>   garantia (4=quadra, 5=quina)
  --anneal         tenta encolher com simulated annealing
  --ms <ms>        orçamento de tempo do annealing (padrão 30000)
  --seed <int>     semente do RNG
  --prioridades    gera a fila prioritária (L10 Quadra, L11/L12 Quina, …)
  --dry            só imprime, não grava JSON

Posicional (útil com npm):
  npm run fechamento:gerar -- 10 4 --anneal
  npm run fechamento:gerar -- --size=12 --target=5 --anneal

Saída: scripts/fechamento/candidatos/L{n}-t{t}-{jogos}j.json
Só embarque no app após o CHECKLIST.md.`)
}

async function gerarUm({ n, t, anneal, ms, seed, dry }) {
  if (!Number.isInteger(n) || n < 6 || n > 20) {
    throw new Error(`n inválido: ${n} (use 6..20)`)
  }
  if (t !== 4 && t !== 5) {
    throw new Error(`t inválido: ${t} (use 4 ou 5)`)
  }

  const lb = lowerBoundWeak(n, t)
  console.log(`\n=== L(${n},6,6,${t}) · LB fraco ≥ ${lb} jogos ===`)
  console.log('Guloso…')
  const t0 = Date.now()
  let result = greedyCover(n, t)
  console.log(
    `  guloso: ${result.blocos.length} blocos · ok=${result.validation.ok} · uncovered=${result.validation.uncovered} · ${Date.now() - t0}ms`,
  )

  if (anneal && result.validation.ok) {
    console.log(`Annealing (até ${ms}ms)…`)
    result = annealShrink(result.blocos, n, t, 6, { maxMs: ms, seed })
    console.log(
      `  anneal: ${result.blocos.length} blocos · ok=${result.validation.ok} · ${result.elapsedMs}ms · iters=${result.iters}`,
    )
  } else if (anneal && !result.validation.ok) {
    console.warn('  Annealing pulado: guloso não fechou cobertura.')
  }

  // Revalida sempre antes de gravar
  const validation = validateLotto(result.blocos, n, t)
  const payload = buildCandidatePayload({
    n,
    t,
    blocos: result.blocos,
    validation,
    method: result.method,
    meta: { seed, annealMs: anneal ? ms : 0 },
  })

  if (!validation.ok) {
    console.error(`FALHA: ainda há ${validation.uncovered} sextetos descobertos. Não grave como pronta.`)
  } else {
    console.log(`OK: ${payload.jogos} jogos cobrem ${validation.checked}/${validation.checked} sextetos.`)
  }

  if (dry) {
    console.log(JSON.stringify({ ...payload, blocos: `[${payload.jogos} blocos]` }, null, 2))
    return payload
  }

  await mkdir(OUT_DIR, { recursive: true })
  const stamp = validation.ok ? 'ok' : 'FAIL'
  const file = path.join(OUT_DIR, `L${n}-t${t}-${payload.jogos}j-${stamp}.json`)
  await writeFile(file, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`Gravado: ${file}`)
  return payload
}

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  printHelp()
  process.exit(0)
}

if (args.prioridades) {
  const fila = PRIORIDADES.filter((p) => !(p.n === 10 && p.t === 5)) // smoke separado
  console.log('Fila prioritária (sem smoke L10 Quina):')
  for (const p of fila) console.log(`  - n=${p.n} t=${p.t} · ${p.label}`)
  for (const p of fila) {
    await gerarUm({
      n: p.n,
      t: p.t,
      anneal: true,
      ms: args.ms,
      seed: args.seed,
      dry: args.dry,
    })
  }
  console.log('\nConcluído. Revise JSONs em scripts/fechamento/candidatos/ e o CHECKLIST.md.')
  process.exit(0)
}

if (args.n == null) {
  printHelp()
  process.exit(1)
}

await gerarUm(args)
