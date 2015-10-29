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
var del = require('del');
var mkdirp = require('mkdirp');
var ncp = require('ncp').ncp;
var config = require('../lib/config').get();
var utils = require('../lib/utils');

module.exports = {
  remote: function(repoUrl) {
    if (!repoUrl.startsWith('git:') && !repoUrl.startsWith('https:')) {
      var gitDir = path.join(repoUrl, '.git');
      if (fs.existsSync(gitDir)) {
        repoUrl = gitDir;
      }
      return {
        url: {
          href: repoUrl,
          pathname: repoUrl,
          protocol: 'file:'
        },
        transport: 'fs'
      };
    }
    
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
      
      if (!rootPath) {
        rootPath = process.cwd();
        var gitDir = path.join(rootPath, '.git');
        if (fs.existsSync(gitDir)) {
          rootPath = gitDir;
        }
      } else if (!mirror) {
        rootPath = path.join(rootPath, '.git');
      }
      
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
    
    if (remote.transport == 'fs') {
      return mkdirp(repo.rootPath, function(err) {
        if (err) return callback(err);
        ncp(remote.url.href, repo.rootPath, { limit: 16 }, function(err) {
          if (err) return callback(err);
          self.checkout(repo, /*head*/null, options, callback);
        });
      });
    }
    
    var branch = options.branch;
    if (branch && !branch.startsWith('refs/') && branch[0] != '/') {
      branch = '/' + branch;
    }
    
    var ref, hash, packedRefs = {};
    this.ls(remote, select, /*keepalive*/true);

    function select(err, refs) {
      if (err) return callback(err);
    
      var selectedRefs = Object.keys(refs).filter(function(ref) {
        if (branch) {
          return ref.endsWith(branch); 
        } else {
          return ref.startsWith('refs/heads/') ||
                (ref.startsWith('refs/tags/') && !ref.endsWith('^{}'));
        }
      });
      
      if (branch) {
        ref = selectedRefs[0];
      } else {
        ref = 'refs/heads/master';
      }
      
      hash = refs[ref];
      
      selectedRefs.forEach(function(ref) {
        remote.put({ want: refs[ref] });
        packedRefs[ref] = refs[ref];
      });
      
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
      repo.updateRef(ref, hash, createPackedRefs);
    }
    
    function createPackedRefs(err) {
      if (err) return callback(err);
      
      var filePath = path.join(repo.rootPath, 'packed-refs');
      var fileContent = '';
      
      for (var packedRef in packedRefs) {
        fileContent += packedRefs[packedRef] + ' ' + packedRef + '\n';
      }
      
      fs.writeFile(filePath, fileContent, createConfig);
    }
    
    function createConfig(err) {
      if (err) return callback(err);
      
      var configPath = path.join(repo.rootPath, 'config');
      var config = '[remote "origin"]\r\n\turl = ' + remote.url.href;
      
      fs.writeFile(configPath, config, checkout);
    }
    
    function checkout(err) {
      if (err) return callback(err);
      
      if (!options.mirror) {
        return self.checkout(repo, ref, options, callback);
      } else {
        return self.writeHead(repo, ref, callback);
      }
    }
  },
  readHead: function(repo, callback) {
    var self = this;
    var headPath = path.join(repo.rootPath, 'HEAD');
    fs.readFile(headPath, function(err, head) {
      if (err) return callback(err);
      
      var ref = head.toString().replace('ref:', '').trim();
      return self.readRef(repo, ref, callback);
    });
  },
  writeHead: function(repo, ref, callback) {
    var headPath = path.join(repo.rootPath, 'HEAD');
    if (!this.isHash(ref)) {
      ref = 'ref: ' + ref;
    }
    fs.writeFile(headPath, ref, callback);
  },
  isHash: function(str) {
    return str.match(/^[0-9a-f]{40}$/i);
  },
  readRef: function(repo, ref, callback) {
    if (this.isHash(ref)) {
      return callback(null, ref);
    }
    
    if (ref.startsWith('refs/')) {
      repo.readRef(ref, function(err, hash) {
        if (err) return callback(err);
        if (hash) return callback(null, hash);
        
        return callback(new Error('Unknown ref: ' + ref));
      });
    } else {
      this.getPackedRefs(repo, function(err, packedRefs) {
        if (err) return callback(err);
        if (Object.keys(packedRefs).length == 0) {
          return callback(new Error('Unknown ref: ' + ref));
        }
        
        // try heads
        for (var packedRef in packedRefs) {
          if (~packedRef.indexOf(ref) ||
              ~packedRefs[packedRef].indexOf(ref)) {
            return callback(null, packedRefs[packedRef]);
          }
        }
        
        // try all commits for all heads
        var headIndex = 0;
        var commitsWalked = 0;
        var visitedCommits = {};
        var commitFound = false;
        var heads = Object.keys(packedRefs)
          .filter(function(packedRef) {
            return packedRef.startsWith('refs/heads');
          });
          
        walkHead(packedRefs[heads[headIndex++]], onHeadWalked);
        
        function walkHead(hash, callback) {
          repo.loadAs('commit', hash, function(err, commit) {
            commit.hash = hash;
            onCommit(err, commit);
          });
          
          function onCommit(err, commit) {
            if (err) return callback(err);
            if (commitFound || visitedCommits[commit.hash]) {
              return;
            }
            
            if (~commit.hash.indexOf(ref)) {
              commitFound = true;
              return callback(null, commit.hash);
            }
            
            visitedCommits[commit.hash] = true;
            ++commitsWalked;
            
            if (commit.parents.length == 0) {
              return callback();
            }
            
            commit.parents.forEach(function(parentHash) {
              repo.loadAs('commit', parentHash, function(err, commit) {
                commit.hash = parentHash;
                onCommit(err, commit);
              });
            });
          }
        }
        
        function onHeadWalked(err, foundHash) {
          if (err) return callback(err);
          if (foundHash) return callback(null, foundHash);
          
          if (headIndex < heads.length) {
            walkHead(packedRefs[heads[headIndex++]], onHeadWalked);
          } else {
            return callback(new Error('Unknown ref: ' + ref));
          }
        }
      });
    }
  },
  getPackedRefs: function(repo, callback) {
    var packedRefsPath = path.join(repo.rootPath, 'packed-refs');
    fs.readFile(packedRefsPath, 'utf8', function(err, packedRefs) {
      if (err) return callback(err);
      
      var map = {};
      packedRefs.split('\n')
      .filter(function(line) { return line; })
      .forEach(function(line) {
        var refParts = line.split(' ');
        map[refParts[1]] = refParts[0];
      });
      return callback(null, map);
    });
  },
  loadTree: function(repo, ref, callback) {
    var self = this;
    this.readRef(repo, ref, loadCommit);

    function loadCommit(err, hash) {
      if (err) return callback(err);
      repo.loadAs('commit', hash, function(err, commit) {
        if (err instanceof TypeError &&
            err.message == 'Type mismatch') {
          return loadTag(null, hash);
        }
        readTree(err, commit);
      });
    }
    
    function loadTag(err, hash) {
      if (err) return callback(err);
      repo.loadAs('tag', hash, function(err, tag) {
        if (err) return callback(err);
        loadCommit(err, tag.object);
      });
    }
    
    function readTree(err, commit) {
      if (err) return callback(err);
      repo.treeWalk(commit.tree, callback);
    }
  },
  checkout: function(repo, ref, options, callback) {
    var self = this;
    
    if (!ref) {
      this.readHead(repo, function(err, head) {
        if (err) return callback(err);
        self.loadTree(repo, head, writeTree);
      });
    } else {
      this.loadTree(repo, ref, writeTree);
    }
    
    function writeTree(err, tree) {
      if (err) return callback(err);

      var repoPath = repo.rootPath;
      if (path.basename(repoPath) == '.git') {
        repoPath = path.dirname(repoPath);
      }
      
      del([
        path.join(repoPath, '*'),
        '!' + path.join(repoPath, '.git')
      ], function(err, paths) {
        tree.read(onEntry);
      });
      
      function onEntry(err, entry) {
        if (err) return callback(err);
        if (!entry) {
          if (ref) {
            return self.writeHead(repo, ref, callback);
          }
          return callback();
        }
        
        if (entry.path == '/') {
          return nextEntry();
        }
        
        var entryPath = path.join(repoPath, entry.path);
        
        if (options.onProgress) {
          var colorPath = '\x1B[34m' +
            entryPath.replace(/\//g, '\x1B[1;34m/\x1B[0;34m') + '\x1B[0m';
          options.onProgress(entry.hash + ' ' + colorPath);
        }

        var entryType = modes.toType(entry.mode);
        
        if (entryType == 'tree') {
          return fs.mkdir(entryPath, nextEntry);
        } else if (entryType == 'blob') {
          return repo.loadAs('blob', entry.hash, function(err, blob) {
            if (err) return callback(err);
            return fs.writeFile(entryPath, blob, nextEntry);
          });
        }
        // skip commits, because we don't support submodules
        if (entryType != 'commit') {
          return callback(new Error('Unknown entry mode: ' + entry.mode));
        }
        
        return nextEntry();
      }
      
      function nextEntry(err) {
        if (err) return callback(err);
        return tree.read(onEntry);
      }
    }
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
  },
  isInsideGitDir: function() {
    return process.cwd().indexOf('.git') >= 0;
  },
  getRemoteUrl: function() {
    return config['remote "origin"'].url;
  }
};