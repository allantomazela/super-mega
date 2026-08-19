/** Header que o Neon Auth recusa no CORS (Access-Control-Allow-Headers). */
export const SESSION_VERIFIER_PARAM = 'neon_auth_session_verifier'

function lerVerifierDaPagina(): string | null {
  const naQuery = new URLSearchParams(window.location.search).get(SESSION_VERIFIER_PARAM)
  if (naQuery) return naQuery
  const hash = window.location.hash
  const interrogacao = hash.indexOf('?')
  if (interrogacao >= 0) {
    return new URLSearchParams(hash.slice(interrogacao + 1)).get(SESSION_VERIFIER_PARAM)
  }
  try {
    return sessionStorage.getItem(SESSION_VERIFIER_PARAM)
  } catch {
    return null
  }
}

function guardarVerifier(valor: string) {
  try {
    sessionStorage.setItem(SESSION_VERIFIER_PARAM, valor)
  } catch {
    /* storage indisponível */
  }
}

export function limparVerifierGuardado() {
  try {
    sessionStorage.removeItem(SESSION_VERIFIER_PARAM)
  } catch {
    /* storage indisponível */
  }
}

function semHeaderVerifier(headers?: HeadersInit): Headers {
  const next = new Headers(headers)
  next.delete(SESSION_VERIFIER_PARAM)
  return next
}

function tokenDosHeaders(headers?: HeadersInit): string | null {
  if (!headers) return null
  return new Headers(headers).get(SESSION_VERIFIER_PARAM)
}

/**
 * O Neon bloqueia o header customizado no preflight.
 * O get-session exige o verifier na query + cookie de challenge (credentials).
 */
export function patchAuthFetch() {
  if (typeof window === 'undefined') return
  const flag = '__neonAuthFetchPatched'
  if ((window as Window & { [flag]?: boolean })[flag]) return
  ;(window as Window & { [flag]?: boolean })[flag] = true

  const originalFetch = window.fetch.bind(window)
  const daPagina = lerVerifierDaPagina()
  if (daPagina) guardarVerifier(daPagina)

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const initHeaders = init?.headers
    const requestHeaders = input instanceof Request ? input.headers : undefined
    const token =
      tokenDosHeaders(initHeaders) ||
      (requestHeaders ? requestHeaders.get(SESSION_VERIFIER_PARAM) : null) ||
      lerVerifierDaPagina()
    if (token) guardarVerifier(token)

    const headers = semHeaderVerifier(initHeaders ?? requestHeaders)
    const nextInit: RequestInit = { ...init, headers, credentials: init?.credentials ?? 'include' }

    let url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    if (token && url.includes('get-session')) {
      const parsed = new URL(url, window.location.origin)
      if (!parsed.searchParams.get(SESSION_VERIFIER_PARAM)) {
        parsed.searchParams.set(SESSION_VERIFIER_PARAM, token)
      }
      url = parsed.toString()
      if (typeof input === 'string' || input instanceof URL) {
        return originalFetch(url, nextInit)
      }
      return originalFetch(new Request(url, input), nextInit)
    }

    return originalFetch(input, nextInit)
  }
}
