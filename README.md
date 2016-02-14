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
  precacheURLs: ['/mystaticresouce'],
  excludePaths: ['test.*', 'robots.txt',],
  fallback: [
    '/online.html /offline.html'
  ],
  dynamicCache: [
    '/api/todos'
  ],
  includeRegistration: true,
  serviceWorkerFile: "service-worker.js",
  skipWaiting: true,
  swIncludeFiles: [
    'bower_components/pouchdb/dist/pouchdb.js'
  ]
};
```
The following options are available:
* **enabled** - Generate service worker.  Defaults to true in production.
* **debug** - Display debug messages in console.
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
* **dynamicCache** - List of URLs that should use a network first strategy that falls back to a cached version of the response if the network is unavailable.  For more details, see the details on [sw-toolbox's networkFirst strategy](https://github.com/GoogleChrome/sw-toolbox#user-content-toolboxnetworkfirst). Optionally this can be an array of objects in the format `{ route: '/api/todos', options: { origin: 'https://api.example.com' } }`. Options are passed to the [route handler](https://github.com/GoogleChrome/sw-toolbox#methods) and are available for example to specify a different origin domain.
* **skipWaiting** - Allows a simple page refresh to update the app.  Defaults to true.
* **swIncludeFiles** - Array of files to include in the generated service worker.  This is intended to allow inclusion of vendor files in your service worker.  For example, if you wanted to run [PouchDB](http://pouchdb.com/) replication in a service worker, you need to include PouchDB in your service worker.


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
  dynamicCache: [
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
