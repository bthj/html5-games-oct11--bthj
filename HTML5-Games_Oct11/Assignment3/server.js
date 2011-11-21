//we need to use more modules in this example:  
var http = require("http"), //main http module as in previous example  
url = require("url"), //url tools  
path = require("path"), //file tools  
qs = require("querystring"), //module for reading GET querystrings (like ?foo=bar&ala=makota)  
fs = require("fs"); //file system module, for reading and writing files  

http.createServer(function(request, response) {

	var uri = url.parse(request.url).pathname; //we take the 'url' part from te request object, parse it using url module methods and get pathname from it
	var filename = path.join(process.cwd(), uri); //because nonrelative paths looks different on different systems, we use path.join method to construct path to our requested file
	if( uri === '/' ) {
		filename += 'index.html';
	}

	path.exists(filename, function(exists) { //is the file exists?  
		if (!exists) { //if not  
			response.writeHeader(404, {
				"Content-Type" : "text/plain"
			});
			response.write("404 Not Found\n");
			response.end();
			return; //send headers and error information  
		}
		fs.readFile(filename, "binary", function(err, file) { //if the file exists  

			response.writeHeader(200); //send '200' header - it's HTTP for OK  
			response.write(file, "binary"); //send the file in binary form  
			response.end(); //and close connection  
		});
	});

}).listen(1337, '127.0.0.1'); //our server is listening on http://127.0.0.1:1337  

console.log('Server is running');