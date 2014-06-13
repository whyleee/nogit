var path = require('path');
var fs = require('fs');
var ini = require('ini');

var config = {};

function read(cb) {
  var userConfigPath = path.join(process.env.USERPROFILE, '.gitconfig');
  readFrom(userConfigPath, function() {
    readFrom('config', function() {
      cb(config);
    });
  });
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
      console.log('"' + configPath + '" not found');
      cb();
    }
  });
}

function mergeConfigs(to, from) {
  for (var prop in from) {to[prop] = from[prop];}
}

exports.read = read;