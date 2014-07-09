'use strict';

var url = require('url');
var reqlib = require('request');
var debug = require('debug')('node-buildapi:index');

var apiOps = [
  // Basic methods
  {name: 'branches', path: ['branches'], method: 'GET'},
  {name: 'jobs', path: ['jobs'], method: 'GET'},

  // Basic methods with params
  {name: 'getBranch', path: [':branch_id'], method: 'GET'},
  {name: 'getBuildInfo', path: [':branch_id', 'build', ':build_id'], method: 'GET'},
  {name: 'getBuilders', path: [':branch_id', 'builders'], method: 'GET'},
  {name: 'getRequestInfo', path: [':branch_id'], method: 'GET'},
  {name: 'getRevInfo', path: [':branch_id', 'rev', ':revision'], method: 'GET'},
  {name: 'isDone', path: [':branch_id', 'rev', ':revision', 'is_done'], method: 'GET'},
  {name: 'getBuildsForUser', path: [':branch_id', 'user', ':user'], method: 'GET'},
  {name: 'cancelBuild', path: [':branch_id', 'build', ':build_id'], method: 'DELETE'},
  {name: 'cancelRequest', path: [':branch_id', 'request', ':request_id'], method: 'DELETE'},
  {name: 'cancelRevision', path: [':branch_id', 'rev', ':revision'], method: 'DELETE'},


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

    // Define each API method
    this[apiOp.name] = function() {
      var args = Array.prototype.slice.call(arguments);
      var callback = args[args.length - 1];
      var params = args.slice(0, args.length - 1);
      var pathChunks = [];
      var paramIdx = 0;
      var numUsedParams = 0;

      // Insert js arguments into path list
      apiOp.path.forEach(function(e, idx, arr) {
        if (e.charAt(0) === ':') {
          pathChunks.push(args[paramIdx++]);
        } else {
          pathChunks.push(e)
        }
      }, this);

      // Verify that we got the right number of function params
      // for the given endpoint
      if (paramIdx !== params.length) {
        return callback(new Error('Incorrent number of arguments'));
      }

      // Splice in API endpoint
      var urlBits = url.parse(this.baseUri);
      urlBits.pathname += '/' + pathChunks.join('/');
      var uri = url.format(urlBits);

      // Build the options for request
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

      // Perform request
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
