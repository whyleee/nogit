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
    var parsedUrl = urlParse(repoUrl);
    var transport, transportName;
    
    if (parsedUrl.protocol == 'git:') {
      transport = tcpTransport(
        parsedUrl.pathname,
        parsedUrl.hostname,
        parsedUrl.port
      );
      transportName = 'tcp';
    } else {
      transport = httpTransport(repoUrl);
      transportName = 'http';
    }

    var api = fetchPackProtocol(transport);
    
    // add helpers
    api.url = parsedUrl;
    api.transport = transportName;
    api.close = function() {
      this.put({ done: true });
      this.put();
    };
    
    return api;
  }
};