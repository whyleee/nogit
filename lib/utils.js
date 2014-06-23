var config = require('./config').get();

exports.fixUrl = function(url) {
  // remove last '/' (to avoid url's ending with '/.git')
  if (url.slice(-1) == '/') {
    url = url.slice(0, -1);
  }
  
  // '.git' ending is required for js-git
  if (url.slice(-4) != '.git') {
    url += '.git';
  }
  
  // can't use proxy for 'git://' urls (tcp) - use 'https://' instead
  // also check if such replacement required in the config
  var httpsInsteadOfGit = config['url "https://"'] &&
                          config['url "https://"'].insteadOf == 'git://';
  if ((httpsInsteadOfGit || config.nogit.proxy) && url.indexOf('git://') == 0) {
    url = url.replace('git://', 'https://');
  }
  
  return url;
}