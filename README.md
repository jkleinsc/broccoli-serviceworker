broccoli-serviceworker
=================

ServiceWorker generator for Broccoli and Ember.js.  Derived from [broccoli-manifest](https://github.com/racido/broccoli-manifest).

For more details on ServiceWorker check out the following:
* [ServiceWorker spec](https://slightlyoff.github.io/ServiceWorker/spec/service_worker/)
* [ServiceWorker GitHub repo](https://github.com/slightlyoff/ServiceWorker)
* [Is ServiceWorker ready?](https://jakearchibald.github.io/isserviceworkerready/)

Usage for Ember Cli
-------------------

`ember install broccoli-serviceworker`

###Configuration
By default the service worker will be generated for production builds and the service worker registration logic will be added to your index.html automatically.  If you wish to add your own logic to the generated service worker, you can place that code in .js files in ***app/serviceworkers***.  Your code will have full access to [Service Worker Toolbox](https://github.com/GoogleChrome/sw-toolbox) as well as any included tools that you specify with the **swIncludeFiles** option.  Additionally, you can further customize broccoli-serviceworker by setting configurations in your environment.js file:
```JavaScript
//app/config/environment.js

ENV.serviceWorker = {
  enabled: true,
  debug: true,
  sourcemaps: true,
  precacheURLs: ['/mystaticresource'],
  excludePaths: ['test.*', 'robots.txt',],
  fallback: [
    '/online.html /offline.html'
  ],
  networkFirstURLs: [
    '/api/todos'
  ],
  includeRegistration: true,
  serviceWorkerFile: "service-worker.js",
  skipWaiting: true,
  swIncludeFiles: [
    'bower_components/pouchdb/dist/pouchdb.js'
  ],
  swEnvironment: {
    foo: ENV.foo,
  }
};
```
The following options are available:
* **enabled** - Generate service worker.  Defaults to true in production.
* **debug** - Display debug messages in console.
* **sourcemaps** - Boolean that defines if sourcemaps should be generated. Defaults to the same value of debug.
* **precacheURLs** - Array of URLs to precache and always serve from the cache.  broccoli-serviceworker will automatically add all Ember app resources (e.g. files in dist) as precached URLs unless explictly excluded in excludePaths.
* **excludePaths** - Array of paths to exclude from precache.  Files can be filtered using regular expressions.
```JavaScript
{
  excludePaths: ['index.html', new RegExp(/.\.map$/)],
}
```
* **includeRegistration** -- Automatically add the service worker registration script using contentFor to place the script in body-footer.  Defaults to true.
* **serviceWorkerFile** - Name of the service worker file to generate.  If **includeRegistration** is set to true, this setting is unused.  Defaults to *service-worker.js*.
* **fallback** - Array of URLs with fallbacks when the resource isn't available via network or cache.
* **skipWaiting** - Allows a simple page refresh to update the app.  Defaults to true.
* **swIncludeFiles** - Array of files to include in the generated service worker.  This is intended to allow inclusion of vendor files in your service worker.  For example, if you wanted to run [PouchDB](http://pouchdb.com/) replication in a service worker, you need to include PouchDB in your service worker.
* **swEnvironment** - object that will be injected as-is in the service worker script as a top-level `swEnvironment` variable.

####Routing Options
The following options allow you to specify routes that use [sw-toolbox's built-in handlers](https://github.com/GoogleChrome/sw-toolbox#built-in-handlers).  Each of these options accepts an array of URLs that can be strings or [regular expressions](https://github.com/GoogleChrome/sw-toolbox#regular-expression-routes).
* **cacheFirstURLs** -- List of URLS that should pull from cache first and then fallback to network if it isn't in cache.  For more details, see the details on [sw-toolbox's cacheFirst strategy](https://github.com/GoogleChrome/sw-toolbox#toolboxcachefirst).
* **cacheOnlyURLs** - List of URLs that should resolve the request from the cache, or fail.  For more details, see the details on [sw-toolbox's cacheOnly strategy](https://github.com/GoogleChrome/sw-toolbox#toolboxcacheonly).
* **fastestURLs** -- List of URLS that should pull from network and cache and deliver the fastest response.  For more details, see the details on [sw-toolbox's fastest strategy](https://github.com/GoogleChrome/sw-toolbox#toolboxfastest).
* **networkFirstURLs** - List of URLs that should use a network first strategy that falls back to a cached version of the response if the network is unavailable.  For more details, see the details on [sw-toolbox's networkFirst strategy](https://github.com/GoogleChrome/sw-toolbox#user-content-toolboxnetworkfirst).
* If additional configuration is desired for the above routing options, instead of using URLs, you can pass a configuration object:
  Optionally they can be an array of objects in the format:
  ```javascript
  {
    route: '/api/todos',
    method: 'any',
    options: {
      origin: 'https://api.example.com'
    }
  }
  ```
  * **route** - the url or regular expression for the route.
  * **method** - the HTTP method for the route.  Defaults to **any** which matches all HTTP methods.
  * **options** - passed to the [route handler](https://github.com/GoogleChrome/sw-toolbox#methods) and are available for example to specify a different origin domain (can use regular expression).

####Hooks
The following hooks are available to your service worker code. Implement a hook by defining a `function` by the hook's name and it will be called.

* `brocswPostDeleteCacheHook(cacheName)` -- When a new version of the service worker is loaded, old caches are automatically deleted. This hook is called for each stale cache right after it has been deleted. This hook must return a `Promise`.

Usage for Broccoli.js
---------------------

`npm install --save broccoli-serviceworker`

Use `broccoli-serviceworker` as your last filter in the `Brocfile.js` like this

```JavaScript
var writeServiceWorker = require('broccoli-serviceworker');

...

var completeTree = mergeTrees([appJs, appCss, publicFiles]);

module.exports = mergeTrees([completeTree, writeServiceWorker((completeTree)]);
```
Upgrade your `index.html` (see below) and you are done.

Options
-------

You can the [options specified above](#configuration) as the second argument to `writeServiceWorker`:

```JavaScript

writeServiceWorker(completeTree, {
  serviceWorkerFile: "service-worker.js",
  excludePaths: ['test.*', 'online.html',],
  precacheURLs: ['/api/offlineStates'],
  fallback: [
    '/api/states /api/offlineStates'
  ],
  networkFirstURLs: [
    '/api/todos'
  ],
  skipWaiting: true
});
```
One additional option is available for usage with Broccoli.js:
* **swIncludeTree** - Broccoli tree of files to include in the generated service worker.

Upgrade your index.html
-----------------------

In order to use the generated serviceworker, you will need to register the serviceworker. This is done automatically if using as an Ember.js addon.
If you're not using Ember.js, you can use the following code:
```HTML
<!DOCTYPE html>
<html>
  ...
  <script>
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./service-worker.js', {scope: './'})
          .catch(function(error) {
              alert('Error registering service worker:'+error);
          });
    } else {
        alert('service worker not supported');
    }
  </script>
</html>
```
