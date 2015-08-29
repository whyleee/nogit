var jsgit = require('../lib/js-git-api');

module.exports = function checkout(ref, options) { 
  var repo = jsgit.repo();
  jsgit.checkout(repo, ref, options, function(err) {
    if (err) throw err;
  });
};