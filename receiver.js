'use strict';
var net = require('net'),
	io = require('socket.io-client'),
	colors = require('colors'),
	EventEmitter = require('events').EventEmitter,
	i,
	c,
	module_id,
	state = {},
	conf = require('./conf'),
	socket = io.connect(conf.socket === undefined ? '127.0.0.1:8000' : conf.socket, {
		'reconnect': true,
		'reconnection delay': 120,
		'max reconnection attempts': 10000
	}),
	flush_queue = function () {
		var queue_length = state.queue.length;
		for (i = 0; i < queue_length; i += 1) {
			socket.emit('gps-message', state.queue[i]);
		}
		state.queue = [];
		console.log('[proxy]'.grey, 'flushed queue:', queue_length);
	},
	/*************************** Track data receiver ******************************/
	serverGPS = net.createServer(function (socket) { //'connection' listener
		c = socket;
		console.log('[GPS]'.grey, 'Connection established');
		c.on('end', function () {
			console.log('[GPS]'.grey, module_id, 'disconnected'.grey);
			module_id = null;
		});
		c.on('error', function(err {
			console.error('[GPS]'.grey, err.red);
		}
		c.write('GpsTsc v3.2.15\r\n'); //greet client
		c.on('data', function (chunk) {
			var string = chunk.toString(),
				lines = string.split('\r\n'),
				line;
			for (i = 0; i < lines.length; i += 1) {
				line = lines[i];
				//console.info('> %s', line);
				if (line[0] === '$') {
					//queue.add(module_id + line); //add to parse queue
					if (state.connected) {
						socket.emit('gps-message',  module_id + line);
						console.log('[GPS]'.grey, 'sent to server');
					} else {
						console.log('[GPS]'.grey, 'put on queue');
						state.queue.push(module_id + line);
					}
					console.log('[GPS]'.grey, module_id, line);
					continue;
				}
				if (line[0] === 'Q') {
					console.log('[GPS]'.grey, module_id, 'seen at', (new Date()).toISOString());
					continue;
				}
				if (line[0] === 'I') { //id
					module_id = line.slice(1);
					console.log('[GPS]'.grey, module_id, 'connected'.green);
					continue;
				}
				if (line[0] === 'D') { //expect to download batch of records//D####
					console.log('[GPS]'.grey, module_id, 'uploads %s coordinates', line.slice(1));
					continue;
				}
				if (line[0] === 'M') {
					//not implemeted, don't know what this is:
					//M98:000000,V,9900.000,N,00000.000,W,000.0,000,000000,010*47
					continue;
				}
			}
			c.write('0\r\n'); //respond back
		});
	});

state.connected = false;
state.queue = [];

socket.on('connect', function () {
	socket.emit('handshake', {welcome: 'GPS Receiver'});
	state.connected = true;
	if (state.queue.length > 0) {
		flush_queue();
	}
});

socket.on('handshake', function (message) {
	console.log('[proxy]'.grey, 'connected to '.green, message.welcome);
});

socket.on('disconnect', function (socket) {
	console.log('[proxy]'.grey, 'disconnected from server'.red);
	state.connected = false;
});

serverGPS.listen(920, function () { //'listening' listener
	console.log('[GPS]'.grey, 'Receiver listening'.green);
});

serverGPS.on('error', function (err) {
	if (err.code === 'EACCES') {
		console.log('[GPS]'.grey, 'not allowed to listen on port'.red);
	} else {
		console.log('[GPS]'.grey, err.toString().red);
	}
});
