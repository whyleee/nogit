var utils = require('../lib/utils');
var request = require('../lib/js-git-node-request');
var httpTransport = require('js-git/net/transport-http')(request);
var fetchPackProtocol = require('js-git/net/git-fetch-pack');

function lsRemote(repoUrl, options) {
  repoUrl = utils.fixUrl(repoUrl);
  var transport = httpTransport(repoUrl);
  var api = fetchPackProtocol(transport);
  
  api.take(function(err, refs) {
    if (err) throw err;
    Object.keys(refs).forEach(function (ref) {
      if (options.tags && !~ref.indexOf('refs/tags/')) {
        return;
      }
      if (options.heads && !~ref.indexOf('refs/heads/')) {
        return;
      }
      console.log(refs[ref] + "\t" + ref);
    });
  });
}

module.exports = lsRemote;