var fs = require("fs");
var path = require('path');
var brocWriter = require("broccoli-writer");
var helpers = require("broccoli-kitchen-sink-helpers");
var funnel = require('broccoli-funnel');
var swCachePolyFillFile =  require.resolve('serviceworker-cache-polyfill');
var swToolboxFile = require.resolve('sw-toolbox/sw-toolbox.js');
var toolboxLocation = 'sw-toolbox.js';

var BroccoliServiceWorker = function BroccoliServiceWorker(inTree, options) {
  if (!(this instanceof BroccoliServiceWorker)) {
    return new BroccoliServiceWorker(inTree, options);
  }
  this.inTree = inTree;
  options = options || {};
  this.addPolyfill = options.addPolyfill || true;
  this.skipWaiting = options.skipWaiting || true;
  this.debug = options.debug || false;
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
  var skipWaiting = this.skipWaiting;
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
    var lines = [];
    lines.push("importScripts('"+toolboxLocation+"');");
    lines.push("var CACHE_PREFIX = 'brocsw-v';");
    lines.push("var CACHE_VERSION = CACHE_PREFIX+'"+(new Date()).getTime()+"';");
    lines.push("toolbox.options.cache.name = CACHE_VERSION;");
    if (debug) {
      lines.push("toolbox.options.debug = true;");
    }
    lines.push("var urlsToPrefetch = [");
    getFilesRecursively(srcDir, [ "**/*" ]).forEach(function (file, idx, array) {
      var srcFile = path.join(srcDir, file);
      var stat = fs.lstatSync(srcFile);

      if (!stat.isFile() && !stat.isSymbolicLink())
        return;
      lines.push(createArrayLine("    '"+file+"'", idx, array.length));
    });
    lines.push("];");

    includePaths.forEach(function (file, idx, array) {
      lines.push("urlsToPrefetch.push('"+file+"');");
    });
    lines.push("urlsToPrefetch.forEach(function(url) {");
    lines.push("  toolbox.router.get(url, toolbox.cacheFirst);");
    lines.push("});");
    lines.push("toolbox.precache(urlsToPrefetch);");
    if (dynamicCache.length) {
      dynamicCache.forEach(function(cacheURL, idx, array) {
        lines.push("toolbox.router.any('"+cacheURL+"',toolbox.networkFirst);");
      });
    }
    if (fallback.length) {
      lines.push("var FALLBACK_URLS = [];");
      fallback.forEach(function(fallback, idx, array) {
        var fallbackParts = fallback.split(' ');
        if (fallbackParts.length > 1) {
          var matchLine = "{match: new RegExp('"+escapeRegExp(fallbackParts[0])+"'), fallback:'"+fallbackParts[1]+"'}";
          lines.push("FALLBACK_URLS.push("+matchLine+");");
        }
        lines.push("  toolbox.router.any('"+fallbackParts[0]+"', fallbackResponse);");
      });

      lines.push("FALLBACK_URLS.forEach(function(fallback) {");
      lines.push("  toolbox.router.get(fallback.fallback, toolbox.cacheFirst);");
      lines.push("});");
      lines.push("toolbox.router.default = function(request, values, options) {");
      addDebugLine("'Default request handling for:', request.url", debug, lines);
      lines.push("  return toolbox.networkFirst(request, values, options).then(function(response){");
      lines.push("    var originalResponse = response;");
      addDebugLine("'Default request network got response:', request.url, response", debug, lines);
      lines.push("    if (!response) {");
      lines.push("      return fallbackResponse(request, response, values, options).then(function(response) {");
      addDebugLine("'Fallback response was:', request.url, response", debug, lines);
      lines.push("        return response || originalResponse;");
      lines.push("      });");
      lines.push("    } else {");
      lines.push("      return response;");
      lines.push("    }");
      lines.push("  }).catch(function(error) {");
      addDebugLine("'Default request network failed with error for:', request.url, error", debug, lines);
      lines.push("      return fallbackResponse(request, response, values, options).then(function(response) {");
      addDebugLine("'Fallback response from error was:', request.url, response", debug, lines);
      lines.push("        return response || error;");
      lines.push("      });");
      lines.push("  });");
      lines.push("};");
    } else {
      lines.push("toolbox.router.default = toolbox.networkFirst;");
    }

    if (skipWaiting || debug) {
      lines.push("self.addEventListener('install', function(event) {");
      //ServiceWorker code derived from examples at https://github.com/GoogleChrome/samples/tree/gh-pages/service-worker
      addDebugLine("'Handling install event. Resources to pre-fetch:', urlsToPrefetch", debug, lines);
      if (skipWaiting) {
        lines.push("  if (self.skipWaiting) { self.skipWaiting(); }");
      }
      lines.push("});");
    }
    lines.push("self.addEventListener('activate', function(event) {");
    lines.push("  // Delete all caches handled by broccoli-serviceworker.");
    lines.push("  event.waitUntil(");
    lines.push("    caches.keys().then(function(cacheNames) {");
    lines.push("      return Promise.all(");
    lines.push("        cacheNames.filter(function(cacheName) {");
    lines.push("          return (cacheName.indexOf(CACHE_PREFIX) === 0 && cacheName !== CACHE_VERSION);");
    lines.push("        }).map(function(cacheName) {");
    addDebugLine("'Deleting out of date cache:', cacheName", debug, lines);
    lines.push("            return caches.delete(cacheName);");
    lines.push("        })");
    lines.push("      );");
    lines.push("    })");
    lines.push("  );");
    lines.push("});");
    if (fallback.length) {
      lines.push("function fallbackResponse(request, values, options) {");
      addDebugLine("'Looking for fallback for:', request.url", debug, lines);
      lines.push("  return toolbox.networkFirst(request, values, options).then(function(response){");
      lines.push("    var originalResponse = response;");
      addDebugLine("'Default request network got response:', request.url, response", debug, lines);
      lines.push("    if (!response) {");
      lines.push("      var matchingUrls =FALLBACK_URLS.filter(function(fallbackURL) {");
      addDebugLine("'Checking for fallback match with:', fallbackURL", debug, lines);
      lines.push("        return (request.url.match(fallbackURL.match) !== null);");
      lines.push("      });");
      lines.push("      if (matchingUrls.length) {");
      addDebugLine("'Fetching from fallback url: '+ matchingUrls[0].fallback +'for url: '+request.url", debug, lines);
      lines.push("        var req = new Request(matchingUrls[0].fallback, request);");
      lines.push("        return toolbox.cacheOnly(req, values, options);");
      lines.push("      } else {");
      lines.push("        return response;");
      lines.push("      }");
      lines.push("   } else {");
      lines.push("     return response;");
      lines.push("    }");
      lines.push("  });");
      lines.push("}");
    }
    fs.writeFileSync(path.join(destDir, serviceWorkerFile), lines.join("\n"));
    if (addPolyfill) {
      fs.writeFileSync(path.join(destDir, polyFillLocation), fs.readFileSync(swCachePolyFillFile));
    }
    fs.writeFileSync(path.join(destDir, toolboxLocation), fs.readFileSync(swToolboxFile));
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
