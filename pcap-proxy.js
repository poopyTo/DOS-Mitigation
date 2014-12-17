var util = require('util'),
    colors = require('colors'),
    http = require('http'),
    httpProxy = require('http-proxy'),
    pcap = require('pcap'),
    pcap_session = pcap.createSession("", "ip proto \\tcp"),
    fs = require('fs');

//
// Http Server with proxyRequest Handler and Latency
//

var proxy = new httpProxy.createProxyServer();

Array.prototype.contains = function(elem)
{
	for (var i in this)
	{
		if (this[i]==elem) return true;
	}
	return false;
}

http.createServer(function (req, res) {
	var ipDrop = new Array();
	var messages = {};

	tcp_tracker = new pcap.TCP_tracker(),

	tcp_tracker.on('start', function (session) {
		console.log("Start of TCP session between " + session.src_name + " and " + session.dst_name);
		JSON.stringify(session,null,2);
	});

	tcp_tracker.on('end', function (session) {
		console.log("End of TCP session between " + session.src_name + " and " + session.dst_name);
	});

	pcap_session.on('packet', function (raw_packet) {
		var packet = pcap.decode.packet(raw_packet);
		var speedLimit = 5; //5ms
		messages[packet.link.ip.saddr] = messages[packet.link.ip.saddr] || {};
		
		if (messages[packet.link.ip.saddr].timestamp && new Date().getTime() - messages[packet.link.ip.saddr].timestamp < speedLimit)
			if (!ipDrop.contains(packet.link.ip.saddr)) {
				ipDrop.push(packet.link.ip.saddr);
				console.log(packet.link.ip.saddr + ' pushed');
			}
		else messages[packet.link.ip.saddr].timestamp = new Date().getTime();
		
		if (!ipDrop.contains(packet.link.ip.saddr)) {
			console.log("Everything is fine for " + packet.link.ip.saddr);
			tcp_tracker.track_packet(packet);
		}
	});

	setTimeout(function() {
		if (!ipDrop.contains(req.connection.remoteAddress))
			proxy.web(req, res, {
				target: 'http://localhost:9002'
			});
		else {
			res.writeHead(200, { 'Content-Type': 'text/plain' });
			res.write('Hey, we know about the DOS');
			res.end();
		}
	}, 200);

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
