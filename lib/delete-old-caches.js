/* global CACHE_PREFIX */
/* global CACHE_VERSION */
self.addEventListener('activate', function(event) {
  // Delete all caches handled by broccoli-serviceworker.
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return (cacheName.indexOf(CACHE_PREFIX) === 0 && cacheName !== CACHE_VERSION);
        }).map(function(cacheName) {
          logDebug('Deleting out of date cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
});
