var net = require('net'),
	io = require('socket.io-client'),
	colors = require('colors'),
	EventEmitter = require('events').EventEmitter,
	state = new EventEmitter,
	socket = io.connect(/:/.test(process.argv[2]) ? process.argv[2] :'127.0.0.1:80', {
	  'reconnect': true,
	  'reconnection delay': 120,
	  'max reconnection attempts': 10000
	});

state.connected = false;
state.queue = [];

socket.on('connect', function(socket) {
	state.socket = socket;
	state.socket.emit('handshake', {welcome: 'GPS Receiver'});
	state.socket.on('hanshake', function (message) {
		console.log('[proxy]'.grey, 'connected to '.green, message.welcome);
	})
	
	state.connected = true;
	
	function flush_queue() {
		var queue_length = state.queue.length;
			for (var i = 0; i < queue_length; i++) {
				state.socket.emit('gps-message', state.queue.pop());
			}
		console.log('[proxy]'.grey, 'flushed queue:', queue_length);
	}
	if (state.queue.length > 0) {
		flush_queue();
	}

	state.socket.on('message', function (message) {
		state.socket.emit('gps-message', message);
		console.log('[GPS]'.grey, 'sent to server');
	});
});
socket.on('disconnect', function(socket) {
	console.log('[proxy]'.grey, 'disconnected from server'.red);
	state.connected = false;
});

/*************************** Track data receiver ******************************/					
var serverGPS = net.createServer(function(c) { //'connection' listener
	console.log('[GPS]'.grey, 'Connection established');
	c.on('end', function() {
			console.log('[GPS]'.grey, vId, 'disconnected'.grey);
			vId = null;
		});
	c.write('GpsTsc v3.2.15\r\n'); //greet client
	c.on('data', function(chunk) {
		var string = chunk.toString();
		var lines = string.split('\r\n');
		for (var i = 0; i < lines.length; i++) {
			var line = lines[i];
			//console.info('> %s', line);
			if (line[0] == 'I') { //id
				vId = line.slice(1);
				console.log('[GPS]'.grey, vId, 'connected'.green);
				continue
			}
			if (line[0] == 'D') { //expect to download batch of records//D####
				console.log('[GPS]'.grey, vId, 'uploads %s coordinates', line.slice(1));
				continue
			}
			if (line[0] == 'Q') {
				console.log('[GPS]'.grey, vId, 'seen at', (new Date).toISOString());
				continue
			}
			if (line[0] == 'M') {
				//not implemeted, don't know what this is:
				//M98:000000,V,9900.000,N,00000.000,W,000.0,000,000000,010*47
				continue
			}
			if (line[0] == '$') {
				//queue.add(vId + line); //add to parse queue
				if (state.connected) {
					state.emit('message', vId + line);
				} else {
					console.log('[GPS]'.grey, 'put on queue');
					state.queue.push(vId + line);
				}
				console.log('[GPS]'.grey, vId, line);
				continue
			}
		}
		c.write('0\r\n'); //respond back
	});
});
serverGPS.listen(process.env.VCAP_APP_PORT || 920, function() { //'listening' listener
  console.log('[GPS]'.grey, 'Receiver listening'.green);
});
