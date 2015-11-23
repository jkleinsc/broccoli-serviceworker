var path = require('path');
var fs   = require('fs');
var mergeTrees = require('broccoli-merge-trees');
var funnel = require('broccoli-funnel');

var serviceWorker = require('./service-worker.js');

module.exports = {
  name: 'broccoli-serviceworker',

  included: function (app) {
    this.app = app;
    this.initializeOptions();
  },

  initializeOptions: function () {
    var appOptions = this.app.project.config(this.app.env);
    var options = appOptions.serviceWorker || {};

    var defaultOptions = {
      enabled: this.app.env === 'production',
      excludePaths: ['test.*'],
      includePaths: ['/'],
    };

    for (var option in defaultOptions) {
      if (!options.hasOwnProperty(option)) {
        options[option] = defaultOptions[option];
      }
    }
    this.serviceWorkerOptions = options;
  },

  postprocessTree: function (type, tree) {
    var options = this.serviceWorkerOptions;

    if (type === 'all' && options.enabled) {
      var serviceWorkerTree = funnel(tree, {
        exclude: options.excludePaths
      });
      return mergeTrees([tree, serviceWorker(serviceWorkerTree, options)]);
    }

    return tree;
  },

  treeFor: function() {},

  contentFor: function(type, config) {
    if (config.environment !== 'test' && type === 'body-footer') {
      var lines = [];
      lines.push('<script>');
      lines.push('if (\'serviceWorker\' in navigator) {');
      lines.push('  navigator.serviceWorker.register(\'./service-worker.js\', {scope: \'./\'})');
      lines.push('    .catch(function(error) {');
      lines.push('      alert(\'Error registering service worker:\'+error);');
      lines.push('    });');
      lines.push('} else {');
      lines.push('  alert(\'service worker not supported\');');
      lines.push('}');
      lines.push('</script>');
      return lines.join('\n');
    }
  }
};
