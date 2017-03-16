var path = require('path');
var fs   = require('fs');
var mergeTrees = require('broccoli-merge-trees');
var funnel = require('broccoli-funnel');
var stringifile = require('stringifile');

var serviceWorker = require('./service-worker.js');

function ServiceWorkerIncludes() {
  this.name = 'broccoli-service-worker-includes';
}

ServiceWorkerIncludes.prototype.toTree = function(tree, inputPath, outputPath, inputOptions) {
  var serviceWorkersDir = outputPath+'/serviceworkers';
  if (inputPath === '/') {
    this.swIncludeTree = tree;
    this.swIncludeTree = funnel(tree, {
      srcDir:  serviceWorkersDir,
      allowEmpty: true
    });
  }
  return funnel(tree, {
    exclude: [serviceWorkersDir]
  });
};

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
      excludePaths: ['test.*','robots.txt'],
      precacheURLs: [],
      rootURL: appOptions.rootURL || appOptions.baseURL
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
      if (this.serviceWorkerIncludes.swIncludeTree) {
        options.swIncludeTree = this.serviceWorkerIncludes.swIncludeTree;
      }
      return mergeTrees([tree, serviceWorker(serviceWorkerTree, options)]);
    }

    return tree;
  },

  treeFor: function() {},

  setupPreprocessorRegistry: function(type, registry) {
    this.serviceWorkerIncludes = new ServiceWorkerIncludes();
    registry.add('js', this.serviceWorkerIncludes, 'js');
  },

  contentFor: function(type, config) {
    if((!config.serviceWorker && config.environment === 'production') ||
        (config.serviceWorker && config.serviceWorker.enabled === true)) {
      if (config.environment !== 'test' && (!config.serviceWorker || config.serviceWorker.includeRegistration!== false) && type === 'body-footer') {
        return stringifile('registration.js', 'script', __dirname);
      }
    }
  }
};
