/// <reference lib="webworker" />

const CACHE_NAME = "nyay-sahayak-v1";
const OFFLINE_URL = "/offline.html";
const MAX_CACHED_CONVERSATIONS = 10;

// Static assets to precache
const PRECACHE_ASSETS = [
  "/",
  "/offline.html",
  "/favicon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/manifest.json",
];

// Install: precache static assets + offline page
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip Chrome extensions and other protocols
  if (!url.protocol.startsWith("http")) return;

  // API requests: cache conversations for offline access
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Static assets (JS, CSS, images, fonts): cache-first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navigation requests: network-first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(networkFirstWithOffline(request));
    return;
  }

  // Everything else: network-first
  event.respondWith(networkFirst(request));
});

function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot)$/.test(pathname) ||
    pathname.startsWith("/assets/");
}

// Cache-first for static assets
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("", { status: 503 });
  }
}

// Network-first with offline fallback for navigation
async function networkFirstWithOffline(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offlinePage = await caches.match(OFFLINE_URL);
    return offlinePage || new Response("Offline", { status: 503, headers: { "Content-Type": "text/html" } });
  }
}

// Network-first for general requests
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response("", { status: 503 });
  }
}

// Handle API requests — cache last 10 conversations
// Uses pathname-only cache keys (strips auth headers) to avoid leaking data cross-user
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const isConversationList = url.pathname.endsWith("/conversations");
  const isMessages = /\/conversations\/[^/]+\/messages$/.test(url.pathname);
  const shouldCache = isConversationList || isMessages;

  // Use a stripped cache key (pathname + search) so auth headers don't affect matching
  const cacheKey = shouldCache ? new Request(url.pathname + url.search) : null;

  try {
    const response = await fetch(request);
    if (response.ok && shouldCache && cacheKey) {
      const cache = await caches.open(CACHE_NAME);

      if (isConversationList) {
        // Cache conversation list and enforce max limit
        try {
          const clone = response.clone();
          const data = await clone.json();
          const limited = { ...data, data: (data.data || []).slice(0, MAX_CACHED_CONVERSATIONS) };
          const limitedResponse = new Response(JSON.stringify(limited), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
          cache.put(cacheKey, limitedResponse);
        } catch {
          // JSON parse failed — skip caching, still return original response
        }
      } else if (isMessages) {
        cache.put(cacheKey, response.clone());
      }
    }
    return response;
  } catch {
    // Offline — serve from cache using stripped key
    if (cacheKey) {
      const cached = await caches.match(cacheKey);
      if (cached) return cached;
    }
    return new Response(JSON.stringify({ error: "offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Listen for messages from the app
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  // Clear cached API data on logout to prevent cross-user data leaks
  if (event.data?.type === "CLEAR_API_CACHE") {
    caches.open(CACHE_NAME).then((cache) =>
      cache.keys().then((keys) =>
        Promise.all(
          keys
            .filter((req) => req.url.includes("/api/"))
            .map((req) => cache.delete(req))
        )
      )
    );
  }
});
