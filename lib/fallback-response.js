function getFallbackFromCache(request, values, options) {
  logDebug('Fetching from fallback url: '+ options.fallbackURL +'for url: '+request.url);
  return request
    .text()
    .then(function(text) {
      // cannot set mode to navigate in Request constructor init object
      // https://fetch.spec.whatwg.org/#dom-request
      var mode = request.mode === 'navigate' ? 'same-origin' : request.mode;
      var body = text === '' ? undefined : text;
      return new Request(options.fallbackURL, {
        method: request.method,
        headers: request.headers,
        body: body,
        mode: mode,
        credentials: request.credentials,
        redirect: request.redirect,
        cache: request.cache,
      });
    })
    .then(function(req) {
      return toolbox.cacheFirst(req, values, options);
    })
    .then(function(response) {
      if (response) {
        logDebug('Got fallback response from cache',response);
        return response;
      }
    });
}

function fallbackResponse(request, values, options) {
  logDebug('Looking for fallback for:', request.url);
  return new Promise(function(resolve, reject) {
    toolbox.networkFirst(request, values, options).then(function(response) {
      if (response) {
        resolve(response);
      } else {
        logDebug('Network first returned no response, calling fallback from cache.');
        getFallbackFromCache(request, values, options).then(resolve).catch(function(err) {
          logDebug('Fallback failed with:', err);
        });
      }
    }).catch(function(err){
      logDebug('Network first returned err, calling fallback from cache:', err);
      getFallbackFromCache(request, values, options).then(resolve).catch(function(err) {
          logDebug('Fallback2 failed with:', err);
      });
    });
  });
}
