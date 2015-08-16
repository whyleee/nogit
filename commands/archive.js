var jsgit = require('../lib/js-git-api');

module.exports = function archive(ref, options) {
  jsgit.archive(jsgit.repo(), ref, options, function(err) {
    if (err) throw err;
  });
};