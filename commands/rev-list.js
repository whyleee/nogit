var jsgit = require('../lib/js-git-api');

module.exports = function(branch, options) {
  // only '-n1' and 'refs/heads' are supported
  if (options.maxCount == 1) {
    var repo = jsgit.repo();
    repo.readRef('refs/heads/' + branch, function(err, hash) {
      if (err) throw err;
      if (hash) {
        console.log(hash);
      } else {
        readRemoteRef(branch, function(err, hash) {
          if (err) throw err;
          console.log(hash);
        });
      }
    });
  }
};

function readRemoteRef(branch, callback) {
  var remote = jsgit.remote(jsgit.getRemoteUrl());
  jsgit.ls(remote, function(err, refs) {
    if (err) return callback(err);
    
    var ref = Object.keys(refs).filter(function(ref) {
      return ref.endsWith('/' + branch); 
    })[0];
    
    return callback(null, refs[ref]);
  });
}