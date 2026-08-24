type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'pwa-install-dismissed'
const listeners = new Set<() => void>()

let deferredPrompt: BeforeInstallPromptEvent | null = null

function notify(): void {
  listeners.forEach((fn) => fn())
}

export function pwaIsStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  )
}

export function pwaIsIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function pwaCanPrompt(): boolean {
  return deferredPrompt != null
}

export function pwaWasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

export function pwaDismiss(): void {
  try {
    localStorage.setItem(DISMISS_KEY, '1')
  } catch {
    /* ignore */
  }
  notify()
}

export function subscribePwa(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export async function pwaPromptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable'
  const event = deferredPrompt
  deferredPrompt = null
  await event.prompt()
  const { outcome } = await event.userChoice
  if (outcome === 'accepted') pwaDismiss()
  notify()
  return outcome
}

/** Registra o service worker só em produção e captura o prompt nativo (sem insistir sozinho). */
export function registerPwa(): void {
  if (typeof window === 'undefined') return

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    notify()
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    pwaDismiss()
  })

  if (!import.meta.env.PROD) return
  if (!('serviceWorker' in navigator)) return
  const swUrl = `${import.meta.env.BASE_URL}sw.js`
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(swUrl, { scope: import.meta.env.BASE_URL }).catch(() => {
      /* instalação PWA opcional — o app continua no navegador */
    })
  })
}
