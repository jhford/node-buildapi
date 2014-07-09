'use strict';

var url = require('url');
var reqlib = require('request');
var debug = require('debug')('node-buildapi:index');

var apiOps = [
  {name: 'listBranches', path: ['branches'], method: 'GET'},
  {name: 'listJobs', path: ['jobs'], method: 'GET'},
  {name: 'getJob', path: ['jobs', ':job_id'], method: 'GET'},
  {name: 'getBranch', path: [':branch_id'], method: 'GET'},
  {name: 'rebuildBuildId', path: [':branch_id', 'build'], method: 'POST', required: ['build_id'], optional: ['priority', 'count']},
  {name: 'cancelBuild', path: [':branch_id', 'build', ':build_id'], method: 'DELETE'},
  {name: 'getBuild', path: [':branch_id', 'build', ':build_id'], method: 'GET'},
  {name: 'getBuilders', path: [':branch_id', 'builders'], method: 'GET'},
  {name: 'triggerBuildername', path: [':branch_id', 'builders', ':builder_name', ':revision'], method: 'POST', optional: ['properties', 'files']},
  {name: 'rebuildRequest', path: [':branch_id', 'request'], method: 'POST', require: ['request_id'], optional: ['priority', 'count']},
  {name: 'cancelRequest', path: [':branch_id', 'request', ':request_id'], method: 'DELETE'},
  {name: 'getRequest', path: [':branch_id'], method: 'GET'},
  {name: 'reprioritizeRequest', path: [':branch_id', 'request', ':request_id'], method: 'PUT', required: ['priority']},
  {name: 'cancelRev', path: [':branch_id', 'rev', ':revision'], method: 'DELETE'},
  {name: 'getRev', path: [':branch_id', 'rev', ':revision'], method: 'GET'},
  {name: 'triggerRev', path: [':branch_id', 'rev', ':revision'], method: 'POST'},
  {name: 'isDone', path: [':branch_id', 'rev', ':revision', 'is_done'], method: 'GET'},
  {name: 'triggerRevNightly', path: [':branch_id', 'rev', ':revision', 'nightly'], method: 'POST', optional: ['priority']},
  {name: 'triggerRevPgo', path: [':branch_id', 'rev', ':revision', 'pgo'], method: 'POST', optional: ['priority']},
  {name: 'getBuildsForUser', path: [':branch_id', 'user', ':user'], method: 'GET'},
]

function writeDocs() {
  var fs = require('fs');
  var util = require('util');
  var lines = [];
  lines.push('# API Reference');
  lines.push('For complete information see [the real docs](https://secure.pub.build.mozilla.org/buildapi/self-serve)');
  lines.push('');
  lines.push('All functions can take an options argument, some functions have required options and all require a callback.');
  lines.push('Call backs are in the form `function(err, data)`');

  lines.push('');
  lines.push('For query (i.e. GET) functions, the raw response body is passed back an `Object`.  For all other');
  lines.push('functions, the build api status response is checked.  If there is an API Error');
  lines.push(', an `Error` object is created with a plaintext explanation');
  lines.push('On success the `request_id` is passed back');
  lines.push('');
  apiOps.forEach(function(e) {
    var args = [];
    e.path.forEach(function(p) {
      if (p.charAt(0) === ':' ) {
        args.push(p.slice(1));
      }
    });
    var cbstuff = args.length > 0 ? ', callback' : 'callback';
    var bpstuff = e.required ? ', opts' : '';
    var requiredLines = [];
    lines.push(util.format('* `buildapi#%s(%s%s%s)`', e.name, args.join(', '), bpstuff, cbstuff));
    lines.push(util.format('\n  Does a %s to `/self-serve/%s`', e.method, e.path.join('/')));
    if (e.required) {
      lines.push('\n  Required options');
      e.required.forEach(function (f) {
        lines.push(util.format('  * `%s`', f));
      });
    }
    if (e.optional) {
      lines.push('\n  Optional options');
      e.optional.forEach(function (f) {
        lines.push(util.format('  * `%s`', f));
      });
    }

  });
  lines.push('');
  fs.writeFileSync('API.md', lines.join('\n'));
}

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
    debug('Creating function %s method for %sing to %s', apiOp.name, apiOp.method, apiOp.path.join('/'));

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
        return callback(new Error('Incorrect number of arguments'));
      }

      var hasRequired = true;
      // Ensure that all required body params are present
      if (apiOp.required) {
        console.log('ohai');
        apiOp.required.forEach(function (e) {
          if (!bodyParams[e]) {
            hasRequired = false;
          }
        });
      }

      if (!hasRequired) {
        return callback(new Error('Missing required body parameter'));
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
      debug('%sing %s', apiOp.method, reqOpts.uri);

      // Perform request
      reqlib(reqOpts, function (err, response, body) {
        if (err) {
          return callback(err);
        }
        try {
          var returnData = JSON.parse(body);
        } catch (e) {
          debug('Failed to parse JSON response body');
          return callback(e);
        }

        if (apiOp.method !== 'GET') {
          if (returnData.status === 'OK') {
            return callback(null, returnData.request_id, returnData.msg); 
          } else {
            return callback(new Error(returnData.msg));
          }
        } else {
          return callback(returnData);
        }
        
      });
    }.bind(this);
  }, this);
}

function makeApiObj(opts) {
  return new BuildAPI(opts);
}

makeApiObj.docs = writeDocs;

module.exports = makeApiObj;
