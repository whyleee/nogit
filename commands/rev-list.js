var jsgit = require('../lib/js-git-api');

module.exports = function(branch, options) {
  // only '-n1' and 'refs/heads' are supported
  if (options.maxCount == 1) {
    var repo = jsgit.repo();
    repo.readRef('refs/heads/' + branch, function(err, hash) {
      if (err) throw err;
      console.log(hash);
    });
  }
};