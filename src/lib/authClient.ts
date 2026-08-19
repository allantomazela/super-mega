import { createAuthClient } from 'better-auth/react'

/** URL pública do Neon Auth (Google já habilitado no projeto). */
export const NEON_AUTH_URL =
  import.meta.env.VITE_NEON_AUTH_URL ??
  'https://ep-small-paper-acm07pmb.neonauth.sa-east-1.aws.neon.tech/neondb/auth'

export const authClient = createAuthClient({
  baseURL: NEON_AUTH_URL,
})

export function appCallbackUrl(): string {
  const base = import.meta.env.BASE_URL || '/'
  const origin = window.location.origin
  const root =
    base === '/' ? `${origin}/` : `${origin}${base.endsWith('/') ? base : `${base}/`}`
  // Hash garante que o GitHub Pages sirva index.html (HTTP 200), não o 404 do site.
  return `${root}#/`
}
