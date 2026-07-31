// Service Worker — Tinokpedia PWA
// Strategy: pre-cache the app shell on install, then network-first for everything else.
// On network failure, fall back to the cache so the app works fully offline.

const CACHE_NAME = "tinokpedia-v2"

// Core app-shell files to pre-cache during install.
// Vite hashes JS/CSS filenames, so we cache "/" (index.html) which loads them.
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
]

// Google Fonts to pre-cache for offline use
const FONT_URLS = [
  "https://fonts.googleapis.com/css2?family=Assistant:wght@200..800&display=swap",
  "https://fonts.googleapis.com/css2?family=Heebo:wght@100..900&display=swap",
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(APP_SHELL).catch(() => {
        // Font CSS may fail on first install if offline — that's OK
      })
    )
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  // Clean up old caches
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event

  // Only handle GET requests
  if (request.method !== "GET") return

  // Skip Clerk / external API calls — they need real network
  const url = new URL(request.url)
  if (url.pathname.startsWith("/api/")) return
  if (url.hostname.includes("clerk")) return

  // For navigation requests (HTML pages), try network first, fall back to cached "/"
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(() => caches.match("/"))
    )
    return
  }

  // For Google Fonts: cache-first (they rarely change)
  if (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com"
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
            return response
          })
      )
    )
    return
  }

  // Everything else (JS, CSS, images): network-first, cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only cache successful responses
        if (response.status === 200) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        }
        return response
      })
      .catch(() => caches.match(request))
  )
})
