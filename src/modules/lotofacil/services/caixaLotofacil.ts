import type { ConcursoLotofacil, ResultadoOficialLotofacil } from '@/modules/lotofacil/types'

const CAIXA = 'https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil'
export const CAIXA_LOTOFACIL_RESULTADOS_URL =
  'https://loterias.caixa.gov.br/Paginas/Lotofacil.aspx'

function toBrDate(brDate: unknown): string {
  const s = String(brDate ?? '').trim()
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s
  return s
}

export function parseResultadoLotofacil(dados: Record<string, unknown>): ResultadoOficialLotofacil | null {
  const numero = Number(dados.numero ?? dados.concurso)
  const brutos = (dados.listaDezenas ?? dados.dezenas ?? []) as unknown[]
  const dezenas = brutos
    .map((d) => (typeof d === 'number' ? d : parseInt(String(d), 10)))
    .filter((n) => n >= 1 && n <= 25)
    .sort((a, b) => a - b)
  const data = toBrDate(dados.dataApuracao ?? dados.data)
  if (!Number.isFinite(numero) || dezenas.length !== 15 || !data) return null

  const estimadoRaw = dados.valorEstimadoProximoConcurso ?? dados.valorEstimadoProximoSorteio
  const estimado =
    estimadoRaw != null && Number.isFinite(Number(estimadoRaw)) ? Number(estimadoRaw) : null

  return {
    numero,
    data,
    dezenas,
    acumulado: Boolean(dados.acumulado),
    estimado,
  }
}

async function fetchCaixa(url: string, ms = 8000): Promise<Record<string, unknown> | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), ms)
    const resp = await fetch(url, {
      signal: controller.signal,
      credentials: 'omit',
      headers: {
        Accept: 'application/json, text/plain, */*',
      },
    })
    clearTimeout(timer)
    if (!resp.ok) return null
    return (await resp.json()) as Record<string, unknown>
  } catch {
    return null
  }
}

export async function buscarUltimoResultadoLotofacil(): Promise<ResultadoOficialLotofacil | null> {
  const live = await fetchCaixa(`${CAIXA}/`)
  if (live) {
    const parsed = parseResultadoLotofacil(live)
    if (parsed) return parsed
  }
  try {
    const resp = await fetch(`${import.meta.env.BASE_URL}data/lotofacil-ultimo-oficial.json`)
    if (!resp.ok) return null
    return parseResultadoLotofacil((await resp.json()) as Record<string, unknown>)
  } catch {
    return null
  }
}

export async function buscarResultadoLotofacil(
  numero: number,
): Promise<ResultadoOficialLotofacil | null> {
  const live = await fetchCaixa(`${CAIXA}/${numero}`)
  if (!live) return null
  return parseResultadoLotofacil(live)
}

export function oficialParaConcurso(o: ResultadoOficialLotofacil): ConcursoLotofacil {
  return { numero: o.numero, data: o.data, dezenas: o.dezenas }
}
