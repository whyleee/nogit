var urlParse = require('url').parse;
var globalTunnel = require('global-tunnel');
var config = require('../lib/config').get();
var env = process.env;

module.exports = {
  enableIfRequired: function() {
    var tunnel = 'neither';
    var configHttpProxy = config.http ? config.http.proxy : undefined;
    var configHttpsProxy = config.https ? config.https.proxy : undefined;

    if (env.http_proxy || configHttpProxy) {
      tunnel = 'both';
      if (!env.http_proxy) {
        env.http_proxy = config.http.proxy;
      }
    }
    if (env.https_proxy || configHttpsProxy) {
      if (tunnel == 'neither') {
        tunnel = 'https';
      }
      if (!env.https_proxy) {
        env.https_proxy = configHttpsProxy;
      }
    }

    var proxy = env.http_proxy || env.https_proxy;

    if (proxy) {
      var parsed = urlParse(proxy);
      var conf = {
        connect: tunnel,
        protocol: parsed.protocol,
        host: parsed.hostname,
        port: parseInt(parsed.port,10),
        proxyAuth: parsed.auth
      };
      
      globalTunnel.initialize(conf);
      config.nogit.proxy = proxy;
    }
  }
};