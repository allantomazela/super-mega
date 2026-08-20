/**
 * Núcleo offline de lotto design L(n, 6, 6, t) para Mega-Sena.
 * Índices 1..n. Não rode isto no browser — só em scripts Node.
 */

export function binomial(n, k) {
  if (k < 0 || k > n) return 0
  if (k === 0 || k === n) return 1
  const kk = Math.min(k, n - k)
  let r = 1
  for (let i = 1; i <= kk; i++) r = (r * (n - kk + i)) / i
  return Math.round(r)
}

/** Todas as k-combinações de {1..n}. */
export function combinations(n, k) {
  const out = []
  const acc = []
  function rec(start) {
    if (acc.length === k) {
      out.push([...acc])
      return
    }
    for (let i = start; i <= n - (k - acc.length) + 1; i++) {
      acc.push(i)
      rec(i + 1)
      acc.pop()
    }
  }
  rec(1)
  return out
}

export function toMask(block) {
  let m = 0
  for (const x of block) m |= 1 << (x - 1)
  return m
}

export function fromMask(mask, n) {
  const out = []
  for (let i = 0; i < n; i++) if (mask & (1 << i)) out.push(i + 1)
  return out
}

export function popcount(x) {
  let c = 0
  let v = x >>> 0
  while (v) {
    v &= v - 1
    c++
  }
  return c
}

/**
 * Quantos p-subconjuntos um bloco de 6 “cobre” com interseção ≥ t.
 * Limite inferior fraco: ceil(C(n,p) / covers).
 */
export function coversPerBlock(n, t, p = 6) {
  let total = 0
  for (let i = t; i <= Math.min(6, p); i++) {
    total += binomial(6, i) * binomial(n - 6, p - i)
  }
  return total
}

export function lowerBoundWeak(n, t, p = 6) {
  const universe = binomial(n, p)
  const per = coversPerBlock(n, t, p)
  if (per <= 0) return Infinity
  return Math.ceil(universe / per)
}

/**
 * Validação exaustiva. Retorna { ok, uncovered, checked }.
 */
export function validateLotto(blocos, n, t, p = 6) {
  if (!Array.isArray(blocos) || blocos.length === 0) {
    return { ok: false, uncovered: binomial(n, p), checked: 0 }
  }
  for (const b of blocos) {
    if (!Array.isArray(b) || b.length !== 6) {
      return { ok: false, uncovered: -1, checked: 0, error: 'bloco inválido (precisa 6 índices)' }
    }
    if (b.some((x) => x < 1 || x > n || !Number.isInteger(x))) {
      return { ok: false, uncovered: -1, checked: 0, error: `índice fora de 1..${n}` }
    }
    if (new Set(b).size !== 6) {
      return { ok: false, uncovered: -1, checked: 0, error: 'bloco com repetidos' }
    }
  }

  const blockMasks = blocos.map(toMask)
  const draws = combinations(n, p)
  let uncovered = 0
  for (const draw of draws) {
    const dm = toMask(draw)
    let hit = false
    for (const bm of blockMasks) {
      if (popcount(bm & dm) >= t) {
        hit = true
        break
      }
    }
    if (!hit) uncovered++
  }
  return { ok: uncovered === 0, uncovered, checked: draws.length }
}

/** Lista de máscaras ainda não cobertas (interseção < t com todos os blocos). */
function uncoveredMasks(drawMasks, blockMasks, t) {
  const out = []
  for (const dm of drawMasks) {
    let hit = false
    for (const bm of blockMasks) {
      if (popcount(bm & dm) >= t) {
        hit = true
        break
      }
    }
    if (!hit) out.push(dm)
  }
  return out
}

function scoreBlock(candidateMask, uncovered, t) {
  let s = 0
  for (const dm of uncovered) if (popcount(candidateMask & dm) >= t) s++
  return s
}

/**
 * Construção gulosa: a cada passo escolhe o 6-bloco que cobre mais sorteios faltantes.
 */
export function greedyCover(n, t, p = 6, { maxBlocks = 500, seedCandidates = null } = {}) {
  const drawMasks = combinations(n, p).map(toMask)
  const candidates = (seedCandidates ?? combinations(n, 6)).map(toMask)
  const chosen = []
  let uncovered = [...drawMasks]

  while (uncovered.length > 0 && chosen.length < maxBlocks) {
    let best = -1
    let bestScore = -1
    for (const cm of candidates) {
      if (chosen.includes(cm)) continue
      const s = scoreBlock(cm, uncovered, t)
      if (s > bestScore) {
        bestScore = s
        best = cm
      }
    }
    if (best < 0 || bestScore <= 0) break
    chosen.push(best)
    uncovered = uncoveredMasks(uncovered, [best], t)
  }

  const blocos = chosen.map((m) => fromMask(m, n))
  const validation = validateLotto(blocos, n, t, p)
  return { blocos, validation, method: 'greedy' }
}

