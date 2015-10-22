broccoli-serviceworker
=================

ServiceWorker generator for Broccoli and Ember.js.  Derived from [broccoli-manifest](https://github.com/racido/broccoli-manifest).

For more details on ServiceWorker check out the following:
* [ServiceWorker spec](https://slightlyoff.github.io/ServiceWorker/spec/service_worker/)
* [ServiceWorker GitHub repo](https://github.com/slightlyoff/ServiceWorker)
* [Is ServiceWorker ready?](https://jakearchibald.github.io/isserviceworkerready/)

Usage for Ember Cli
-------------------

`npm install --save-dev broccoli-serviceworker`

```JavaScript
//app/config/environment.js

ENV.serviceWorker = {
  enabled: true,
  serviceWorkerFile: "service-worker.js",
  excludePaths: ['tests/', 'online.html',],
  includePaths: ['/'],
  fallback: [
    '/online.html offline.html'      
  ],
  dynamicCache: [
    '/api/todos'
  ]
};
```

Upgrade your `index.html` (see below) and you are done.
The service worker bootstrap logic will be added to your index.html automatically, using contentFor hooks.

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

Options
-------

You can pass some options as the second argument to `writeServiceWorker`:

```JavaScript

writeServiceWorker(completeTree, {
  serviceWorkerFile: "service-worker.js",
  excludePaths: ['tests/', 'online.html',],
  includePaths: ['/'],
  fallback: [
    '/online.html offline.html'      
  ],
  dynamicCache: [
    '/api/todos'
  ]
});
```

Files can be filtered using regular expressions.
```JavaScript
{
  excludePaths: ['index.html', new RegExp(/.\.map$/)],
  includePaths: ['']
}
```



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
