# Install

    npm install buildapi
# Example
    var buildapi = require('./index')({username: 'me', password: 'supersecret'});
    buildapi.rebuildBuildId('gaia-try', {'build_id': '45705150'}, function(e, d) {
      if (e) {
        console.log(e);
      }
      console.log(d);
    }
# API Reference
For complete information see [the real docs](https://secure.pub.build.mozilla.org/buildapi/self-serve)

All functions can take an options argument, some functions have required options and all require a callback.
Call backs are in the form `function(err, data)`

For query (i.e. GET) functions, the raw response body is passed back an `Object`.  For all other
functions, the build api status response is checked.  If there is an API Error
, an `Error` object is created with a plaintext explanation
On success the `request_id` is passed back

* `buildapi#listBranches(callback)`

  Does a GET to `/self-serve/branches`
* `buildapi#listJobs(callback)`

  Does a GET to `/self-serve/jobs`
* `buildapi#getJob(job_id, callback)`

  Does a GET to `/self-serve/jobs/:job_id`
* `buildapi#getBranch(branch_id, callback)`

  Does a GET to `/self-serve/:branch_id`
* `buildapi#rebuildBuildId(branch_id, opts, callback)`

  Does a POST to `/self-serve/:branch_id/build`

  Required options
  * `build_id`

  Optional options
  * `priority`
  * `count`
* `buildapi#cancelBuild(branch_id, build_id, callback)`

  Does a DELETE to `/self-serve/:branch_id/build/:build_id`
* `buildapi#getBuild(branch_id, build_id, callback)`

  Does a GET to `/self-serve/:branch_id/build/:build_id`
* `buildapi#getBuilders(branch_id, callback)`

  Does a GET to `/self-serve/:branch_id/builders`
* `buildapi#triggerBuildername(branch_id, builder_name, revision, callback)`

  Does a POST to `/self-serve/:branch_id/builders/:builder_name/:revision`

  Optional options
  * `properties`
  * `files`
* `buildapi#rebuildRequest(branch_id, callback)`

  Does a POST to `/self-serve/:branch_id/request`

  Optional options
  * `priority`
  * `count`
* `buildapi#cancelRequest(branch_id, request_id, callback)`

  Does a DELETE to `/self-serve/:branch_id/request/:request_id`
* `buildapi#getRequest(branch_id, callback)`

  Does a GET to `/self-serve/:branch_id`
* `buildapi#reprioritizeRequest(branch_id, request_id, opts, callback)`

  Does a PUT to `/self-serve/:branch_id/request/:request_id`

  Required options
  * `priority`
* `buildapi#cancelRev(branch_id, revision, callback)`

  Does a DELETE to `/self-serve/:branch_id/rev/:revision`
* `buildapi#getRev(branch_id, revision, callback)`

  Does a GET to `/self-serve/:branch_id/rev/:revision`
* `buildapi#triggerRev(branch_id, revision, callback)`

  Does a POST to `/self-serve/:branch_id/rev/:revision`
* `buildapi#isDone(branch_id, revision, callback)`

  Does a GET to `/self-serve/:branch_id/rev/:revision/is_done`
* `buildapi#triggerRevNightly(branch_id, revision, callback)`

  Does a POST to `/self-serve/:branch_id/rev/:revision/nightly`

  Optional options
  * `priority`
* `buildapi#triggerRevPgo(branch_id, revision, callback)`

  Does a POST to `/self-serve/:branch_id/rev/:revision/pgo`

  Optional options
  * `priority`
* `buildapi#getBuildsForUser(branch_id, user, callback)`

  Does a GET to `/self-serve/:branch_id/user/:user`

Docs build with node -e "require('./index').docs()"