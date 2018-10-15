/* jshint node: true */
'use strict';

const Config = require('./lib/config');
const MergeTrees = require('broccoli-merge-trees');
const Funnel = require('broccoli-funnel');

module.exports = {
  name: 'ember-service-worker-request-deferrer',

  included: function(app) {
    this._super.included && this._super.included.apply(this, arguments);
    this.app = app;
    this.app.options = this.app.options || {};
    this.import('vendor/localforage.js');
    this.app.options['esw-request-deferrer'] = this.app.options['esw-request-deferrer'] || {};
  },

  treeForVendor(vendorTree) {
    console.log(this.project.root)
    let localForage = new Funnel(`${this.project.root}/node_modules/localforage/dist`, {
      files: ['localforage.js'],
    });
    if(vendorTree){
      //if tree is for app this is not null
      return new MergeTrees([vendorTree, localForage]);
    } else {
      //if is an addon this is null
      return localForage;
    }
  },

  treeForServiceWorker(swTree, appTree) {
    var options = this.app.options['esw-request-deferrer'];
    var configFile = new Config([appTree], options);
    let localForage = new Funnel(`${this.project.root}/node_modules/localforage/dist`, {
      files: ['localforage.js'],
    });
    return MergeTrees([swTree, configFile, localForage]);
  }
};
