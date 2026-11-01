const CACHE_NAME = "testope-web-v3";
const APP_FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./data/test_Auxiliar_Administrativo.json",
  "./data/test_Celador.json",
  "./data/test_Comun_Categoria_A_B_C1.json",
  "./data/test_Comun_Categoria_C2_C3_D_E.json",
  "./data/test_Oficial_Mantenimiento_Mecanico.json",
  "./data/test_Oficial_Mantenimiento_Calefactor_Fontanero.json",
  "./data/test_Operario_Servicios.json",
  "./data/test_Tecnico_Superior_Admin_Gestion.json"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request).then(response => {
        if (response.ok && new URL(event.request.url).origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
    )
  );
});
