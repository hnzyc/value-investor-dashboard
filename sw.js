// Service Worker for Caching
const CACHE_NAME = 'value-investor-v1.2';
const STATIC_CACHE_URLS = [
    '/',
    '/index.html',
    '/js/app.js',
    '/js/config.js',
    '/js/dom.js',
    '/js/toast.js',
    '/js/loading.js',
    '/js/firebase-loader.js',
    '/js/api.js',
    '/js/validation.js',
    '/js/request-manager.js',
    '/css/styles.css',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

const DYNAMIC_CACHE_URLS = [
    'https://www.gstatic.com/firebasejs/',
    'https://generativelanguage.googleapis.com/'
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Caching static resources');
                return cache.addAll(STATIC_CACHE_URLS);
            })
            .catch((error) => {
                console.error('Failed to cache static resources:', error);
            })
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip Chrome extension requests
    if (url.protocol === 'chrome-extension:') {
        return;
    }

    // Handle different types of requests
    event.respondWith(
        handleRequest(request)
    );
});

async function handleRequest(request) {
    const url = new URL(request.url);

    try {
        // Strategy 1: Cache First for static assets
        if (shouldCacheFirst(request)) {
            return await cacheFirst(request);
        }

        // Strategy 2: Network First for API calls and dynamic content
        if (shouldNetworkFirst(request)) {
            return await networkFirst(request);
        }

        // Strategy 3: Stale While Revalidate for Firebase SDK and other CDN resources
        if (shouldStaleWhileRevalidate(request)) {
            return await staleWhileRevalidate(request);
        }

        // Default: Network First
        return await networkFirst(request);
    } catch (error) {
        console.error('Service Worker fetch error:', error);
        return fetch(request);
    }
}

function shouldCacheFirst(request) {
    const url = new URL(request.url);

    // Static assets
    if (request.destination === 'style' ||
        request.destination === 'script' ||
        request.destination === 'font' ||
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.js') ||
        url.pathname === '/' ||
        url.pathname === '/index.html') {
        return true;
    }

    return false;
}

function shouldNetworkFirst(request) {
    const url = new URL(request.url);

    // API calls
    if (url.pathname.includes('/.netlify/functions/') ||
        url.hostname.includes('firestore.googleapis.com') ||
        url.hostname.includes('generativelanguage.googleapis.com')) {
        return true;
    }

    return false;
}

function shouldStaleWhileRevalidate(request) {
    const url = new URL(request.url);

    // Firebase SDK and other CDN resources
    if (url.hostname.includes('gstatic.com') ||
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('fonts.googleapis.com')) {
        return true;
    }

    return false;
}

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) {
        return cached;
    }

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.error('Cache first strategy failed:', error);
        throw error;
    }
}

async function networkFirst(request) {
    try {
        const response = await fetch(request);

        // Cache successful responses
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        // Fallback to cache
        const cached = await caches.match(request);
        if (cached) {
            return cached;
        }
        throw error;
    }
}

async function staleWhileRevalidate(request) {
    const cached = await caches.match(request);

    // Start fetch in background
    const fetchPromise = fetch(request).then((response) => {
        if (response.ok) {
            const cache = caches.open(CACHE_NAME);
            cache.then((c) => c.put(request, response.clone()));
        }
        return response;
    }).catch(() => {
        // Ignore network errors in background
    });

    // Return cached version immediately if available
    if (cached) {
        return cached;
    }

    // Wait for network if no cache
    return await fetchPromise;
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
        console.log('Background sync triggered');
        // Handle offline actions when back online
        event.waitUntil(processOfflineActions());
    }
});

async function processOfflineActions() {
    // Process any queued actions from when the user was offline
    // This could include saving stocks to watchlist, etc.
    console.log('Processing offline actions...');
}

// Push notifications (for future enhancement)
self.addEventListener('push', (event) => {
    if (event.data) {
        const options = {
            body: event.data.text(),
            icon: '/favicon.ico',
            badge: '/favicon.ico'
        };

        event.waitUntil(
            self.registration.showNotification('Value Investor Dashboard', options)
        );
    }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        clients.openWindow('/')
    );
});