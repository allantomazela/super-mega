import { createAuthClient } from '@neondatabase/auth'
import { BetterAuthReactAdapter } from '@neondatabase/auth/react/adapters'

/** URL pública do Neon Auth (Google já habilitado no projeto). */
export const NEON_AUTH_URL =
  import.meta.env.VITE_NEON_AUTH_URL ??
  'https://ep-small-paper-acm07pmb.neonauth.sa-east-1.aws.neon.tech/neondb/auth'

const SESSION_VERIFIER_PARAM = 'neon_auth_session_verifier'

export const authClient = createAuthClient(NEON_AUTH_URL, {
  adapter: BetterAuthReactAdapter({
    fetchOptions: {
      credentials: 'include',
    },
  }),
})

export function appCallbackUrl(): string {
  const base = import.meta.env.BASE_URL || '/'
  const origin = window.location.origin
  const root =
    base === '/' ? `${origin}/` : `${origin}${base.endsWith('/') ? base : `${base}/`}`
  return `${root}#/`
}

/** Lê e remove o verifier da URL antes do get-session (query extra gera HTTP 400). */
export const SESSION_VERIFIER_HEADER = 'neon_auth_session_verifier'

export function consumeSessionVerifierFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search)
  const verifier = params.get(SESSION_VERIFIER_PARAM)
  if (!verifier) return null
  params.delete(SESSION_VERIFIER_PARAM)
  const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`
  window.history.replaceState({}, '', next)
  return verifier
}
