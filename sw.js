// Service Worker: serve os arquivos do jogo (extraídos do .zip) como se fosse um servidor real.
// Deve ficar na MESMA pasta do index.html.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  let key = null;
  if (u.pathname.includes('/__play/')) {
    key = u.origin + u.pathname + (u.pathname.endsWith('/') ? 'index.html' : '');
  } else if (u.origin === self.location.origin) {
    // jogo pedindo caminho absoluto (ex.: /assets/a.png): descobre o jogo pelo referrer
    const m = /^(.*\/__play\/[^/]+)\//.exec(e.request.referrer || '');
    if (m) key = new URL(m[1]).origin + m[1].slice(new URL(m[1]).origin.length) + u.pathname;
  }
  if (!key) return;
  e.respondWith((async () => {
    const r = await caches.match(new Request(key));
    if (!r) return u.pathname.includes('/__play/') ? new Response('Arquivo não encontrado no jogo', {status: 404}) : fetch(e.request);
    const range = e.request.headers.get('range');
    if (!range) return r;
    const buf = await r.arrayBuffer(), m = /bytes=(\d*)-(\d*)/.exec(range);
    const s = m[1] ? +m[1] : 0, en = Math.min(m[2] ? +m[2] : buf.byteLength - 1, buf.byteLength - 1);
    return new Response(buf.slice(s, en + 1), {status: 206, headers: {'Content-Type': r.headers.get('Content-Type'), 'Content-Range': `bytes ${s}-${en}/${buf.byteLength}`, 'Content-Length': String(en - s + 1)}});
  })());
});