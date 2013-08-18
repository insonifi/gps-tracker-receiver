'use strict';
var net = require('net'),
	iron_mq = require('iron_mq'),
    imq = new iron_mq.Client(),
    queue = imq.queue('gps-messages'),
	colors = require('colors'),
	queue_err = function (err, body) {
        if (err) {
            console.log('[IronMQ]'.grey, err, body);
        }
	},
	i,
	c,
	/*************************** Track data receiver ******************************/
	serverGPS = net.createServer(function (module_socket) { //'connection' listener
		var module_id,
			c = module_socket;
		console.log('[GPS]'.grey, 'Connection established');
		c.on('end', function () {
			console.log('[GPS]'.grey, module_id, 'disconnected'.grey);
			module_id = null;
		});
		c.on('error', function (err) {
			console.error('[GPS]'.grey, err.red);
		});
		c.write('GpsTsc v3.2.15\r\n'); //greet client
		c.on('data', function (chunk) {
			var string = chunk.toString(),
				lines = string.split('\r\n'),
				line;
			for (i = 0; i < lines.length; i += 1) {
				line = lines[i];
				if (line[0] === '$') {
					queue.post(module_id + line, queue_err);
					console.log('[GPS]'.grey, 'posted to queue');
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
