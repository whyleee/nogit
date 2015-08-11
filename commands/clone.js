var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var jsgit = require('../lib/js-git-api');
var modes = require('js-git/lib/modes');

module.exports = function clone(repoUrl, dir, options) {
  var remote = jsgit.remote(repoUrl);
  var targetPath = dir || path.basename(remote.url.pathname, '.git');
  var clonePath = targetPath;
  
  if (!options.mirror) {
    targetPath += '/.git';
  }
  
  var repo = {};
  var fsDb = require('../lib/js-git-fs-db');
  require('js-git/mixins/fs-db')(repo, fsDb);
  require('js-git/mixins/read-combiner')(repo);
  require('js-git/mixins/pack-ops')(repo);
  require('js-git/mixins/walkers')(repo);
  require('js-git/mixins/formats')(repo);
  repo.rootPath = targetPath;

  if (options.mirror) {
    console.log("Cloning '%s' into bare repository '%s'...", repoUrl, targetPath);
  } else {
    console.log("Cloning '%s' into '%s'...", repoUrl, targetPath);
  }
  
  remote.take(function(err, refs) {
    if (err) throw err;
    
    var want = Object.keys(refs).filter(function(ref) {
      return ref.endsWith('/' + (options.branch || 'heads/master')); 
    })[0];
    remote.put({ want: refs[want] });
    
    if (options.depth) {
      remote.put({ deepen: parseInt(options.depth, 10) });
    }
    
    remote.put(null);
    remote.close();
    
    remote.take(function(err, channels) {
      if (err) throw err;
      
      var packOpts = {
        onError: function(err) {
          throw err;
        },
        onProgress: function(progress) {
          if (options.verbose) {
            console.log(progress);
          }
          // Quick hack for "repo.unpack callback is never called using HTTP transport"
          // issue https://github.com/creationix/js-git/issues/120
          if (remote.transport == 'http') {
            var statsRegex = /\((\d+)\/(\d+)\)/;
            var stats = statsRegex.exec(progress);
            
            if (stats[1] == stats[2] - 1) {
              if (options.verbose) {
                progress = 'Receiving objects: 100% (' + stats[2] + '/' + stats[2] + ')\r\n';
                console.log(progress);
              }
              doFetch();
            }
          }
        }
      };
      
      repo.unpack(channels.pack, packOpts, doFetch);
      
      function doFetch(err, report) {
        if (err) throw err;
        repo.updateRef(want, refs[want], function(err) {
          if (err) throw err;
          
          if (!options.mirror) {
            repo.loadAs('commit', refs[want], function(err, commit) {
              if (err) throw err;
              repo.treeWalk(commit.tree, function(err, treeStream) {
                if (err) throw err;
                treeStream.read(onEntry);
                
                function onEntry(err, entry) {
                  if (err) throw err;
                  if (!entry) return;
                  
                  if (entry.path == '/') {
                    return nextEntry();
                  }
                  
                  var entryPath = path.join(clonePath, entry.path);
                  if (options.verbose) {
                    var colorPath = '\x1B[34m' + entryPath.replace(/\//g, '\x1B[1;34m/\x1B[0;34m') + '\x1B[0m';
                    console.log('%s %s', entry.hash, colorPath);
                  }
  
                  if (entry.mode == modes.tree) {
                    return fs.mkdir(entryPath, nextEntry);
                  }
                  if (entry.mode == modes.blob) {
                    return repo.loadAs('blob', entry.hash, function(err, blob) {
                      return fs.writeFile(entryPath, blob, nextEntry);
                    });
                  }
                  
                  return nextEntry();
                }
                
                function nextEntry(err) {
                  if (err) throw err;
                  return treeStream.read(onEntry);
                }
              });
            });
          }
          
          // create config with remote
          var configPath = path.join(targetPath, 'config');
          fs.writeFile(configPath, '[remote "origin"]\r\n\turl = ' + repoUrl, function(err) {
            if (err) throw err;
          });
        });
      }
    });
  });
}