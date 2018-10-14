/* jshint node: true */
'use strict';

var Config = require('./lib/config');
var mergeTrees = require('broccoli-merge-trees');

module.exports = {
  name: 'ember-service-worker-request-deferrer',

  included: function(app) {
    this._super.included && this._super.included.apply(this, arguments);
    this.app = app;
    this.app.options = this.app.options || {};
    this.app.options['esw-request-deferrer'] = this.app.options['esw-request-deferrer'] || {};
  },

  treeForServiceWorker(swTree, appTree) {
    var options = this.app.options['esw-request-deferrer'];
    var configFile = new Config([appTree], options);

    return mergeTrees([swTree, configFile]);
  }
};
