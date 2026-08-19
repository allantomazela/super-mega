import { createAuthClient } from '@neondatabase/auth'
import { BetterAuthReactAdapter } from '@neondatabase/auth/react/adapters'
import { patchAuthFetch } from '@/lib/patchAuthFetch'

patchAuthFetch()

/** URL pública do Neon Auth (Google já habilitado no projeto). */
export const NEON_AUTH_URL =
  import.meta.env.VITE_NEON_AUTH_URL ??
  'https://ep-small-paper-acm07pmb.neonauth.sa-east-1.aws.neon.tech/neondb/auth'

export const authClient = createAuthClient(NEON_AUTH_URL, {
  adapter: BetterAuthReactAdapter({
    fetchOptions: {
      credentials: 'include',
    },
  }),
})

/** Destino após o Google: pasta do GitHub Pages, sem hash e sem /login. */
export function appCallbackUrl(): string {
  const base = import.meta.env.BASE_URL || '/'
  const origin = window.location.origin
  if (base === '/') return `${origin}/`
  return `${origin}${base.endsWith('/') ? base : `${base}/`}`
}

export { SESSION_VERIFIER_PARAM, limparVerifierGuardado } from '@/lib/patchAuthFetch'
