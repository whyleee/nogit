var https = require('https');
var urlParse = require('url').parse;
  
function request(method, url, headers, body, callback) {  
  if (typeof body == 'function') {
    callback = body;
    body = undefined;
  }
  
  var parsedUrl = urlParse(url);
  
  // port is required for correct proxy tunneling
  if (!parsedUrl.port) {
    if (parsedUrl.protocol == 'http:') {
      parsedUrl.port = 80;
    } else if (parsedUrl.protocol == 'https:') {
      parsedUrl.port = 443;
    }
  }
  
  var options = {
    method: method,
    hostname: parsedUrl.hostname,
    port: parsedUrl.port,
    path: parsedUrl.path,
    headers: headers
  };
  
  var req = https.request(options, onResponse);
  if (body) {
    req.write(body);
  }
  req.on('error', function(e) {
    callback(e);
  });
  
  req.end();
  
  function onResponse(res) {
    var buf = new Buffer(0);
    res.on('data', function(chunk) {
      buf = Buffer.concat([buf, chunk]);
    });
    res.on('end', function() {
      callback(null, {
        statusCode: res.statusCode,
        headers: res.headers,
        body: buf
      });
    });
  }
}

module.exports = request;