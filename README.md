DOS-Mitigation
==============
These examples come from https://github.com/nodejitsu/node-http-proxy and https://github.com/mranney/node_pcap

On a fresh git clone, cd to 'examples':
npm install http-proxy
npm install pcap

To run examples: 

node proxy-example.js

sudo node pcap-example.js


To Launch Attack: 

Install hping3:

sudo apt-get install hping3

sudo hping3 --flood -S -p 80 192.168.2.135

80 is the port of the target application.

Last argument is the IP address. 

Might need to run :

sudo iptables -A OUTPUT -p tcp --tcp-flags RST RST -d 192.168.2.135 -j DROP

If you run wireshark you will see that no ACK will be sent back. 

For an instructional video: https://www.youtube.com/watch?v=Pzy-FwGF_OU

sudo hping3 --flood -S -p 80 192.168.2.135







