/**
 * Evita toast repetido de prêmio Lotofácil no mesmo dispositivo/conta.
 */

function key(userId: string): string {
  return `lf_alertas_vistos_v1:${userId}`
}

export function carregarAlertasLotofacilVistos(userId: string): string[] {
  if (!userId) return []
  try {
    const raw = localStorage.getItem(key(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string').slice(0, 300) : []
  } catch {
    return []
  }
}

export function registrarAlertaLotofacilVisto(userId: string, alertaId: string): void {
  if (!userId || !alertaId) return
  const atuais = carregarAlertasLotofacilVistos(userId)
  if (atuais.includes(alertaId)) return
  try {
    localStorage.setItem(key(userId), JSON.stringify([alertaId, ...atuais].slice(0, 300)))
  } catch {
    /* ignore */
  }
}
