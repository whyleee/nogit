var git = require('git-node');
var utils = require('../lib/utils');

function lsRemote(repo, options) {
  repo = utils.fixUrl(repo);
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