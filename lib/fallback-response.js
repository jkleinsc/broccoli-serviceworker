function getFallbackFromCache(request, values, options) {
  logDebug('Fetching from fallback url: '+ options.fallbackURL +'for url: '+request.url);
  var req = new Request(options.fallbackURL, request);
  return toolbox.cacheFirst(req, values, options).then(function(response) {
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