function randomInt(rng, maxExclusive) {
  return Math.floor(rng() * maxExclusive)
}

function mulberry32(seed) {
  let a = seed >>> 0
  return function rng() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Simulated annealing para reduzir o número de blocos mantendo cobertura.
 * Partida: matriz válida. Objetivo: minimizar |blocos|.
 */
export function annealShrink(blocos, n, t, p = 6, opts = {}) {
  const {
    seed = 42,
    maxMs = 30_000,
    maxIters = 200_000,
    startTemp = 3.5,
    cool = 0.9997,
    logEvery = 10_000,
  } = opts

  const rng = mulberry32(seed)
  const allCandidates = combinations(n, 6)
  const drawMasks = combinations(n, p).map(toMask)

  let current = blocos.map((b) => [...b].sort((a, b) => a - b))
  let currentMasks = current.map(toMask)

  function isValid(masks) {
    for (const dm of drawMasks) {
      let hit = false
      for (const bm of masks) {
        if (popcount(bm & dm) >= t) {
          hit = true
          break
        }
      }
      if (!hit) return false
    }
    return true
  }

  if (!isValid(currentMasks)) {
    return { blocos: current, validation: validateLotto(current, n, t, p), method: 'anneal', note: 'partida inválida' }
  }

  // Poda determinística: remove blocos redundantes enquanto possível
  current = pruneRedundant(current, n, t, p)
  currentMasks = current.map(toMask)

  let best = current.map((b) => [...b])
  let bestLen = best.length
  let temp = startTemp
  const t0 = Date.now()
  let iters = 0

  while (iters < maxIters && Date.now() - t0 < maxMs) {
    iters++
    const move = rng()
    let next = current.map((b) => [...b])

    if (move < 0.55 && next.length > 1) {
      next.splice(randomInt(rng, next.length), 1)
    } else if (move < 0.85) {
      const idx = randomInt(rng, next.length)
      next[idx] = [...allCandidates[randomInt(rng, allCandidates.length)]]
    } else if (move < 0.95) {
      // troca dois blocos
      const i = randomInt(rng, next.length)
      let j = randomInt(rng, next.length)
      if (j === i) j = (j + 1) % next.length
      next[i] = [...allCandidates[randomInt(rng, allCandidates.length)]]
      next[j] = [...allCandidates[randomInt(rng, allCandidates.length)]]
    } else {
      next.push([...allCandidates[randomInt(rng, allCandidates.length)]])
    }

    const seen = new Set()
    next = next.filter((b) => {
      const m = toMask(b)
      if (seen.has(m)) return false
      seen.add(m)
      return true
    })

    const nextMasks = next.map(toMask)
    if (!isValid(nextMasks)) {
      temp *= cool
      continue
    }

    const delta = next.length - current.length
    if (delta <= 0 || rng() < Math.exp(-delta / Math.max(temp, 1e-9))) {
      current = next
      currentMasks = nextMasks
      if (current.length < bestLen) {
        best = current.map((b) => [...b])
        bestLen = best.length
        if (logEvery > 0) {
          console.log(`  [anneal] novo melhor: ${bestLen} blocos (iter ${iters})`)
        }
      }
    }
    temp *= cool
    if (logEvery > 0 && iters % logEvery === 0) {
      console.log(`  [anneal] iter ${iters} · atual ${current.length} · melhor ${bestLen} · T=${temp.toFixed(4)}`)
    }

    // Reaquecimento ocasional a partir do melhor
    if (iters % 25_000 === 0 && bestLen < current.length) {
      current = best.map((b) => [...b])
      currentMasks = current.map(toMask)
      temp = Math.max(temp, 1.2)
    }
  }

  best = pruneRedundant(best, n, t, p)
  const validation = validateLotto(best, n, t, p)
  return {
    blocos: best,
    validation,
    method: 'anneal',
    iters,
    elapsedMs: Date.now() - t0,
  }
}

/** Remove blocos que não são necessários para a cobertura (ordem fixa). */
export function pruneRedundant(blocos, n, t, p = 6) {
  let current = blocos.map((b) => [...b].sort((a, b) => a - b))
  let changed = true
  while (changed) {
    changed = false
    for (let i = 0; i < current.length; i++) {
      const trial = current.filter((_, idx) => idx !== i)
      if (validateLotto(trial, n, t, p).ok) {
        current = trial
        changed = true
        break
      }
    }
  }
  return current
}

/**
 * Várias partidas gulosa+poda+anneal; devolve a menor matriz válida.
 */
export function searchBest(n, t, opts = {}) {
  const {
    seeds = [1, 2, 3, 5, 7, 11, 13, 17, 19, 23],
    annealMs = 90_000,
    p = 6,
  } = opts

  const drawMasks = combinations(n, p).map(toMask)
  const allBlocks = combinations(n, 6)
  let best = null

  for (const seed of seeds) {
    console.log(`\n--- seed ${seed} ---`)
    const rng = mulberry32(seed)
    // guloso randomizado: às vezes escolhe 2º/3º melhor
    const chosen = []
    let uncovered = [...drawMasks]
    const candidates = allBlocks.map(toMask)

    while (uncovered.length > 0 && chosen.length < 800) {
      const scored = []
      for (const cm of candidates) {
        if (chosen.includes(cm)) continue
        const s = scoreBlock(cm, uncovered, t)
        if (s > 0) scored.push({ cm, s })
      }
      if (scored.length === 0) break
      scored.sort((a, b) => b.s - a.s)
      const top = Math.min(5, scored.length)
      const pick = scored[randomInt(rng, top)].cm
      chosen.push(pick)
      uncovered = uncoveredMasks(uncovered, [pick], t)
    }

    let blocos = chosen.map((m) => fromMask(m, n))
    let validation = validateLotto(blocos, n, t, p)
    console.log(`  guloso-rand: ${blocos.length} · ok=${validation.ok}`)
    if (!validation.ok) continue

    blocos = pruneRedundant(blocos, n, t, p)
    console.log(`  após poda: ${blocos.length}`)

    const annealed = annealShrink(blocos, n, t, p, {
      seed,
      maxMs: annealMs,
      maxIters: 500_000,
      logEvery: 20_000,
    })
    blocos = annealed.blocos
    validation = annealed.validation
    console.log(`  anneal: ${blocos.length} · ok=${validation.ok} · ${annealed.elapsedMs}ms`)

    if (!validation.ok) continue
    if (!best || blocos.length < best.blocos.length) {
      best = {
        blocos,
        validation,
        method: 'searchBest',
        seed,
        elapsedMs: annealed.elapsedMs,
      }
      console.log(`  ★ novo global: ${blocos.length} jogos (seed ${seed})`)
    }
  }

  if (!best) {
    // fallback guloso clássico
    const g = greedyCover(n, t, p)
    const pruned = pruneRedundant(g.blocos, n, t, p)
    return {
      blocos: pruned,
      validation: validateLotto(pruned, n, t, p),
      method: 'greedy+prune',
    }
  }
  return best
}

export function garantiaFromT(t) {
  if (t === 5) return 'quina'
  if (t === 4) return 'quadra'
  return `t${t}`
}

export function buildCandidatePayload({ n, t, blocos, validation, method, meta = {} }) {
  const garantia = garantiaFromT(t)
  return {
    schema: 'fechamento-candidato/v1',
    label: `L(${n},6,6,${t})`,
    n,
    t,
    garantia,
    p: 6,
    k: 6,
    jogos: blocos.length,
    combinacoesUniverso: binomial(n, 6),
    lowerBoundFraco: lowerBoundWeak(n, t, 6),
    validation: {
      ok: validation.ok,
      uncovered: validation.uncovered,
      checked: validation.checked,
      error: validation.error ?? null,
    },
    method,
    geradoEm: new Date().toISOString(),
    statusSugerido: validation.ok ? 'melhor_conhecida' : 'invalida',
    otima: false,
    fonte: `Gerada offline (${method}); ainda não embarcada no app`,
    blocos,
    ...meta,
  }
}

/** Prioridades sugeridas para a próxima leva de matrizes. */
export const PRIORIDADES = [
  { n: 10, t: 4, label: 'L10 Quadra — mesmo grupo do L10 Quina, garantia mais fraca' },
  { n: 11, t: 5, label: 'L11 Quina' },
  { n: 12, t: 5, label: 'L12 Quina' },
  { n: 10, t: 5, label: 'Smoke: redescobrir/encolher L10 Quina (conhecido=14)' },
  { n: 13, t: 5, label: 'L13 Quina' },
  { n: 14, t: 5, label: 'L14 Quina' },
]
