/* Service worker mínimo: habilita instalação PWA sem cache agressivo
   (não intercepta Neon Auth / Google para não quebrar o login). */
const AUTH_HINT = /neonauth|accounts\.google|googleapis|gstatic/

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = req.url
  if (AUTH_HINT.test(url)) return
  if (req.mode !== 'navigate') return
  event.respondWith(
    fetch(req).catch(async () => {
      const cached = await caches.match(req)
      return cached || Response.error()
    }),
  )
})
