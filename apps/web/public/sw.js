/* VOTE-GUARD 360 service worker.
   Goal: the capture flow opens with no signal. The photo queue itself lives in IndexedDB, not here.
   - never touches /api/* or anything non-GET or cross-origin (all live data and uploads go straight to the network)
   - hashed build assets (/_next/static) are cached once and reused
   - pages are network-first, falling back to the last copy we saw, then to /capture */
const VERSION = "vg-v2";
const SHELL = ["/", "/capture", "/signin", "/settings", "/dashboard"];

// Cache each shell page and the scripts/styles it references, so the first offline visit works too.
async function precache() {
  const c = await caches.open(VERSION);
  const assets = new Set();
  await Promise.all(SHELL.map(async (u) => {
    try {
      const res = await fetch(u);
      if (!res.ok) return;
      await c.put(u, res.clone());
      const html = await res.text();
      for (const m of html.matchAll(/\/_next\/static\/[^"'\\\s)]+\.(?:js|css)/g)) assets.add(m[0]);
    } catch { /* a page we could not fetch now will be cached when visited */ }
  }));
  await Promise.all([...assets].map((a) => c.add(a).catch(() => {})));
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/") || /\.(png|svg|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      })),
    );
    return;
  }

  event.respondWith(
    fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || (req.mode === "navigate" ? caches.match("/capture") : Response.error()))),
  );
});
