import type {
  ConcursoLotofacil,
  OrigemConcursosLotofacil,
  ResultadoCargaLotofacil,
} from '@/modules/lotofacil/types'
import { CONCURSOS_LOTOFACIL_ESTATICOS } from '@/modules/lotofacil/data/concursosHistoricos'
import {
  buscarResultadoLotofacil,
  buscarUltimoResultadoLotofacil,
  oficialParaConcurso,
} from '@/modules/lotofacil/services/caixaLotofacil'

interface SnapshotNeon {
  concursos?: ConcursoLotofacil[]
}

function timeoutController(ms: number): AbortController {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  controller.signal.addEventListener('abort', () => clearTimeout(timer))
  return controller
}

let cacheSnapshot: ConcursoLotofacil[] | null | undefined

export async function buscarSnapshotLotofacil(): Promise<ConcursoLotofacil[] | null> {
  if (cacheSnapshot !== undefined) return cacheSnapshot
  try {
    const controller = timeoutController(8000)
    const resp = await fetch(`${import.meta.env.BASE_URL}data/lotofacil.json`, {
      signal: controller.signal,
    })
    if (!resp.ok) {
      cacheSnapshot = null
      return null
    }
    const payload = (await resp.json()) as SnapshotNeon
    const lista = (payload.concursos ?? []).filter(
      (c) =>
        c &&
        typeof c.numero === 'number' &&
        typeof c.data === 'string' &&
        Array.isArray(c.dezenas) &&
        c.dezenas.length === 15,
    )
    cacheSnapshot = lista.length >= 10 ? lista : null
    return cacheSnapshot
  } catch {
    cacheSnapshot = null
    return null
  }
}

async function buscarAoVivo(quantidade = 200): Promise<ConcursoLotofacil[] | null> {
  try {
    const latest = await buscarUltimoResultadoLotofacil()
    if (!latest) return null
    const alvos: number[] = []
    for (let i = 0; i < quantidade; i++) alvos.push(latest.numero - i)
    const resultados: ConcursoLotofacil[] = []
    const TAM = 8
    for (let ini = 0; ini < alvos.length; ini += TAM) {
      const lote = alvos.slice(ini, ini + TAM)
      const respostas = await Promise.allSettled(lote.map((n) => buscarResultadoLotofacil(n)))
      for (const r of respostas) {
        if (r.status === 'fulfilled' && r.value) resultados.push(oficialParaConcurso(r.value))
      }
    }
    resultados.sort((a, b) => b.numero - a.numero)
    return resultados.length >= 10 ? resultados : null
  } catch {
    return null
  }
}

function mergeUnico(listas: ConcursoLotofacil[][]): ConcursoLotofacil[] {
  const map = new Map<number, ConcursoLotofacil>()
  for (const lista of listas) {
    for (const c of lista) {
      if (!map.has(c.numero)) map.set(c.numero, c)
    }
  }
  return [...map.values()].sort((a, b) => b.numero - a.numero)
}

export async function carregarHistoricoLotofacil(): Promise<ResultadoCargaLotofacil> {
  const [oficial, neon] = await Promise.all([
    buscarUltimoResultadoLotofacil(),
    buscarSnapshotLotofacil(),
  ])

  if (neon && neon.length >= 10) {
    const lista = oficial
      ? mergeUnico([[oficialParaConcurso(oficial)], neon])
      : neon
    return { concursos: lista, origem: oficial ? 'api' : 'neon' }
  }

  const vivo = await buscarAoVivo(200)
  if (vivo) {
    return { concursos: vivo, origem: 'api' }
  }

  if (oficial) {
    return {
      concursos: mergeUnico([[oficialParaConcurso(oficial)], CONCURSOS_LOTOFACIL_ESTATICOS]),
      origem: 'api',
    }
  }

  return { concursos: CONCURSOS_LOTOFACIL_ESTATICOS, origem: 'estatica' }
}

export type { OrigemConcursosLotofacil }
