import { CONCURSOS_HISTORICOS, type ConcursoHistorico } from './concursosHistoricos'
import { buscarResultadoOficial, buscarUltimoResultadoOficial } from '@/lib/caixaLoterias'

export type OrigemConcursos = 'api' | 'neon' | 'estatica'

export interface ResultadoCargaConcursos {
  concursos: ConcursoHistorico[]
  origem: OrigemConcursos
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

function oficialParaHistorico(oficial: {
  numero: number
  data: string
  dezenas: number[]
}): ConcursoHistorico {
  return { numero: oficial.numero, data: oficial.data, dezenas: oficial.dezenas }
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
    const latest = await buscarUltimoResultadoOficial()
    if (!latest) return null

    const alvos: number[] = []
    for (let i = 0; i < quantidade; i++) alvos.push(latest.numero - i)

    const resultados: ConcursoHistorico[] = []
    const TAMANHO_LOTE = 8
    for (let ini = 0; ini < alvos.length; ini += TAMANHO_LOTE) {
      const lote = alvos.slice(ini, ini + TAMANHO_LOTE)
      const respostas = await Promise.allSettled(lote.map((num) => buscarResultadoOficial(num)))
      for (const r of respostas) {
        if (r.status !== 'fulfilled' || !r.value) continue
        resultados.push(oficialParaHistorico(r.value))
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
  const oficial = await buscarResultadoOficial(numero)
  if (oficial) return oficialParaHistorico(oficial)

  const snapshot = await buscarConcursosDoSnapshot()
  const noSnapshot = snapshot?.find((c) => c.numero === numero)
  if (noSnapshot) return noSnapshot

  return CONCURSOS_HISTORICOS.find((c) => c.numero === numero) ?? null
}

/**
 * Último concurso: sempre a API oficial da Caixa.
 * Histórico: snapshot Neon (preenchido pelo sync oficial) e, se faltar, a própria Caixa.
 * @param quantidade Limite máximo. Use `Infinity` / número alto para o histórico completo.
 */
export async function carregarConcursos(quantidade = 50): Promise<ResultadoCargaConcursos> {
  const limite = Number.isFinite(quantidade) ? Math.max(1, Math.floor(quantidade)) : Number.MAX_SAFE_INTEGER
  const [oficial, neon] = await Promise.all([buscarUltimoResultadoOficial(), buscarConcursosDoSnapshot()])
  const atual = oficial ? oficialParaHistorico(oficial) : null

  if (neon && neon.length >= 10) {
    const semDuplicata = atual ? neon.filter((c) => c.numero !== atual.numero) : neon
    const concursos = atual ? [atual, ...semDuplicata] : neon
    return { concursos: concursos.slice(0, limite), origem: atual ? 'api' : 'neon' }
  }

  const aoVivoQtd = Math.min(limite, 50)
  const aoVivo = await buscarConcursosAoVivo(aoVivoQtd)
  if (aoVivo && aoVivo.length >= 10) {
    return { concursos: aoVivo.slice(0, limite), origem: 'api' }
  }

  if (atual) {
    const resto = CONCURSOS_HISTORICOS.filter((c) => c.numero !== atual.numero)
    return { concursos: [atual, ...resto].slice(0, limite), origem: 'api' }
  }

  return { concursos: CONCURSOS_HISTORICOS.slice(0, limite), origem: 'estatica' }
}

/** Carrega o maior histórico disponível (snapshot Neon completo quando existir). */
export function carregarHistoricoCompleto(): Promise<ResultadoCargaConcursos> {
  return carregarConcursos(Number.MAX_SAFE_INTEGER)
}
