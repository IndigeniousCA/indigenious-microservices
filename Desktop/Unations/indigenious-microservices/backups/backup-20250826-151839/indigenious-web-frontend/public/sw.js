// Indigenous Forest Service Worker - Mycelial Network Cache
const CACHE_NAME = 'forest-cache-v1';
const OFFLINE_CACHE = 'forest-offline-v1';
const SEASONAL_CACHE = 'forest-seasonal-v1';

// Resources to cache for offline forest exploration
const STATIC_RESOURCES = [
  '/',
  '/dashboard',
  '/rfqs',
  '/auth/login',
  '/manifest.json',
  '/offline.html'
];

// Elemental assets to pre-cache
const ELEMENTAL_ASSETS = [
  '/icons/tree-192.png',
  '/icons/tree-512.png',
  '/sounds/water-flow.mp3',
  '/sounds/wind-whisper.mp3',
  '/sounds/bird-song.mp3'
];

// Install event - Plant the seeds
self.addEventListener('install', (event) => {
  console.log('🌱 Planting service worker seeds...');
  
  event.waitUntil(
    Promise.all([
      // Cache static resources
      caches.open(CACHE_NAME).then((cache) => {
        console.log('📦 Caching forest resources');
        return cache.addAll(STATIC_RESOURCES.filter(url => !url.includes('undefined')));
      }),
      // Cache elemental assets
      caches.open(SEASONAL_CACHE).then((cache) => {
        console.log('🍃 Caching seasonal elements');
        // Only cache assets that exist
        return Promise.allSettled(
          ELEMENTAL_ASSETS.map(url => 
            fetch(url).then(response => {
              if (response.ok) {
                return cache.put(url, response);
              }
            }).catch(() => {
              console.log(`Skipping ${url} - not available yet`);
            })
          )
        );
      })
    ])
  );
  
  self.skipWaiting();
});

// Activate event - Grow the forest
self.addEventListener('activate', (event) => {
  console.log('🌲 Forest service worker growing...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            // Remove old caches (autumn cleanup)
            return cacheName.startsWith('forest-') && 
                   cacheName !== CACHE_NAME && 
                   cacheName !== OFFLINE_CACHE &&
                   cacheName !== SEASONAL_CACHE;
          })
          .map((cacheName) => {
            console.log('🍂 Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  
  self.clients.claim();
});

// Fetch event - Navigate the forest paths
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-HTTP requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // API calls flow like rivers - network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(riverStrategy(request));
    return;
  }
  
  // Static resources grow from cache - cache first
  if (isStaticResource(url.pathname)) {
    event.respondWith(forestStrategy(request));
    return;
  }
  
  // Default: Try network, fall back to cache
  event.respondWith(mycelialStrategy(request));
});

// River Strategy - Network first, cache fallback (for dynamic data)
async function riverStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      
      // Track river flow
      trackRiverFlow(request.url);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('🌊 River blocked, checking pools...', error);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('💧 Found in pool cache');
      return cachedResponse;
    }
    
    // Return offline indicator
    return new Response(
      JSON.stringify({
        offline: true,
        message: 'The river is frozen - offline mode',
        element: 'water',
        season: getCurrentSeason()
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 503
      }
    );
  }
}

// Forest Strategy - Cache first, network fallback (for static assets)
async function forestStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    console.log('🌲 Found in forest cache');
    
    // Update cache in background (trees growing)
    event.waitUntil(
      fetch(request).then(response => {
        if (response.ok) {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(request, response);
          });
        }
      }).catch(() => {
        console.log('🍃 Background growth failed - using cached tree');
      })
    );
    
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('🌫️ Lost in fog - offline');
    return createOfflineResponse();
  }
}

// Mycelial Strategy - Balanced network/cache (for pages)
async function mycelialStrategy(request) {
  try {
    const networkResponse = await fetch(request, { 
      timeout: 3000 // Quick timeout for mobile
    });
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      
      // Spread through mycelial network
      broadcastUpdate(request.url);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('🍄 Checking mycelial memory...');
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Try to find any cached page
    const allCaches = await caches.keys();
    for (const cacheName of allCaches) {
      const cache = await caches.open(cacheName);
      const response = await cache.match(request);
      if (response) {
        return response;
      }
    }
    
    return createOfflineResponse();
  }
}

// Helper functions
function isStaticResource(pathname) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
  return staticExtensions.some(ext => pathname.endsWith(ext));
}

function getCurrentSeason() {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

function trackRiverFlow(url) {
  // Track API usage patterns
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'river-flow',
        url: url,
        timestamp: Date.now()
      });
    });
  });
}

function broadcastUpdate(url) {
  // Notify all clients of cache updates
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'cache-update',
        url: url,
        season: getCurrentSeason()
      });
    });
  });
}

function createOfflineResponse() {
  const offlineHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Forest Offline - Resting</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          min-height: 100vh;
          background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, system-ui, sans-serif;
          color: white;
        }
        .container {
          text-align: center;
          padding: 2rem;
        }
        .tree {
          font-size: 100px;
          animation: sway 3s ease-in-out infinite;
        }
        @keyframes sway {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }
        h1 {
          margin: 1rem 0;
          font-size: 2rem;
          background: linear-gradient(90deg, #22C55E, #3B82F6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        p {
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.6;
        }
        .reconnect {
          margin-top: 2rem;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #22C55E, #16A34A);
          border: none;
          border-radius: 50px;
          color: white;
          font-size: 1rem;
          cursor: pointer;
          transition: transform 0.3s;
        }
        .reconnect:hover {
          transform: scale(1.05);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="tree">🌲</div>
        <h1>The Forest is Sleeping</h1>
        <p>You're offline, but the forest remembers your path.</p>
        <p>Like trees in winter, we're conserving energy.</p>
        <button class="reconnect" onclick="location.reload()">
          Wake the Forest 🌅
        </button>
      </div>
    </body>
    </html>
  `;
  
  return new Response(offlineHTML, {
    headers: { 'Content-Type': 'text/html' },
    status: 503
  });
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('🔄 Syncing with the forest...');
  
  if (event.tag === 'sync-rfqs') {
    event.waitUntil(syncRFQs());
  } else if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncRFQs() {
  // Sync any offline RFQ submissions
  const cache = await caches.open(OFFLINE_CACHE);
  const requests = await cache.keys();
  
  for (const request of requests) {
    if (request.url.includes('/api/rfqs')) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.delete(request);
          console.log('💧 RFQ synced to river');
        }
      } catch (error) {
        console.log('🌊 River still blocked, will retry');
      }
    }
  }
}

async function syncMessages() {
  // Sync offline mycelial network messages
  console.log('🍄 Syncing mycelial messages...');
}

// Push notifications - Bird songs
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || 'New activity in the forest',
    icon: '/icons/tree-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [200, 100, 200],
    tag: 'forest-notification',
    actions: [
      { action: 'view', title: 'View', icon: '/icons/eye.png' },
      { action: 'dismiss', title: 'Dismiss', icon: '/icons/x.png' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('🌲 Forest Platform', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  }
});

console.log('🌲 Indigenous Forest Service Worker Ready');
console.log(`🍃 Season: ${getCurrentSeason()}`);
console.log('🔥 Element: Digital Fire');
console.log('💧 Ready to channel the rivers offline');