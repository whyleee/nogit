var jsgit = require('../lib/js-git-api');

function lsRemote(repoUrl, options) {
  var getAll = !options.heads && !options.tags;
  var remote = jsgit.remote(repoUrl);
  jsgit.ls(remote, function(err, refs) {
    if (err) throw err;
    Object.keys(refs).forEach(function (ref) {
      var wanted = false;
      if (options.heads && ~ref.indexOf('refs/heads/')) {
        wanted = true;
      }
      if (options.tags && ~ref.indexOf('refs/tags/')) {
        wanted = true;
      }
      if (getAll || wanted) {
        console.log(refs[ref] + "\t" + ref);
      }
    });
  });
}

module.exports = lsRemote;