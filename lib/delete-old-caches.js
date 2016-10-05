
self.addEventListener('activate', function(event) {
  // Delete all caches handled by broccoli-serviceworker.
  logDebug('Deleting out of date caches, current cache version:', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
          cacheNames.map(function (cacheName) {
            if (cacheName.indexOf(CACHE_PREFIX) === 0 &&
                !/inactive\${3}$/i.test(cacheName) &&
                cacheName !== toolbox.options.cache.name
            ) {
              logDebug('deleting old cache ', cacheName);
              return caches.delete(cacheName);
            }
          })
      );
    }).then(function() {
      self.clients.claim();
    })
  );
});
