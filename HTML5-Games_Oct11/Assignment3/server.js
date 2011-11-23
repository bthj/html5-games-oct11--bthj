var http = require("http").createServer(handler), 
// io = require('socket.io').listen( http ),
url = require("url"), 
path = require("path"), 
qs = require("querystring"), 
fs = require("fs"), 
boss = true, 
lastPosition = {};

http.listen(1337);

/*
io.sockets.on('connection', function(socket) {

	socket.on('sendMoves', function(data) {
//		console.log(data);
		lastPosition = {
			x : data.x,
			y : data.y
		};
		socket.emit('get', {
			x : lastPosition.x,
			y : lastPosition.y
		});
	});
});
*/

function handler(request, response) {

	var uri = url.parse(request.url).pathname;
	var filename = path.join(process.cwd(), uri);

	if (uri === '/') {

		filename += 'index.html';

	} else if (uri.indexOf('/hello/') !== -1) {

		response.writeHeader(200, {
			"Content-Type" : "text/json"
		});
		response.write(JSON.stringify({
			daBoss : boss
		}));

		response.end();

		boss = false;

	} else if (uri.indexOf('/move/') !== -1) {

		var position = qs.parse(url.parse(request.url).query);

		lastPosition = {
			x : position.x,
			y : position.y
		};

		response.writeHeader(200, {
			"Content-Type" : "text/json"
		});
		response.write(JSON.stringify({
			ok : 'ok'
		}));
		response.end();

	} else if (uri.indexOf('/bye/') !== -1) {

		response.writeHeader(200, {
			"Content-Type" : "text/json"
		});
		response.end();
		boss = true;

	} else if (uri.indexOf('/get/') !== -1) {

		response.writeHeader(200, {
			"Content-Type" : "text/json"
		});
		response.write(JSON.stringify({
			x : lastPosition.x,
			y : lastPosition.y
		}));

		response.end();
	}

	path.exists(filename, function(exists) {
		if (!exists) {
			response.writeHeader(404, {
				"Content-Type" : "text/plain"
			});
			response.write("404 Not Found\n");
			response.end();
			return;
		}

		fs.readFile(filename, "binary", function(err, file) {

			if (err) {
				response.writeHeader(500, {
					"Content-Type" : "text/plain"
				});
				response.write(err + "\n");
				response.end();
				return;
			}

			response.writeHeader(200);
			response.write(file, "binary");
			response.end();
		});
	});

}


console.log("Server running...");