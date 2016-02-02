if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js', {scope: './'})
    .catch(function(error) {
      console.error('Error registering service worker:'+error);
    });
    navigator.serviceWorker.addEventListener('controllerchange', function() {
      window.location.reload();
    });
} else {
  console.log('service worker not supported');
}
