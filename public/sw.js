const CACHE_NAME = 'wedding-photos-v1'
const IMAGE_CACHE = 'wedding-images-v1'

self.addEventListener('install', (e) => {
  self.skipWaiting()
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(['/','/offline.html'])).catch(()=>{}))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  // Cache-first for images
  if (e.request.destination === 'image') {
    e.respondWith(caches.open(IMAGE_CACHE).then(cache => cache.match(e.request).then(resp => resp || fetch(e.request).then(r => { cache.put(e.request, r.clone()); return r; }).catch(()=>caches.match('/offline.html')))))
    return
  }

  // Network-first for pages
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request).then(resp => resp || caches.match('/offline.html'))))
})
