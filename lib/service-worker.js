var fs = require("fs");
var path = require('path');
var brocWriter = require("broccoli-writer");
var helpers = require("broccoli-kitchen-sink-helpers");
var funnel = require('broccoli-funnel');
var swCachePolyFillFile =  require.resolve('serviceworker-cache-polyfill');

var BroccoliServiceWorker = function BroccoliServiceWorker(inTree, options) {
  if (!(this instanceof BroccoliServiceWorker)) {
    return new BroccoliServiceWorker(inTree, options);
  }
  this.inTree = inTree;
  options = options || {};
  this.addPolyfill = options.addPolyfill || true;
  this.debug = options.debug || true;
  this.dynamicCache = options.dynamicCache || [];
  this.excludePaths = options.excludePaths || ['tests/*'];
  this.fallback = options.fallback || [];
  this.includePaths = options.includePaths || [];
  this.polyFillLocation = options.polyFillLocation || 'serviceworker-cache-polyfill.js';
  this.serviceWorkerFile = options.serviceWorkerFile || "service-worker.js";
};

BroccoliServiceWorker.prototype = Object.create(brocWriter.prototype);
BroccoliServiceWorker.prototype.constructor = BroccoliServiceWorker;

BroccoliServiceWorker.prototype.write = function(readTree, destDir) {
  var addPolyfill = this.addPolyfill;
  var debug = this.debug;
  var dynamicCache = this.dynamicCache;
  var fallback = this.fallback;
  var includePaths = this.includePaths;
  var polyFillLocation = this.polyFillLocation;
  var serviceWorkerFile = this.serviceWorkerFile;
  var serviceWorkerTree = funnel(this.inTree, {
    exclude: this.excludePaths
  });

  return readTree(serviceWorkerTree).then(function (srcDir) {
    var cacheVersion = (new Date()).getTime();
    var lines = [];
    if (addPolyfill) {
      lines.push("importScripts('"+polyFillLocation+"');");
    }
    lines.push("var CACHE_VERSION = '" + cacheVersion + "';");
    lines.push("var CURRENT_CACHES = {");
    lines.push("  prefetch: 'prefetch-cache-v' + CACHE_VERSION");
    lines.push("};");
    if (dynamicCache.length) {
      lines.push("CURRENT_CACHES['dynamic'] =  'dynamic-cache-v' + CACHE_VERSION;");
    }
    if (dynamicCache.length) {
      lines.push("var DYNAMIC_URLS = [");
      dynamicCache.forEach(function(cacheURL, idx, array) {
        lines.push(createArrayLine("new RegExp('"+escapeRegExp(cacheURL)+"')", idx, array.length));
      });
      lines.push("];");
    }
    if (fallback.length) {
      lines.push("var FALLBACK_URLS = [");
      fallback.forEach(function(fallback, idx, array) {
        var fallbackParts = fallback.split(' ');
        if (fallbackParts.length > 1) {
          var matchLine = "{match: new RegExp('"+escapeRegExp(fallbackParts[0])+"'), fallback:'"+fallbackParts[1]+"'}";
          lines.push(createArrayLine(matchLine, idx, array.length));
        }
      });
      lines.push("];");
    }

    lines.push("self.addEventListener('install', function(event) {");
    lines.push("  var urlsToPrefetch = [");
    getFilesRecursively(srcDir, [ "**/*" ]).forEach(function (file, idx, array) {
      var srcFile = path.join(srcDir, file);
      var stat = fs.lstatSync(srcFile);

      if (!stat.isFile() && !stat.isSymbolicLink())
        return;
      lines.push(createArrayLine("'"+file+"'", idx, array.length));
    });
    lines.push("];");

    includePaths.forEach(function (file, idx, array) {
      lines.push("urlsToPrefetch.push('"+file+"');");
    });

    //ServiceWorker code derived from examples at https://github.com/GoogleChrome/samples/tree/gh-pages/service-worker
    addDebugLine("'Handling install event. Resources to pre-fetch:', urlsToPrefetch", debug, lines);
    lines.push("  event.waitUntil(");
    lines.push("    caches.open(CURRENT_CACHES['prefetch']).then(function(cache) {");
    lines.push("      return cache.addAll(urlsToPrefetch.map(function(urlToPrefetch) {");
    lines.push("        return new Request(urlToPrefetch, {mode: 'no-cors'});");
    lines.push("      })).then(function() {");
    addDebugLine("'All resources have been fetched and cached.'", debug, lines);
    lines.push("      });");
    lines.push("    }).catch(function(error) {");
    lines.push("      console.error('Pre-fetching failed:', error);");
    lines.push("    })");
    lines.push("  );");
    lines.push("});");
    lines.push("self.addEventListener('activate', function(event) {");
    lines.push("  // Delete all caches that aren't named in CURRENT_CACHES.");
    lines.push("  // While there is only one cache in this example, the same logic will handle the case where");
    lines.push("  // there are multiple versioned caches.");
    lines.push("  var expectedCacheNames = Object.keys(CURRENT_CACHES).map(function(key) {");
    lines.push("    return CURRENT_CACHES[key];");
    lines.push("  });");

    lines.push("  event.waitUntil(");
    lines.push("    caches.keys().then(function(cacheNames) {");
    lines.push("      return Promise.all(");
    lines.push("        cacheNames.map(function(cacheName) {");
    lines.push("          if (expectedCacheNames.indexOf(cacheName) === -1) {");
    lines.push("            // If this cache name isn't present in the array of \"expected\" cache names, then delete it.");
    addDebugLine("'Deleting out of date cache:', cacheName", debug, lines);
    lines.push("            return caches.delete(cacheName);");
    lines.push("          }");
    lines.push("        })");
    lines.push("      );");
    lines.push("    })");
    lines.push("  );");
    lines.push("});");

    lines.push("self.addEventListener('fetch', function(event) {");
    // This is temporarily needed because of https://bugzilla.mozilla.org/show_bug.cgi?id=1203359
    lines.push("  if (new URL(event.request.url).origin !== new URL(self.location).origin) {");
    lines.push("    return;");
    lines.push("  }");

    addDebugLine("'Handling fetch event for', event.request.url", debug, lines);
    if (dynamicCache.length) {
      lines.push("  if(dynamicCacheResponse(event)) {");
      addDebugLine("'Found dynamic cache response:', event.request.url", debug, lines);
      lines.push("    return;");
      lines.push("  }");
    }
    addDebugLine("'Looking in caches for:', event.request.url", debug, lines);
    lines.push("  event.respondWith(");

    lines.push("    // caches.match() will look for a cache entry in all of the caches available to the service worker.");
    lines.push("    // It's an alternative to first opening a specific named cache and then matching on that.");
    lines.push("    caches.match(event.request).then(function(response) {");
    lines.push("      if (response) {");
    addDebugLine("'Found response in cache:', response", debug, lines);
    if (fallback.length) {
      lines.push("      if (response.status >= 400) {");
      addDebugLine("'Got error status, checking for fallback. Response status was:', response.status", debug, lines);
      lines.push("        return fallbackResponse(event.request, response);");
      lines.push("      }");
    }
    lines.push("        return response;");
    lines.push("      }");
    addDebugLine("'No response found in cache. About to fetch from network:'+event.request", debug, lines);
    lines.push("      // event.request will always have the proper mode set ('cors, 'no-cors', etc.) so we don't");
    lines.push("      // have to hardcode 'no-cors' like we do when fetch()ing in the install handler.");
    lines.push("      return fetch(event.request).then(function(response) {");
    addDebugLine("'Response from network is:', response", debug, lines);
    lines.push("        return response;");
    lines.push("      }).catch(function(error) {");
    lines.push("        // This catch() will handle exceptions thrown from the fetch() operation.");
    lines.push("        // Note that a HTTP error response (e.g. 404) will NOT trigger an exception.");
    lines.push("        // It will return a normal response object that has the appropriate error code set.");
    if (fallback.length) {
      addDebugLine("'Got error, checking for fallback.  Error was:', error", debug, lines);
      lines.push("        return fallbackResponse(event.request, response);");
    } else {
      lines.push("        console.error('Fetching failed:', error);");
      lines.push("        throw error;");
    }
    lines.push("      });");
    lines.push("    })");
    lines.push("  );");
    lines.push("});");
    if (dynamicCache.length) {
      lines.push("function dynamicCacheResponse(event) {");
      lines.push("  var matchingUrls = DYNAMIC_URLS.filter(function(dynamicURL) {");
      lines.push("    return (event.request.url.match(dynamicURL) !== null);");
      lines.push("  });");
      lines.push("  if (matchingUrls.length) {");
      addDebugLine("'Pulling dynamic url: '+event.request.url+' from network and adding to cache.'", debug, lines);
      lines.push("    event.respondWith(");
      lines.push("      caches.open('dynamic-cache-v"+cacheVersion+"').then(function(cache) {");
      lines.push("        return fetch(event.request).then(function(response) {");
      addDebugLine("'Got response for dynamic url: '+event.request.url+' now adding to cache.', response", debug, lines);
      lines.push("          if (response.status >= 400) {");
      addDebugLine("'Got response error for dynamic url, try to pull from cache: ',response.status", debug, lines);
      lines.push("          caches.match(event.request).then(function(response) {");
      lines.push("            return response;");
      lines.push("          });");
      lines.push("          } else {");
      lines.push("            cache.put(event.request, response.clone());");
      lines.push("            return response;");
      lines.push("          }");
      lines.push("        }).catch(function(error) {");
      addDebugLine("'Got error for dynamic url, try to pull from cache: ',error", debug, lines);
      lines.push("          caches.match(event.request).then(function(response) {");
      lines.push("            return response;");
      lines.push("          });");
      lines.push("        });");
      lines.push("      })");
      lines.push("    );");
      lines.push("    return true;");
      lines.push("  } else {");
      lines.push("    return false;");
      lines.push("  }");
      lines.push("}");
    }
    if (fallback.length) {
      lines.push("function fallbackResponse(request, response) {");
      addDebugLine("'Looking for fallback for:', request.url", debug, lines);
      lines.push("  var matchingUrls =FALLBACK_URLS.filter(function(fallbackURL) {");
      addDebugLine("'Checking for fallback match with:', fallbackURL", debug, lines);
      lines.push("    return (request.url.match(fallbackURL.match) !== null);");
      lines.push("  });");
      lines.push("  if (matchingUrls.length) {");
      addDebugLine("'Fetching from fallback url: '+ matchingUrls[0].fallback +'for url: '+event.request.url", debug, lines);
      lines.push("    return caches.match(matchingUrls[0].fallback);");
      lines.push("  } else {");
      lines.push("    return response; ");
      lines.push("  } ");
      lines.push("}");
    }
    fs.writeFileSync(path.join(destDir, serviceWorkerFile), lines.join("\n"));
    if (addPolyfill) {
      fs.createReadStream(swCachePolyFillFile).pipe(fs.createWriteStream(path.join(destDir, polyFillLocation)));
    }
  });
};

BroccoliServiceWorker.prototype.addExternalFile = function(file) {
  this.externalFiles.push(file);
};

function addDebugLine(consoleText, debug, lines) {
  if (debug) {
    lines.push("console.log("+consoleText+");");
  }
}

function createArrayLine(line, idx, arrayLength) {
  var arrayLine = line;
  if ((idx+1) < arrayLength) {
    arrayLine += ",";
  }
  return arrayLine;
}

//From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
function escapeRegExp(string){
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getFilesRecursively(dir, globPatterns) {
  return helpers.multiGlob(globPatterns, { cwd: dir });
}

module.exports = BroccoliServiceWorker;
