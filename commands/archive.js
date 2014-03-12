var fs = require('fs');
var git = require('git-node');
var path = require('path');
var archiver = require('archiver');

function archive(commit, options) {
  var root = process.cwd();
  var repo = git.repo(root);

  var archive = archiver(options.format);
  var output = process.stdout;

  archive.on('error', function(err) {
    throw err;
  });

  archive.pipe(output);

  repo.treeWalk(commit, function (err, stream) {
    if (options.verbose) console.log('Creating archive...');
    if (err) throw err;
    read = stream.read;
    return read(function() {
      read(onEntry);
    });
  });

  function onEntry(err, entry) {
    if (err) throw err;
    if (!entry){
      archive.finalize();
      if (options.verbose) {
        console.log('Done.')
      }
      return;
    }

    var prefixedPath = path.join(options.prefix, entry.path);

    if (options.verbose) {
      console.log("adding %s", prefixedPath);
    }
    if (entry.type === "blob") {
      archive.append(entry.body, {name: prefixedPath});
    }
    return read(onEntry);
  }
}

module.exports = archive;