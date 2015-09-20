var jsgit = require('../lib/js-git-api');

module.exports = function(options) {
  if (options.isInsideGitDir) {
    console.log(jsgit.isInsideGitDir());
  }
};