var jsgit = require('../lib/js-git-api');

function lsRemote(repoUrl, options) {
  var remote = jsgit.remote(repoUrl);
  jsgit.ls(remote, function(err, refs) {
    if (err) throw err;
    Object.keys(refs).forEach(function (ref) {
      if (options.tags && !~ref.indexOf('refs/tags/')) {
        return;
      }
      if (options.heads && !~ref.indexOf('refs/heads/')) {
        return;
      }
      console.log(refs[ref] + "\t" + ref);
    });
  });
}

module.exports = lsRemote;