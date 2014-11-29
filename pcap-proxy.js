var util = require('util'),
    colors = require('colors'),
    http = require('http'),
    httpProxy = require('http-proxy'),
    pcap = require('pcap'),
    fs = require('fs');

//
// Http Server with proxyRequest Handler and Latency
//

var proxy = new httpProxy.createProxyServer();

http.createServer(function (req, res) {

  var ipDrop = {};
  
  ipDrop.on = (function(){
	  var messages = {};
	  var speedLimit = 5; //5ms
	  return function(message, func) {
		  messages[message] = messages[message] || {};
		  if (messages[message].timestamp && new Date().getTime() - messages[message].timestamp < speedLimit) {
			  res.writeHead(200, { 'Content-Type': 'text/plain' });
			  res.write('Hey, fuck you buddy.');
			  res.end();
		  }
		  else messages[message].timestamp = new Date().getTime();
		  
		  setTimeout(func, 200);
		  return true;
	  }
  }());
    
  ipDrop.on(req, function () {
    proxy.web(req, res, {
      target: 'http://localhost:9002'
    });
  });

  /*

  tcp_tracker = new pcap.TCP_tracker(),
  pcap_session = pcap.createSession("", "ip proto \\tcp");

  tcp_tracker.on('start', function (session) {
      console.log("Start of TCP session between " + session.src_name + " and " + session.dst_name);
      JSON.stringify(session,null,2);
  });

  tcp_tracker.on('end', function (session) {
      console.log("End of TCP session between " + session.src_name + " and " + session.dst_name);
  });

  pcap_session.on('packet', function (raw_packet) {
      var packet = pcap.decode.packet(raw_packet);
      tcp_tracker.track_packet(packet);
  });
  */


}).listen(8002, "0.0.0.0");

//
// Target Http Server
//
http.createServer(function (req, res) {
  var img = fs.readFileSync('./Content/images/barbeau.png');
  res.writeHead(200, { 'Content-Type': 'image/png' });
  res.end(img, 'binary');
}).listen(9002, "0.0.0.0");

util.puts('http server '.blue + 'started '.green.bold + 'on port '.blue + '8002 '.yellow + 'with proxy.web() handler'.cyan.underline + ' and latency'.magenta);
util.puts('http server '.blue + 'started '.green.bold + 'on port '.blue + '9002 '.yellow);
