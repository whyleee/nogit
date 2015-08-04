var https = require('https');
var urlParse = require('url').parse;
  
function request(method, url, headers, body, callback) {  
  if (typeof body == "function") {
    callback = body;
    body = undefined;
  }
  
  var parsedUrl = urlParse(url);
  var options = {
    method: method,
    hostname: parsedUrl.hostname,
    port: parsedUrl.port,
    path: parsedUrl.path,
    headers: headers
  };
  
  var req = https.request(options, function(res) {
    var buf = new Buffer(0);
    res.on('data', function(chunk) {
      buf = Buffer.concat([buf, chunk]);
    });
    res.on('end', function() {
      callback(/*error*/null, {
        statusCode: res.statusCode,
        headers: res.headers,
        body: new Uint8Array(buf)
      });
    });
  });
  
  req.on('error', function(e) {
    console.log('request error: ' + e.message);
  });
  
  if (body) {
    req.write(body); // TODO: not tested yet
  }
  
  req.end();
}

module.exports = request;