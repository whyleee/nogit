var tcp = require('js-git/net/tcp-node');
var tcpTransport = require('js-git/net/transport-tcp')(tcp);
var request = require('../lib/js-git-node-request');
var httpTransport = require('js-git/net/transport-http')(request);
var fetchPackProtocol = require('js-git/net/git-fetch-pack');
var urlParse = require('url').parse;
var utils = require('../lib/utils');

module.exports = {
  remote: function(repoUrl) {
    repoUrl = utils.fixUrl(repoUrl);
    var protocol = utils.getUrlProtocol(repoUrl);
    var transport;
    
    if (protocol == 'git') {
      var parsedUrl = urlParse(repoUrl);
      transport = tcpTransport(
        parsedUrl.pathname,
        parsedUrl.hostname,
        parsedUrl.port
      );
    } else {
      transport = httpTransport(repoUrl);
    }

    var api = fetchPackProtocol(transport);
    api.close = function() {
      this.put({ done: true });
      this.put();
    };
    
    return api;
  }
};