
self.addEventListener('activate', function(event) {
  // Delete all caches handled by broccoli-serviceworker.
  logDebug('Deleting out of date caches, current cache version:', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return (cacheName.indexOf('$$$inactive$$$') === -1 && cacheName.indexOf(CACHE_PREFIX) === 0 && cacheName !== CACHE_VERSION);
        }).map(function(cacheName) {
          logDebug('Deleting out of date cache:', cacheName);
          return caches.delete(cacheName).then(function() {
            return _postDeleteCacheHook(cacheName);
          });
        })
      );
    }).then(function() {
      self.clients.claim();
    })
  );
});

function _postDeleteCacheHook(cacheName) {
  if (typeof brocswPostDeleteCacheHook === 'function') {
    return brocswPostDeleteCacheHook(cacheName);
  }
  else {
    // Hook is not implemented in the app's serviceworker, that's fine.
    return Promise.resolve();
  }
}
