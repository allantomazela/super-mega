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

/** Destino após o Google: sempre a pasta do GitHub Pages (/super-mega/). */
export function appCallbackUrl(): string {
  const base = import.meta.env.BASE_URL || '/'
  const origin = window.location.origin
  if (base === '/') return `${origin}/`
  return `${origin}${base.endsWith('/') ? base : `${base}/`}`
}

/**
 * Remove o verifier da URL imediatamente.
 * Não pode ir no header (CORS bloqueia) nem na query do get-session (HTTP 400).
 */
export function consumeSessionVerifierFromUrl(): void {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  if (!params.has(SESSION_VERIFIER_PARAM)) return
  params.delete(SESSION_VERIFIER_PARAM)
  const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`
  window.history.replaceState({}, '', next)
}
