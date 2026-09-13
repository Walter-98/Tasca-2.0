// Cache only the public offline help, never sessions or financial responses.
const CACHE='tasca-public-v1';
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.add(new URL('offline.html',self.registration.scope).href)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{if(e.request.mode==='navigate'&&e.request.method==='GET')e.respondWith(fetch(e.request).catch(async()=>{const r=await caches.match(new URL('offline.html',self.registration.scope).href);return new Response(r?await r.text():'Riconnettiti a Internet per usare Tasca.',{headers:{'Content-Type':'text/html;charset=utf-8'}});}));});
