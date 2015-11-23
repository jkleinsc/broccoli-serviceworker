if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js', {scope: './'})
    .catch(function(error) {
      alert('Error registering service worker:'+error);
    });
} else {
  alert('service worker not supported');
}