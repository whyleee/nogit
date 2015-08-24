var jsgit = require('../lib/js-git-api');

module.exports = function clone(repoUrl, targetPath, options) {
  if (options.progress) {
    options.onProgress = console.log;
  }
  
  var remote = jsgit.remote(repoUrl);
  jsgit.clone(remote, targetPath, options, function(err) {
    if (err) throw err;
  });
};