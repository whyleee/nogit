var path = require('path');
var fs = require('fs');
var ini = require('ini');

var config = {};

exports.read = function(cb) {
  var userConfigPath = path.join(process.env.USERPROFILE, '.gitconfig');
  readFrom(userConfigPath, function() {
    readFrom('config', function() {
      cb(config);
    });
  });
}

exports.get = function() {
  return config;
}

function readFrom(configPath, cb) {
  fs.exists(configPath, function(exists) {
    if (exists) {
      fs.readFile(configPath, 'utf8', function(err, data) {
        if (err) throw err;
        var parsedConfig = ini.parse(data);
        mergeConfigs(config, parsedConfig);
        cb();
      });
    } else {
      // TODO: log it, but not to stdout/stderr - git doesn't do that
      // console.log('"' + configPath + '" not found');
      cb();
    }
  });
}

function mergeConfigs(to, from) {
  for (var prop in from) {to[prop] = from[prop];}
}