/** Portal de Loterias da Caixa — Mega-Sena (API pública oficial). */
export const CAIXA_MEGASENA_API =
  'https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena'

export const CAIXA_RESULTADOS_URL = 'https://loterias.caixa.gov.br/Paginas/Mega-Sena.aspx'

export interface ResultadoOficialMega {
  numero: number
  data: string
  dezenas: number[]
  /** true = não houve ganhador da Sena; prêmio acumulou. */
  acumulado: boolean
  ganhadoresSena: number
  proximo?: number
  dataProximo?: string
  estimado?: number
}

interface RateioOficial {
  faixa?: number | string
  descricaoFaixa?: string
  numeroDeGanhadores?: number
  quantidadeGanhadores?: number
  ganhadores?: number
}

interface PayloadOficial {
  numero?: number
  dataApuracao?: string
  listaDezenas?: string[]
  acumulado?: boolean | string | number
  listaRateioPremio?: RateioOficial[]
  numeroConcursoProximo?: number
  dataProximoConcurso?: string
  valorEstimadoProximoConcurso?: number
}

function parseDezenas(lista: string[] | undefined): number[] {
  return (lista ?? [])
    .map((d) => parseInt(String(d), 10))
    .filter((n) => n >= 1 && n <= 60)
    .sort((a, b) => a - b)
}

function ganhadoresFaixaSena(rateio: RateioOficial[] | undefined): number {
  const lista = rateio ?? []
  const sena =
    lista.find((faixa) => Number(faixa.faixa) === 1) ??
    lista.find((faixa) => /6\s*acertos/i.test(String(faixa.descricaoFaixa ?? '')))
  const n = sena?.numeroDeGanhadores ?? sena?.quantidadeGanhadores ?? sena?.ganhadores
  const parsed = Number(n)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

export function parseResultadoOficial(raw: unknown): ResultadoOficialMega | null {
  if (!raw || typeof raw !== 'object') return null
  const d = raw as PayloadOficial
  const numero = d.numero
  const data = d.dataApuracao
  const dezenas = parseDezenas(d.listaDezenas)
  if (!numero || !data || dezenas.length !== 6) return null
  const ganhadoresSena = ganhadoresFaixaSena(d.listaRateioPremio)
  const acumulado = ganhadoresSena === 0
  return {
    numero,
    data,
    dezenas,
    acumulado,
    ganhadoresSena,
    proximo: d.numeroConcursoProximo,
    dataProximo: d.dataProximoConcurso,
    estimado: d.valorEstimadoProximoConcurso,
  }
}

async function getJson(url: string): Promise<unknown> {
  const resp = await fetch(url, { cache: 'no-store', credentials: 'omit' })
  if (!resp.ok) throw new Error(`Caixa HTTP ${resp.status}`)
  return resp.json()
}

export async function buscarUltimoResultadoOficial(): Promise<ResultadoOficialMega | null> {
  try {
    const vivo = parseResultadoOficial(await getJson(`${CAIXA_MEGASENA_API}/`))
    if (vivo) return vivo
  } catch {
    /* tenta o snapshot gerado no build */
  }
  try {
    const resp = await fetch(`${import.meta.env.BASE_URL}ultimo-oficial.json`, {
      cache: 'no-store',
      credentials: 'omit',
    })
    if (!resp.ok) return null
    return parseResultadoOficial(await resp.json())
  } catch {
    return null
  }
}

export async function buscarResultadoOficial(numero: number): Promise<ResultadoOficialMega | null> {
  if (!Number.isInteger(numero) || numero < 1) return null
  try {
    return parseResultadoOficial(await getJson(`${CAIXA_MEGASENA_API}/${numero}`))
  } catch {
    return null
  }
}
