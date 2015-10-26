var fs = require('fs');
var dirname = require('path').dirname;
var mkdirp = require('mkdirp');

module.exports = {
  readFile: function(path, callback) {
    fs.readFile(path, function(err, buffer) {
      if (err) {
        if (err.code == 'ENOENT') return callback();
        return callback(err);
      }
      callback(null, buffer);
    });
  },
  writeFile: function(path, buffer, callback) {
    mkdirp(dirname(path), function(err) {
      if (err) return callback(err);
      fs.writeFile(path, buffer, callback);
    });
  },
  readDir: function(path, callback) {
    fs.readdir(path, function(err, results) {
      if (err) {
        if (err.code == 'ENOENT') return callback();
        return callback(err);
      }
      return callback(null, results);
    });
  },
  readChunk: function(path, start, end, callback) {
    fs.open(path, 'r', function(err, fd) {
      if (err) {
        if (err.code == 'ENOENT') return callback();
        return callback(err);
      }
      if (end < 0) {
        end = fs.statSync(path)['size'] + end;
      }
      var chunkSize = end - start;
      var buf = new Buffer(chunkSize);
      fs.read(fd, buf, 0, chunkSize, start, function(err, bytesRead, buffer) {
        fs.close(fd, function(closeErr) {
          return callback(err || closeErr, buffer);
        });
      });
    });
  },
  rename: function(oldPath, newPath, callback) {
    return fs.rename(oldPath, newPath, callback);
  }
}