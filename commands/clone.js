// var git = require('git-node');
// var fs = require('fs');
// var path = require('path');
// var pathJoin = path.join;
// var mkdirp = require('mkdirp');
// var utils = require('../lib/utils');
// 
// function clone(url, dir, options) {
//   // fix url
//   var origUrl = url;
//   url = utils.fixUrl(url);
//   
//   var remote = git.remote(url);
//   var target = dir || path.basename(remote.pathname, ".git");
//   var clonePath = target;
//   if (!options.mirror) target += '/.git';
//   var repo = git.repo(target);
// 
//   var fetchOpts = {};
//   // if no branch specified, get all heads
//   fetchOpts.want = options.branch || function(ref, cb) {
//     return cb(null, ref && ref.indexOf('refs/heads') != -1);
//   };
//   if (options.verbose) fetchOpts.onProgress = onProgress;
//   if (options.depth) fetchOpts.depth = parseInt(options.depth, 10);
// 
//   if (!fs.existsSync(target)) {
//     mkdirp.sync(target);
//   }
// 
//   if (options.mirror) {
//     console.log("Cloning %s into bare repository %s", url, target);
//   }
//   else {
//     console.log("Cloning %s to %s..", url, target);
//   }
// 
//   repo.fetch(remote, fetchOpts, onFetch);
// 
//   function onProgress(progress) {
//     process.stderr.write(progress);
//   }
// 
//   function onFetch() {
//     if (!options.mirror) {
//       repo.resolveHashish(options.branch || 'HEAD', function (err, hash) {
//         if (err) throw err;
//         repo.updateHead(hash, function (err) {
//           if (err) throw err;
//           // copied from export.js
//           var read;
//           repo.treeWalk('HEAD', function (err, stream) {
//             if (options.verbose) console.log('walking...');
//             if (err) throw err;
//             read = stream.read;
//             return read(function() {
//               read(onEntry);
//             });
//           });
// 
//           function onEntry(err, entry) {
//             if (options.verbose) console.log('on entry...');
//             if (err) throw err;
//             if (!entry) return;
//             var path = pathJoin(clonePath, entry.path);
//             if (options.verbose) {
//               var colorPath = "\x1B[34m" + path.replace(/\//g, "\x1B[1;34m/\x1B[0;34m") + "\x1B[0m";
//               console.log("%s %s", entry.hash, colorPath);
//             }
//             if (entry.type === "tree") {
//               return fs.mkdir(path, onDone);
//             }
//             if (entry.type === "blob") {
//               return fs.writeFile(path, entry.body, onDone);
//             }
//             return read(onEntry);
//           }
// 
//           function onDone(err) {
//             if (err) throw err;
//             return read(onEntry);
//           }
//         });
//       });
//     }
// 
//     // create config with remote
//     fs.writeFile(target + '/config', '[remote "origin"]\r\n\turl = ' + origUrl, function(err) {
//       if (err) throw err;
//       if (options.verbose) {
//         console.log('Created repo config');
//         console.log("Done.");
//       }
//     });
//   }
// }

var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var jsgit = require('../lib/js-git-api');

module.exports = function clone(repoUrl, dir, options) {
  var remote = jsgit.remote(repoUrl);
  var targetPath = dir || path.basename(remote.url.pathname, ".git");
  
  if (!options.mirror){
    targetPath += '/.git';
  }
  if (!fs.existsSync(targetPath)) {
    mkdirp.sync(targetPath);
  }
  
  var repo = {};
  // var gitNodePlatform = require('git-node-platform');
  // var gitFsDb = require('git-fs-db')(gitNodePlatform);
  // var db = gitFsDb(gitNodePlatform.fs(targetPath));
  // db.init();
  require('js-git/mixins/fs-db')(repo, {/* TODO: fs implementation */});
  require('js-git/mixins/read-combiner')(repo);
  require('js-git/mixins/pack-ops')(repo);
  require('js-git/mixins/walkers')(repo);
  require('js-git/mixins/formats')(repo);
  repo.rootPath = targetPath;

  // var fetchOpts = {};
  // 
  // if (options.verbose) {
  //   fetchOpts.onProgress = function(progress) {
  //     process.stderr.write(progress);
  //   };
  // }

  if (options.mirror) {
    console.log("Cloning %s into bare repository %s", repoUrl, targetPath);
  } else {
    console.log("Cloning %s to %s..", repoUrl, targetPath);
  }
  
  remote.take(function(err, refs) {
    if (err) throw err;
    var refSelector;
    
    if (options.branch) {
      refSelector = function branch(ref) {
        return ref.endsWith('/' + options.branch); 
      };
    } else {
      refSelector = function master(ref) {
        return ref == 'refs/heads/master';
      }
    }
    
    var want = Object.keys(refs).filter(refSelector)[0];
    remote.put({ want: refs[want] });
    
    if (options.depth) {
      remote.put({ deepen: parseInt(options.depth, 10) });
    }
    
    remote.put(null);
    remote.close();
    
    remote.take(function(err, channels) {
      if (err) throw err;
      repo.unpack(channels.pack, {}, function(err, report) {
        if (err) throw err;
        repo.updateRef(want, refs[want], function(err) {
          if (err) throw err;
          console.log('OK!');
        })
      });
    });
  });
}