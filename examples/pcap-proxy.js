var util = require('util'),
    colors = require('colors'),
    http = require('http'),
    httpProxy = require('http-proxy'),
    pcap = require('pcap');



//
// Http Server with proxyRequest Handler and Latency
//


var proxy = new httpProxy.createProxyServer();

http.createServer(function (req, res) {

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
      //console.log(JSON.stringify(packet,null,2));
      tcp_tracker.track_packet(packet);
  });


  setTimeout(function () {
    proxy.web(req, res, {
      target: 'http://localhost:9002'
    });
  }, 200);


}).listen(8002);

//
// Target Http Server
//
http.createServer(function (req, res) {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write('request successfully proxied to: ' + req.url + '\n' + JSON.stringify(req.headers, true, 2));
  res.end();
}).listen(9002);

util.puts('http server '.blue + 'started '.green.bold + 'on port '.blue + '8002 '.yellow + 'with proxy.web() handler'.cyan.underline + ' and latency'.magenta);
util.puts('http server '.blue + 'started '.green.bold + 'on port '.blue + '9001 '.yellow);
