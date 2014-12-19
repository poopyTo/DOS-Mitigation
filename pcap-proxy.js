var util = require('util'),
    colors = require('colors'),
    http = require('http'),
    httpProxy = require('http-proxy'),
    pcap = require('pcap'),
    pcap_session = pcap.createSession("", "ip proto \\tcp"),
    fs = require('fs'),
    os = require('os'),
    spawn = require('child_process').spawn,
    sys = require ('sys');

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

//
// Setting IPTables for DOS attack prep
//

var ifaces = os.networkInterfaces();
var ipAddr = new Array();
var ipDrop = new Array();
var messages = {};

for (var dev in ifaces) {
	var alias = 0;
	ifaces[dev].forEach(function(details){
		if (details.family=='IPv4') {
			console.log(dev+(alias?':'+alias:''), details.address);
			ipAddr.push(details.address);
			++alias;
			var child = exec("sudo iptables -I INPUT -p tcp --dport 8002 -i " + dev + " -m state --state NEW -m recent --set");
			child = exec("sudo iptables -I INPUT -p tcp --dport 8002 -i " + dev + " -m state --state NEW -m recent --update -- seconds 5 --hitcount 20 -j DROP");
			child = exec("sudo iptables-save | sudo tee /etc/iptables.up.rules");
		}
	});
}

http.createServer(function (req, res) {

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
		var countTime = 1000; // 1 second
		var messageLimit = 500;
		messages[packet.link.ip.saddr] = messages[packet.link.ip.saddr] || {};
		
		if (ipAddr.contains(packet.link.ip.daddr) && packet.link.ip.tcp.dport == '8002')
			if (!ipDrop.contains(packet.link.ip.saddr)) {
				if (new Date().getTime() - messages[packet.link.ip.saddr].timestamp < countTime)
				{
					messages[packet.link.ip.saddr].count++;
					if (messages[packet.link.ip.saddr].count > messageLimit)
					{
						ipDrop.push(packet.link.ip.saddr);
						console.log(packet.link.ip.saddr + ' pushed');
						var child = spawn('sudo', ['tcpkill', '-i', 'wlan0', 'host', packet.link.ip.saddr]);
					}
				}
				else {
					messages[packet.link.ip.saddr].timestamp = new Date().getTime();
					messages[packet.link.ip.saddr].count = 1;
				}
			}
		
		if (!ipDrop.contains(packet.link.ip.saddr) && ipAddr.contains(packet.link.ip.daddr))
			tcp_tracker.track_packet(packet);
		
	});

	setTimeout(function() {
		if (!ipDrop.contains(req.connection.remoteAddress)) {
			proxy.web(req, res, {
				target: 'http://localhost:9002'
			});
		}
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
