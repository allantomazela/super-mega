/** Registra o service worker só em produção (HTTPS / localhost). */
export function registerPwa(): void {
  if (!import.meta.env.PROD) return
  if (!('serviceWorker' in navigator)) return
  const swUrl = `${import.meta.env.BASE_URL}sw.js`
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(swUrl, { scope: import.meta.env.BASE_URL }).catch(() => {
      /* instalação PWA opcional — o app continua no navegador */
    })
  })
}
