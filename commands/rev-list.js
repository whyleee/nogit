var jsgit = require('../lib/js-git-api');

module.exports = function(ref, options) {
  // only '-n1' are supported
  if (options.maxCount == 1) {
    var repo = jsgit.repo();
    jsgit.readRef(repo, ref, function(err, hash) {
      if (err) throw err;
      console.log(hash);
    });
  }
};