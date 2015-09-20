var jsgit = require('../lib/js-git-api');

module.exports = function(options) {
  // only '--get' supported
  if (options.get) {
    console.log(jsgit.getRemoteUrl());
  }
};