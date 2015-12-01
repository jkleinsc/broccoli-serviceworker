function fallbackResponse(request, values, options) {
  logDebug('Looking for fallback for:', request.url);
  return toolbox.networkFirst(request, values, options).then(function(response){
    logDebug('Default request network got response:', request.url, response);
    if (!response) {
      logDebug('Fetching from fallback url: '+ options.fallbackURL +'for url: '+request.url);
      var req = new Request(options.fallbackURL, request);
      var originalResponse = response;
      return toolbox.cacheFirst(req, values, options).then(function(response) {
        if (response) {
          logDebug('Got response from cache',response);
          return response;
        } else {
          return originalResponse;
        }
      });
    } else {
      return response;
    }
  });
}
