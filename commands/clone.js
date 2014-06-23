var git = require('git-node');
var fs = require('fs');
var path = require('path');
var pathJoin = path.join;
var mkdirp = require('mkdirp');
var utils = require('../lib/utils');

function clone(url, dir, options) {
  // fix url
  var origUrl = url;
  url = utils.fixUrl(url);
  
  var remote = git.remote(url);
  var target = dir || path.basename(remote.pathname, ".git");
  var clonePath = target;
  if (!options.mirror) target += '/.git';
  var repo = git.repo(target);

  var fetchOpts = {};
  // if no branch specified, get all heads
  fetchOpts.want = options.branch || function(ref, cb) {
    return cb(null, ref && ref.indexOf('refs/heads') != -1);
  };
  if (options.verbose) fetchOpts.onProgress = onProgress;
  if (options.depth) fetchOpts.depth = parseInt(options.depth, 10);

  if (!fs.existsSync(target)) {
    mkdirp.sync(target);
  }

  if (options.mirror) {
    console.log("Cloning %s into bare repository %s", url, target);
  }
  else {
    console.log("Cloning %s to %s..", url, target);
  }

  repo.fetch(remote, fetchOpts, onFetch);

  function onProgress(progress) {
    process.stderr.write(progress);
  }

  function onFetch() {
    if (!options.mirror) {
      repo.resolveHashish(options.branch || 'HEAD', function (err, hash) {
        if (err) throw err;
        repo.updateHead(hash, function (err) {
          if (err) throw err;
          // copied from export.js
          var read;
          repo.treeWalk('HEAD', function (err, stream) {
            if (options.verbose) console.log('walking...');
            if (err) throw err;
            read = stream.read;
            return read(function() {
              read(onEntry);
            });
          });

          function onEntry(err, entry) {
            if (options.verbose) console.log('on entry...');
            if (err) throw err;
            if (!entry) return;
            var path = pathJoin(clonePath, entry.path);
            if (options.verbose) {
              var colorPath = "\x1B[34m" + path.replace(/\//g, "\x1B[1;34m/\x1B[0;34m") + "\x1B[0m";
              console.log("%s %s", entry.hash, colorPath);
            }
            if (entry.type === "tree") {
              return fs.mkdir(path, onDone);
            }
            if (entry.type === "blob") {
              return fs.writeFile(path, entry.body, onDone);
            }
            return read(onEntry);
          }

          function onDone(err) {
            if (err) throw err;
            return read(onEntry);
          }
        });
      });
    }

    // create config with remote
    fs.writeFile(target + '/config', '[remote "origin"]\r\n\turl = ' + origUrl, function(err) {
      if (err) throw err;
      if (options.verbose) {
        console.log('Created repo config');
        console.log("Done.");
      }
    });
  }
}

module.exports = clone;