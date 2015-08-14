var jsgit = require('../lib/js-git-api');

module.exports = function archive(ref, options) {
  var repo = jsgit.repo(process.cwd());  
  jsgit.archive(repo, ref, options, function(err) {
    if (err) throw err;
  });
};