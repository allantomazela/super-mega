import { CONCURSOS_HISTORICOS, type ConcursoHistorico } from './concursosHistoricos'

export type OrigemConcursos = 'api' | 'neon' | 'estatica'

export interface ResultadoCargaConcursos {
  concursos: ConcursoHistorico[]
  origem: OrigemConcursos
}

const API_BASE = 'https://loteriascaixa-api.herokuapp.com/api/megasena'

interface ApiConcurso {
  numero?: number
  concurso?: number
  data?: string
  dataApuracao?: string
  dezenas?: string[]
  listaDezenas?: string[]
}

interface SnapshotNeon {
  concursos?: ConcursoHistorico[]
}

function timeoutController(ms: number): AbortController {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  controller.signal.addEventListener('abort', () => clearTimeout(timer))
  return controller
}

function normalizarApi(dados: ApiConcurso): ConcursoHistorico | null {
  const numero = dados.numero ?? dados.concurso
  const data = dados.data ?? dados.dataApuracao
  const dezenas = (dados.dezenas ?? dados.listaDezenas ?? [])
    .map((d) => parseInt(d, 10))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b)
  if (dezenas.length !== 6 || !numero || !data) return null
  return { numero, data, dezenas }
}

let cacheSnapshot: ConcursoHistorico[] | null | undefined

export async function buscarConcursosDoSnapshot(): Promise<ConcursoHistorico[] | null> {
  if (cacheSnapshot !== undefined) return cacheSnapshot
  try {
    const controller = timeoutController(8000)
    const resp = await fetch(`${import.meta.env.BASE_URL}concursos.json`, {
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
        c.dezenas.length === 6,
    )
    cacheSnapshot = lista.length >= 10 ? lista : null
    return cacheSnapshot
  } catch {
    cacheSnapshot = null
    return null
  }
}

export async function buscarConcursosAoVivo(quantidade = 50): Promise<ConcursoHistorico[] | null> {
  try {
    const latestController = timeoutController(6000)
    const respLatest = await fetch(`${API_BASE}/latest`, { signal: latestController.signal })
    if (!respLatest.ok) return null
    const latest = normalizarApi((await respLatest.json()) as ApiConcurso)
    if (!latest) return null

    const alvos: number[] = []
    for (let i = 0; i < quantidade; i++) alvos.push(latest.numero - i)

    const resultados: ConcursoHistorico[] = []
    const TAMANHO_LOTE = 10
    for (let ini = 0; ini < alvos.length; ini += TAMANHO_LOTE) {
      const lote = alvos.slice(ini, ini + TAMANHO_LOTE)
      const respostas = await Promise.allSettled(
        lote.map(async (num) => {
          const controller = timeoutController(6000)
          const r = await fetch(`${API_BASE}/${num}`, { signal: controller.signal })
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json() as Promise<ApiConcurso>
        }),
      )
      for (const r of respostas) {
        if (r.status !== 'fulfilled') continue
        const item = normalizarApi(r.value)
        if (item) resultados.push(item)
      }
    }

    resultados.sort((a, b) => b.numero - a.numero)
    if (resultados.length < 10) return null
    return resultados.slice(0, quantidade)
  } catch {
    return null
  }
}

export async function buscarConcursoPorNumero(numero: number): Promise<ConcursoHistorico | null> {
  const snapshot = await buscarConcursosDoSnapshot()
  const noSnapshot = snapshot?.find((c) => c.numero === numero)
  if (noSnapshot) return noSnapshot

  const local = CONCURSOS_HISTORICOS.find((c) => c.numero === numero)
  if (local) return local

  try {
    const controller = timeoutController(8000)
    const resp = await fetch(`${API_BASE}/${numero}`, { signal: controller.signal })
    if (!resp.ok) return null
    return normalizarApi((await resp.json()) as ApiConcurso)
  } catch {
    return null
  }
}

/**
 * Ordem: snapshot Neon (histórico completo) → API da Caixa → base estática.
 */
export async function carregarConcursos(quantidade = 50): Promise<ResultadoCargaConcursos> {
  const neon = await buscarConcursosDoSnapshot()
  if (neon && neon.length >= 10) {
    return { concursos: neon.slice(0, Math.max(quantidade, neon.length)), origem: 'neon' }
  }

  const aoVivo = await buscarConcursosAoVivo(quantidade)
  if (aoVivo && aoVivo.length >= 10) {
    return { concursos: aoVivo, origem: 'api' }
  }

  return { concursos: CONCURSOS_HISTORICOS, origem: 'estatica' }
}
