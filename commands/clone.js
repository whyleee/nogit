var jsgit = require('../lib/js-git-api');

module.exports = function clone(repoUrl, targetPath, options) {
  var remote = jsgit.remote(repoUrl);
  
  if (options.verbose) {
    options.onProgress = console.log;
  }
  
  jsgit.clone(remote, targetPath, options, function(err) {
    if (err) throw err;
  });
};