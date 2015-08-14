var jsgit = require('../lib/js-git-api');

module.exports = function archive(ref, options) {
  var repo = jsgit.repo(process.cwd());
  
  if (options.verbose) {
    options.onProgress = console.log;
  }
  
  jsgit.archive(repo, ref, options, function(err) {
    if (err) throw err;
  });
};