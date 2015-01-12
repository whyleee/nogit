var path = require('path');
var fs = require('fs');
var ini = require('ini');

var config = {};

exports.read = function(cb) {
  var userConfigPath = path.join(process.env.USERPROFILE, '.gitconfig');
  readFrom(userConfigPath, function() {
    fs.exists('.git', function(usualRepo) {
      var localConfigPath = usualRepo ? '.git/config' : /*bare*/ 'config';
      readFrom(localConfigPath, function() {
        cb(config);
      });
    });
  });
}

exports.get = function() {
  return config;
}

function readFrom(configPath, cb) {
  fs.readFile(configPath, 'utf8', function(err, data) {
    if (err) {
      // TODO: log it, but not to stdout/stderr - git doesn't do that
      // console.log('"' + configPath + '" not found');
    } else {
      var parsedConfig = ini.parse(data);
      mergeConfigs(config, parsedConfig);
    }
    cb();
  });
}

function mergeConfigs(to, from) {
  for (var prop in from) {to[prop] = from[prop];}
}
