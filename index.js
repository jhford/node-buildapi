'use strict';

var url = require('url');
var reqlib = require('request');
var debug = require('debug')('node-buildapi:index');

var apiOps = [
  {name: 'listBranches', path: ['branches'], method: 'GET'},
  {name: 'listJobs', path: ['jobs'], method: 'GET'},
  {name: 'getJob', path: ['jobs', ':job_id'], method: 'get'},
  {name: 'getBranch', path: [':branch_id'], method: 'GET'},

  // Required: build_id, Optional: priority(int), count(int)
  // UNIMP: POST	/self-serve/{branch}/build Requires: build_id, Optional: priority(int), count(int)

  {name: 'cancelBuild', path: [':branch_id', 'build', ':build_id'], method: 'DELETE'},
  {name: 'getBuild', path: [':branch_id', 'build', ':build_id'], method: 'GET'},
  {name: 'getBuilders', path: [':branch_id', 'builders'], method: 'GET'},

  // Optional: properties(dict), files(list)
  {name: 'triggerBuildername', path: [':branch_id', 'builders', ':builder_name', ':revision'], method: 'POST'},

  // Required: request_id, Optional: priority (int), count(int, default 1)
  // UNIMP: POST	/self-serve/{branch}/request

  {name: 'cancelRequest', path: [':branch_id', 'request', ':request_id'], method: 'DELETE'},
  {name: 'getRequest', path: [':branch_id'], method: 'GET'},


  // Required: priority (int), Optional count(int, default 1)
  // UNIMP: PUT	/self-serve/{branch}/request/{request_id}

  {name: 'cancelRev', path: [':branch_id', 'rev', ':revision'], method: 'DELETE'},
  {name: 'getRev', path: [':branch_id', 'rev', ':revision'], method: 'GET'},
  {name: 'triggerRev', path: [':branch_id', 'rev', ':revision'], method: 'POST'},
  {name: 'isDone', path: [':branch_id', 'rev', ':revision', 'is_done'], method: 'GET'},
 
  // Nightly & PGO Optional: priority (int)
  {name: 'triggerRevNightly', path: [':branch_id', 'rev', ':revision', 'nightly'], method: 'POST'},
  {name: 'triggerRevPgo', path: [':branch_id', 'rev', ':revision', 'pgo'], method: 'POST'},

  {name: 'getBuildsForUser', path: [':branch_id', 'user', ':user'], method: 'GET'},
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
      var bodyParams = {};
      var callback = args[args.length - 1];
      var params = args.slice(0, args.length - 1);

      // Support sending params as urlencoded body
      if (args.length > 1) {
        if (typeof args[args.length - 2] === 'object') {
          bodyParams = args[args.length - 2];  
          params = args.slice(0, args.length - 2);
        }
      }

      var pathChunks = [];
      var paramIdx = 0;

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
        },
        form: bodyParams
      };
      debug('Requesting URI: %s', reqOpts.uri);
      debug('Auth with %s:%s', reqOpts.auth.user, reqOpts.auth.pass);

      // Perform request
      reqlib(reqOpts, function (err, response, body) {
        if (err) {
          return callback(err);
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
