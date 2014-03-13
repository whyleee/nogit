var git = require('git-node');

function lsRemote(repo, options) {
  var remote = git.remote(repo);
  remote.discover(function (err, refs) {
    if (err) throw err;
    Object.keys(refs).forEach(function (ref) {
      console.log(refs[ref] + "\t" + ref);
    });
    remote.close(function (err) {
      if (err) throw err;
    });
  });
}

module.exports = lsRemote;