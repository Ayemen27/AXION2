/**
 * Service Worker - نظام العمل الأوفلاين
 * يدير التخزين المحلي والطلبات المعلقة
 */

const CACHE_NAME = 'axion-v1';
const RUNTIME_CACHE = 'runtime-v1';

// الملفات الأساسية للتخزين المحلي
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// تثبيت Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// تفعيل Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// استراتيجية التخزين: Network First, Cache Fallback
self.addEventListener('fetch', (event) => {
  // تجاهل الطلبات غير GET
  if (event.request.method !== 'GET') {
    return;
  }

  // تجاهل طلبات Chrome Extensions
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // حفظ الاستجابة في الكاش
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // إذا فشل الاتصال، استخدم الكاش
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // إذا لم يوجد في الكاش، أرجع صفحة offline
          return caches.match('/index.html');
        });
      })
  );
});

// Background Sync - المزامنة في الخلفية
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-operations') {
    event.waitUntil(syncPendingOperations());
  }
});

async function syncPendingOperations() {
  // سيتم استدعاء هذه الدالة من الكود الرئيسي
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({
      type: 'SYNC_PENDING_OPERATIONS',
    });
  });
}

// رسائل من الصفحة الرئيسية
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
