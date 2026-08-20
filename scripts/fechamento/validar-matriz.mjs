#!/usr/bin/env node
/**
 * Valida exaustivamente uma matriz candidata (JSON) ou a L10 embutida.
 *
 * Uso:
 *   node scripts/fechamento/validar-matriz.mjs --l10
 *   node scripts/fechamento/validar-matriz.mjs --file scripts/fechamento/candidatos/L10-t4-XXj-ok.json
 *   node scripts/fechamento/validar-matriz.mjs --n 10 --t 5 --blocos '[[2,4,5,7,8,9],...]'
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { binomial, lowerBoundWeak, validateLotto } from './lotto-core.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Espelho da MATRIZ_L10 do app — smoke de regressão. */
const MATRIZ_L10 = [
  [2, 4, 5, 7, 8, 9],
  [2, 5, 6, 7, 9, 10],
  [1, 3, 6, 7, 9, 10],
  [1, 2, 3, 6, 7, 8],
  [1, 3, 4, 5, 7, 9],
  [2, 3, 4, 8, 9, 10],
  [1, 4, 5, 6, 8, 10],
  [2, 3, 4, 5, 6, 10],
  [1, 2, 7, 8, 9, 10],
  [1, 3, 5, 6, 8, 9],
  [3, 4, 5, 7, 8, 10],
  [3, 4, 6, 7, 8, 10],
  [1, 2, 3, 4, 5, 10],
  [1, 2, 4, 6, 7, 9],
]

function parseArgs(argv) {
  const out = { l10: false, file: null, n: null, t: null, blocos: null }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--l10') out.l10 = true
    else if (a === '--file') out.file = argv[++i]
    else if (a === '--n') out.n = Number(argv[++i])
    else if (a === '--t') out.t = Number(argv[++i])
    else if (a === '--blocos') out.blocos = argv[++i]
    else if (a === '--help' || a === '-h') out.help = true
  }
  return out
}

function printHelp() {
  console.log(`Valida L(n,6,6,t) exaustivamente.

  --l10              valida a matriz clássica de 14 jogos
  --file <path>      JSON gerado por gerar-matriz.mjs
  --n --t --blocos   validação ad-hoc (blocos = JSON array)`)
}

function report({ n, t, blocos, fonte }) {
  const lb = lowerBoundWeak(n, t)
  const t0 = Date.now()
  const v = validateLotto(blocos, n, t)
  const ms = Date.now() - t0
  console.log(`Fonte: ${fonte}`)
  console.log(`L(${n},6,6,${t}) · ${blocos.length} jogos · C(${n},6)=${binomial(n, 6)} · LB fraco ≥ ${lb}`)
  console.log(`checked=${v.checked} uncovered=${v.uncovered} ok=${v.ok} (${ms}ms)`)
  if (v.error) console.error(`erro: ${v.error}`)
  if (!v.ok) process.exitCode = 1
  else console.log('PASS')
}

const args = parseArgs(process.argv.slice(2))
if (args.help || (!args.l10 && !args.file && !args.blocos)) {
  printHelp()
  process.exit(args.help ? 0 : 1)
}

if (args.l10) {
  report({ n: 10, t: 5, blocos: MATRIZ_L10, fonte: 'MATRIZ_L10 (smoke)' })
}

if (args.file) {
  const abs = path.isAbsolute(args.file) ? args.file : path.resolve(process.cwd(), args.file)
  const raw = JSON.parse(await readFile(abs, 'utf8'))
  const n = raw.n
  const t = raw.t
  const blocos = raw.blocos
  if (!n || !t || !Array.isArray(blocos)) {
    console.error('JSON inválido: precisa de n, t, blocos')
    process.exit(1)
  }
  report({ n, t, blocos, fonte: abs })
}

if (args.blocos) {
  if (args.n == null || args.t == null) {
    console.error('--blocos exige --n e --t')
    process.exit(1)
  }
  const blocos = JSON.parse(args.blocos)
  report({ n: args.n, t: args.t, blocos, fonte: 'CLI --blocos' })
}
