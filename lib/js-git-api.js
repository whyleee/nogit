var fs = require('fs');
var path = require('path');
var urlParse = require('url').parse;
var format = require('util').format;
var tcp = require('js-git/net/tcp-node');
var tcpTransport = require('js-git/net/transport-tcp')(tcp);
var request = require('../lib/js-git-node-request');
var httpTransport = require('js-git/net/transport-http')(request);
var fetchPackProtocol = require('js-git/net/git-fetch-pack');
var modes = require('js-git/lib/modes');
var archiver = require('archiver');
var utils = require('../lib/utils');

module.exports = {
  remote: function(repoUrl) {
    repoUrl = utils.fixUrl(repoUrl);
    var parsedUrl = urlParse(repoUrl);
    var transport, transportName;
    
    if (parsedUrl.protocol == 'git:') {
      transport = tcpTransport(
        parsedUrl.pathname,
        parsedUrl.hostname,
        parsedUrl.port
      );
      transportName = 'tcp';
    } else {
      transport = httpTransport(repoUrl);
      transportName = 'http';
    }

    var api = fetchPackProtocol(transport);
    
    // add helpers
    api.url = parsedUrl;
    api.transport = transportName;
    api.done = function() {
      this.put({ done: true });
      this.put();
    };
    
    return api;
  },
  repo: function(rootPath, mirror) {
      var repo = {};
      var fsDb = require('../lib/js-git-fs-db');
      require('js-git/mixins/fs-db')(repo, fsDb);
      require('js-git/mixins/read-combiner')(repo);
      require('js-git/mixins/pack-ops')(repo);
      require('js-git/mixins/walkers')(repo);
      require('js-git/mixins/formats')(repo);
      
      if (!mirror) rootPath += '/.git';
      repo.rootPath = rootPath;
      
      return repo;
  },
  ls: function(remote, callback, keepalive) {
    remote.take(function(err, refs) {
      if (remote.transport == 'tcp' && !keepalive) {
        remote.done();
      }
      callback(err, refs);
    });
  },
  clone: function(remote, targetPath, options, callback) {
    var self = this;
    targetPath = targetPath || path.basename(remote.url.pathname, '.git');
    
    if (options.onProgress) {
      var progress;
      if (options.mirror) {
        progress = "Cloning '%s' into bare repository '%s'...";
      } else {
        progress = "Cloning '%s' into '%s'...";
      }
      options.onProgress(format(progress, remote.url.href, targetPath));
    }
    
    var repo = this.repo(targetPath, options.mirror);
    var branch = options.branch || 'refs/heads/master';
    if (!branch.startsWith('refs/') && branch[0] != '/') {
      branch = '/' + branch;
    }
    
    var ref, hash;
    this.ls(remote, select, /*keepalive*/true);

    function select(err, refs) {
      if (err) return callback(err);
    
      ref = Object.keys(refs).filter(function(ref) {
        return ref.endsWith(branch); 
      })[0];
      hash = refs[ref];
      remote.put({ want: hash });
      
      if (options.depth) {
        remote.put({ deepen: parseInt(options.depth, 10) });
      }
      
      remote.put(null);
      remote.done();
      remote.take(unpack);
    }
    
    function unpack(err, channels) {
      if (err) return callback(err);
      
      var packOpts = {
        onError: callback,
        onProgress: function(progress) {
          if (options.onProgress) {
            options.onProgress(progress);
          }
          // Quick hack for "repo.unpack callback is never called using HTTP transport"
          // issue https://github.com/creationix/js-git/issues/120
          if (remote.transport == 'http') {
            var statsRegex = /\((\d+)\/(\d+)\)/;
            var stats = statsRegex.exec(progress);
            
            if (stats[1] == stats[2] - 1) {
              if (options.onProgress) {
                progress = 'Receiving objects: 100% (' + stats[2] + '/' + stats[2] + ')\r\n';
                options.onProgress(progress);
              }
              return addRef();
            }
          }
        }
      };
      
      repo.unpack(channels.pack, packOpts, addRef);
    }
    
    function addRef(err) {
      if (err) return callback(err);
      repo.updateRef(ref, hash, createConfig);
    }
    
    function createConfig(err) {
      if (err) return callback(err);
      
      var configPath = path.join(repo.rootPath, 'config');
      var config = '[remote "origin"]\r\n\turl = ' + remote.url.href;
      
      fs.writeFile(configPath, config, function(err) {
        if (err) return callback(err);
        
        if (!options.mirror) {
          return self.checkout(repo, ref, options, callback);
        } else {
          return callback();
        }
      });
    }
  },
  loadTree: function(repo, ref, callback) {
    repo.readRef(ref, loadCommit);
    
    function loadCommit(err, hash) {
      if (err) {
        if (err.code == 'ENOENT') {
          hash = ref; // maybe ref is hash
        } else {
          return callback(err);
        }
      }
      
      repo.loadAs('commit', hash, readTree);
    }
    
    function readTree(err, commit) {
      if (err) return callback(err);
      repo.treeWalk(commit.tree, callback);
    }
  },
  checkout: function(repo, ref, options, callback) {
    this.loadTree(repo, ref, function(err, tree) {
      if (err) return callback(err);

      var repoPath = repo.rootPath;
      if (path.basename(repoPath) == '.git') {
        repoPath = path.dirname(repoPath);
      }
      
      tree.read(onEntry);
      
      function onEntry(err, entry) {
        if (err) return callback(err);
        if (!entry) return callback();
        
        if (entry.path == '/') {
          return nextEntry();
        }
        
        var entryPath = path.join(repoPath, entry.path);
        
        if (options.onProgress) {
          var colorPath = '\x1B[34m' +
            entryPath.replace(/\//g, '\x1B[1;34m/\x1B[0;34m') + '\x1B[0m';
          options.onProgress(entry.hash + ' ' + colorPath);
        }

        if (entry.mode == modes.tree) {
          return fs.mkdir(entryPath, nextEntry);
        }
        if (entry.mode == modes.blob) {
          return repo.loadAs('blob', entry.hash, function(err, blob) {
            if (err) return callback(err);
            return fs.writeFile(entryPath, blob, nextEntry);
          });
        }
        
        return nextEntry();
      }
      
      function nextEntry(err) {
        if (err) return callback(err);
        return tree.read(onEntry);
      }
    });
  },
  archive: function(repo, ref, options, callback) {
    this.loadTree(repo, ref, function(err, tree) {
      if (err) return callback(err);
      
      var archive = archiver(options.format || 'tar');
      archive.pipe(options.pipe || process.stdout);
      archive.on('error', callback);
      
      tree.read(onEntry);
      
      function onEntry(err, entry) {
        if (err) return callback(err);
        if (!entry) {
          archive.finalize();
          return callback();
        }
        
        if (entry.path == '/') {
          return nextEntry();
        }
        
        var prefixedPath = path.join(options.prefix || '', entry.path);
        
        if (entry.mode == modes.blob) {
          return repo.loadAs('blob', entry.hash, function(err, blob) {
            if (err) return callback(err);
            archive.append(blob, { name: prefixedPath });
            nextEntry();
          });
        }
        
        return nextEntry();
      }
      
      function nextEntry(err) {
        if (err) return callback(err);
        return tree.read(onEntry);
      }
    });
  }
};