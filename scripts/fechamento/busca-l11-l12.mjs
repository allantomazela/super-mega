#!/usr/bin/env node
/**
 * Busca longa L11/L12 Quina: várias seeds + poda + annealing.
 * Grava o melhor candidato ok em scripts/fechamento/candidatos/.
 *
 *   node scripts/fechamento/busca-l11-l12.mjs
 *   node scripts/fechamento/busca-l11-l12.mjs --ms=120000 --seeds=8
 */

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildCandidatePayload,
  lowerBoundWeak,
  searchBest,
  validateLotto,
} from './lotto-core.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, 'candidatos')

function parseArgs(argv) {
  const out = { ms: 120_000, seeds: 10 }
  for (const a of argv) {
    if (a.startsWith('--ms=')) out.ms = Number(a.slice(5))
    else if (a.startsWith('--seeds=')) out.seeds = Number(a.slice(8))
  }
  return out
}

const SEED_POOL = [1, 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43]

async function runTarget(n, t, { ms, seeds }) {
  const lb = lowerBoundWeak(n, t)
  const seedList = SEED_POOL.slice(0, seeds)
  console.log(`\n######## Busca L(${n},6,6,${t}) · LB≥${lb} · seeds=${seedList.join(',')} · ${ms}ms/seed ########`)

  const result = await Promise.resolve(
    searchBest(n, t, { seeds: seedList, annealMs: ms }),
  )

  const validation = validateLotto(result.blocos, n, t)
  const payload = buildCandidatePayload({
    n,
    t,
    blocos: result.blocos,
    validation,
    method: result.method,
    meta: {
      seed: result.seed ?? null,
      annealMs: ms,
      seedsUsadas: seedList,
      lowerBoundFraco: lb,
      gapVsLb: validation.ok ? result.blocos.length - lb : null,
    },
  })

  await mkdir(OUT_DIR, { recursive: true })
  const stamp = validation.ok ? 'ok' : 'FAIL'
  const file = path.join(OUT_DIR, `L${n}-t${t}-${payload.jogos}j-busca-${stamp}.json`)
  await writeFile(file, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`\n>>> L${n} t=${t}: ${payload.jogos} jogos · ok=${validation.ok} · gap vs LB=${payload.gapVsLb}`)
  console.log(`>>> Gravado: ${file}`)
  return payload
}

const args = parseArgs(process.argv.slice(2))
const alvos = [
  { n: 11, t: 5 },
  { n: 12, t: 5 },
]

const resultados = []
for (const alvo of alvos) {
  resultados.push(await runTarget(alvo.n, alvo.t, args))
}

console.log('\n======== RESUMO ========')
for (const r of resultados) {
  console.log(
    `L(${r.n},6,6,${r.t}): ${r.jogos} jogos · ok=${r.validation.ok} · LB=${r.lowerBoundFraco} · gap=${r.gapVsLb}`,
  )
}
