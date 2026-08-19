import { createAuthClient } from '@neondatabase/auth'
import { BetterAuthReactAdapter } from '@neondatabase/auth/react/adapters'

/** URL pública do Neon Auth (Google já habilitado no projeto). */
export const NEON_AUTH_URL =
  import.meta.env.VITE_NEON_AUTH_URL ??
  'https://ep-small-paper-acm07pmb.neonauth.sa-east-1.aws.neon.tech/neondb/auth'

export const authClient = createAuthClient(NEON_AUTH_URL, {
  adapter: BetterAuthReactAdapter(),
})

export function appCallbackUrl(): string {
  const base = import.meta.env.BASE_URL || '/'
  const origin = window.location.origin
  const root =
    base === '/' ? `${origin}/` : `${origin}${base.endsWith('/') ? base : `${base}/`}`
  return `${root}#/`
}

export function consumeSessionVerifierFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search)
  const verifier = params.get('neon_auth_session_verifier')
  if (!verifier) return null
  params.delete('neon_auth_session_verifier')
  const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`
  window.history.replaceState({}, '', next)
  return verifier
}
