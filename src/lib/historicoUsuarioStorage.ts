/**
 * Persistência local do histórico por usuário autenticado.
 * Chave inclui userId — um login Google não lê o histórico de outro.
 * (SPA sem API: isolamento no dispositivo; sem userId no browser de terceiros.)
 */

export interface ConferenciaRealizadaJogo {
  jogo: number[]
  acertos: number
  acertadas: number[]
}

export interface ConferenciaRealizada {
  id: string
  data: string
  modo: string
  dezenasSorteadas: number[]
  jogos: ConferenciaRealizadaJogo[]
  grupo?: string
}

export interface JogoConfirmado {
  id: string
  data: string
  modo: string
  /** Volantes salvos para jogar / conferir depois. */
  jogos: number[][]
  status: 'pendente' | 'conferido'
  concursoNumero?: number
  resultado?: {
    dezenasSorteadas: number[]
    melhorAcertos: number
    jogos: ConferenciaRealizadaJogo[]
  }
}

export interface HistoricoUsuarioStore {
  conferencias: ConferenciaRealizada[]
  confirmados: JogoConfirmado[]
  /** IDs de alertas de prêmio já exibidos (não repetir toast). */
  alertasVistos: string[]
}

const LEGACY_KEY = 'mega_historico_conferencias'
const MAX_CONFERENCIAS = 50
const MAX_CONFIRMADOS = 40

function storageKey(userId: string): string {
  return `mega_hist_user_v1:${userId}`
}

function storeVazio(): HistoricoUsuarioStore {
  return { conferencias: [], confirmados: [], alertasVistos: [] }
}

function isConferencia(c: unknown): c is ConferenciaRealizada {
  if (!c || typeof c !== 'object') return false
  const o = c as ConferenciaRealizada
  return (
    typeof o.id === 'string' &&
    Array.isArray(o.dezenasSorteadas) &&
    Array.isArray(o.jogos)
  )
}

function isConfirmado(c: unknown): c is JogoConfirmado {
  if (!c || typeof c !== 'object') return false
  const o = c as JogoConfirmado
  return typeof o.id === 'string' && Array.isArray(o.jogos) && (o.status === 'pendente' || o.status === 'conferido')
}

export function carregarHistoricoUsuario(userId: string): HistoricoUsuarioStore {
  if (!userId) return storeVazio()
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<HistoricoUsuarioStore>
      return {
        conferencias: Array.isArray(parsed.conferencias)
          ? parsed.conferencias.filter(isConferencia).slice(0, MAX_CONFERENCIAS)
          : [],
        confirmados: Array.isArray(parsed.confirmados)
          ? parsed.confirmados.filter(isConfirmado).slice(0, MAX_CONFIRMADOS)
          : [],
        alertasVistos: Array.isArray(parsed.alertasVistos)
          ? parsed.alertasVistos.filter((x) => typeof x === 'string')
          : [],
      }
    }

    // Migração única: histórico legado (sem user) → conta atual
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy) {
      const parsed = JSON.parse(legacy)
      const conferencias = Array.isArray(parsed) ? parsed.filter(isConferencia) : []
      const migrado: HistoricoUsuarioStore = {
        conferencias: conferencias.slice(0, MAX_CONFERENCIAS),
        confirmados: [],
        alertasVistos: [],
      }
      salvarHistoricoUsuario(userId, migrado)
      localStorage.removeItem(LEGACY_KEY)
      return migrado
    }
  } catch {
    /* ignore */
  }
  return storeVazio()
}

export function salvarHistoricoUsuario(userId: string, store: HistoricoUsuarioStore): void {
  if (!userId) return
  try {
    const payload: HistoricoUsuarioStore = {
      conferencias: store.conferencias.slice(0, MAX_CONFERENCIAS),
      confirmados: store.confirmados.slice(0, MAX_CONFIRMADOS),
      alertasVistos: store.alertasVistos.slice(0, 200),
    }
    localStorage.setItem(storageKey(userId), JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}

export function novoId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function conferirJogosContraSorteio(
  jogos: number[][],
  dezenasSorteadas: number[],
): ConferenciaRealizadaJogo[] {
  const set = new Set(dezenasSorteadas)
  return jogos.map((jogo) => {
    const acertadas = jogo.filter((n) => set.has(n)).sort((a, b) => a - b)
    return { jogo: [...jogo].sort((a, b) => a - b), acertos: acertadas.length, acertadas }
  })
}

export function labelPremio(acertos: number): string | null {
  if (acertos >= 6) return 'Sena'
  if (acertos === 5) return 'Quina'
  if (acertos === 4) return 'Quadra'
  return null
}
