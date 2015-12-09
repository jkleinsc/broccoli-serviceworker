var fs = require("fs");
var path = require('path');
var brocWriter = require("broccoli-writer");
var helpers = require("broccoli-kitchen-sink-helpers");
var funnel = require('broccoli-funnel');
var swToolboxFile = require.resolve('sw-toolbox/sw-toolbox.js');
var swToolboxMapFile = require.resolve('sw-toolbox/sw-toolbox.map.json');
var toolboxLocation = 'sw-toolbox.js';

var BroccoliServiceWorker = function BroccoliServiceWorker(inTree, options) {
  if (!(this instanceof BroccoliServiceWorker)) {
    return new BroccoliServiceWorker(inTree, options);
  }
  this.inTree = inTree;
  options = options || {};
  if (options.skipWaiting === false) {
    this.skipWaiting = false;
  } else {
    this.skipWaiting = true;
  }
  this.debug = options.debug || false;
  this.dynamicCache = options.dynamicCache || [];
  this.excludePaths = options.excludePaths || ['tests/*'];
  this.fallback = options.fallback || [];
  this.precacheURLs = options.precacheURLs || [];
  if (options.includeRegistration === false) {
    this.includeRegistration = false;
  } else {
    this.includeRegistration = true;
  }
  if (this.includeRegistration === true || !options.serviceWorkerFile) {
    this.serviceWorkerFile = "service-worker.js";
  } else {
    this.serviceWorkerFile = options.serviceWorkerFile;
  }
};

BroccoliServiceWorker.prototype = Object.create(brocWriter.prototype);
BroccoliServiceWorker.prototype.constructor = BroccoliServiceWorker;

BroccoliServiceWorker.prototype.write = function(readTree, destDir) {
  var skipWaiting = this.skipWaiting;
  var debug = this.debug;
  var dynamicCache = this.dynamicCache;
  var fallback = this.fallback;
  var precacheURLs = this.precacheURLs;
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
    lines.push("    '/',");
    getFilesRecursively(srcDir, [ "**/*" ]).forEach(function (file, idx, array) {
      var srcFile = path.join(srcDir, file);
      var stat = fs.lstatSync(srcFile);

      if (!stat.isFile() && !stat.isSymbolicLink())
        return;
      lines.push(createArrayLine('    '+JSON.stringify(file), idx, array.length));
    });
    lines.push("];");
    precacheURLs.forEach(function (file, idx, array) {
      lines.push("urlsToPrefetch.push('"+file+"');");
    });
    lines.push("urlsToPrefetch.forEach(function(url) {");
    lines.push("  toolbox.router.any(url, toolbox.cacheFirst);");
    lines.push("});");
    lines.push("toolbox.precache(urlsToPrefetch);");
    if (dynamicCache.length) {
      dynamicCache.forEach(function(cacheURL, idx, array) {
        lines.push("toolbox.router.any('"+cacheURL+"',toolbox.networkFirst);");
      });
    }
    if (fallback.length) {
      fallback.forEach(function(fallback, idx, array) {
        var fallbackParts = fallback.split(' ');
        if (fallbackParts.length > 1) {
          var fallbackOptions = "{fallbackURL:'"+fallbackParts[1]+"'}";
          lines.push("toolbox.router.any('"+fallbackParts[0]+"',fallbackResponse, "+fallbackOptions+");");
        }
      });
    }
    if (skipWaiting || debug) {
      lines.push("self.addEventListener('install', function(event) {");
       addDebugLine("'Handling install event. Resources to pre-fetch:', urlsToPrefetch", debug, lines);
      if (skipWaiting) {
        lines.push("  if (self.skipWaiting) { self.skipWaiting(); }");
      }
      lines.push("});");
    }
    lines.push(getFileContents('delete-old-caches.js'));
    if (fallback.length) {
      lines.push(getFileContents('fallback-response.js'));
    }

    lines.push(getFileContents('log-debug.js'));
    fs.writeFileSync(path.join(destDir, serviceWorkerFile), lines.join("\n"));
    fs.writeFileSync(path.join(destDir, toolboxLocation), fs.readFileSync(swToolboxFile));
    if (debug) {
      fs.writeFileSync(path.join(destDir, 'sw-toolbox.map.json'), fs.readFileSync(swToolboxMapFile));
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

function getFileContents(fileName) {
  var filePath = [ __dirname, fileName].join('/');
  return fs.readFileSync(filePath);
}

module.exports = BroccoliServiceWorker;
