'use strict';

var url = require('url');
var reqlib = require('request');
var debug = require('debug')('node-buildapi:index');

var apiOps = [
  {name: 'branches', path: ['branches'], method: 'GET'}
]

function BuildAPI(opts) {
  if (!opts) {
    opts = {};
  }
  this.username = opts.username;
  this.password = opts.password;

  var uriBits = {
    protocol: opts.protocol || 'https:',
    host: opts.host || 'secure.pub.build.mozilla.org',
    pathname: opts.rootPath || 'buildapi/self-serve',
    query: {format: 'json'}
  };

  this.baseUri = url.format(uriBits);
  debug('Base URI is %s', this.baseUri);

  apiOps.forEach(function(apiOp) {
    debug('Creating %s method for %s', apiOp.method, apiOp.name);

    var urlBits = url.parse(this.baseUri);
    urlBits.pathname += '/' + apiOp.path.join('/');
    var uri = url.format(urlBits);

    this[apiOp.name] = function(callback) {
      var reqOpts = {
        method: apiOp.method,
        auth: {
          user: this.username,
          pass: this.password,
          sendImmediately: true
        },
        uri: uri,
        headers: {
          'User-agent': 'node-buildapi'
        }
      };
      debug('Requesting URI: %s', reqOpts.uri);
      debug('Auth with %s:%s', reqOpts.auth.user, reqOpts.auth.pass);
      reqlib(reqOpts, function (err, response, body) {
        if (err) {
          return callback(err, response, body);
        }
        try {
          return callback(null, JSON.parse(body));
        } catch (e) {
          debug('Failed to parse JSON response body');
          return callback(e);
        }
      });
    }.bind(this);
  }, this);
}

module.exports = BuildAPI;
