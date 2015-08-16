var config = require('../lib/config').get();

module.exports = function(options) {
  // only '--get' supported
  if (options.get) {
    if (config['remote "origin"']) {
      console.log(config['remote "origin"'].url);
    }
  }
};