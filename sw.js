/* Service worker: keeps the security-logs app openable without internet. */
const VER = 'sec-f0b133178c';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './favicon-32.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('sec-') && k !== VER).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const timeout = (p, ms) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout')), ms); p.then(v => { clearTimeout(t); res(v); }, e => { clearTimeout(t); rej(e); }); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (/(^|\.)(script\.google\.com|googleusercontent\.com)$/.test(u.hostname)) return; /* data API: never cached */
  if (u.origin === location.origin) {
    if (req.mode === 'navigate') {
      const isApp = u.pathname === '/' || u.pathname.endsWith('/index.html');
      e.respondWith(timeout(fetch(req, { cache: 'no-store' }), 6000).then(r => {
        if (r && r.ok) { const c = r.clone(); caches.open(VER).then(x => x.put(isApp ? './index.html' : req, c)); }
        return r;
      }).catch(() => caches.match(isApp ? './index.html' : req, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))));
      return;
    }
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(r => { if (r && r.ok) { const c = r.clone(); caches.open(VER).then(x => x.put(req, c)); } return r; })));
    return;
  }
  if (/fonts\.(googleapis|gstatic)\.com$|cdnjs\.cloudflare\.com$/.test(u.hostname)) {
    e.respondWith(caches.open('ext-fonts').then(c => c.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
  }
});
