


var Connect = function(method, url, data, callback) {
	var formatedData = [];

	if (data) {

		for ( var i in data) {
			formatedData.push(encodeURIComponent(i) + "="
					+ encodeURIComponent(data[i]));
		}

		url += (url.match(/\?/) ? "&" : "?")
				+ formatedData.join("&").replace(/%20/g, "+");
	}

	var http = new XMLHttpRequest();
	http.open(method, url, true);
	http.onreadystatechange = function(event) {
		if (event.target.DONE === event.target.readyState) {
			if (typeof callback === "function") {
				callback(JSON.parse(event.target.responseText));
			}
		}
	};
	http.send();
};

var GF = function() {
	var mainScreen = null,
	//main screen is the place where we will render our game, it will be independent from the fpsContainer  
	states = {},
	//we will store currently pressed keys in the states object  
	frameCount = 0, fps = 0, lastTime = +(new Date()), fpsContainer = null, 
	player = null, //player element  
	playerPosition = { //player position & size  
		x : 0,
		y : 0,
		width : 50,
		height : 50
	}, transformSupport = null, //method of moving player  
	step = 10, //how many pixel player will move on each frame  
	platform = null, 
	platformPosition = { //platform position & size  
		x : 200,
		y : 200,
		width : 150,
		height : 150
	};
	
//	var socket = io.connect('http://localhost:1337/');
	

	var MeasureFPS = function() {
		var newTime = +(new Date());
		var diffTime = ~~((newTime - lastTime));

		if (diffTime >= 1000) {
			fps = frameCount;
			frameCount = 0;
			lastTime = newTime;
		}

		fpsContainer.innerHTML = 'FPS: ' + fps;
		frameCount++;
	};

	var detectPropertyPrefix = function(property) {
		var prefixes = [ 'Moz', 'Ms', 'Webkit', 'O' ];
		for ( var i = 0, j = prefixes.length; i < j; i++) {
			if (typeof document.body.style[prefixes[i] + property] !== 'undefined') {
				return prefixes[i] + property;
			}
		}
		return false;
	};

	var moveObject = function(object, x, y) { //we change 'movePlayer' to 'moveObject' with object as additional parameter  
		if (transformSupport === false) {
			object.style.top = y + "px";
			object.style.left = x + "px";
		} else {
			object.style[transformSupport] = 'translate(' + x + 'px, ' + y + 'px)';
		}
	};

	var mainLoop = function() {
		MeasureFPS();

		//update player position on each frame  
		if (states.left) {
			playerPosition.x -= step;
		}
		if (states.up) {
			playerPosition.y -= step;
		}
		if (states.right) {
			playerPosition.x += step;
		}
		if (states.down) {
			playerPosition.y += step;
		}
		moveObject(player, playerPosition.x, playerPosition.y);
		loop(mainLoop);
	};

	var loop = (function() {
		return window.requestAnimationFrame
				|| window.webkitRequestAnimationFrame
				|| window.mozRequestAnimationFrame
				|| window.oRequestAnimationFrame
				|| window.msRequestAnimationFrame
				|| function( /* function */callback, /* DOMElement */element) {
					window.setTimeout(callback, 1000 / 60);
				};
	})();

	var sendMoves = function() {

		Connect("GET", "/move/", {
			x : playerPosition.x,
			y : playerPosition.y
		});
/*
		socket.emit('sendMoves', {
			x : playerPosition.x,
			y : playerPosition.y
		});
*/
	};

	var getMoves = function(callback) {
		Connect("GET", "/get/", {}, callback);
	};

	var start = function() {

		//features detection  
		transformSupport = detectPropertyPrefix('Transform');

		Connect("GET", "/hello/", {
			id : ~~(Math.random() * 87236584)
		}, function(data) {
			if (data.daBoss === true) {

				//add the listener to the main, window object, and update the states  
				window.addEventListener('keydown', function(event) {
					if (event.keyCode === 37) {
						states.left = true;
					}
					if (event.keyCode === 38) {
						states.up = true;
					}
					if (event.keyCode === 39) {
						states.right = true;
					}
					if (event.keyCode === 40) {
						states.down = true;
					}
				}, false);

				//if the key will be released, change the states object  
				window.addEventListener('keyup', function(event) {
					if (event.keyCode === 37) {
						states.left = false;
					}
					if (event.keyCode === 38) {
						states.up = false;
					}
					if (event.keyCode === 39) {
						states.right = false;
					}
					if (event.keyCode === 40) {
						states.down = false;
					}
				}, false);

				setInterval(sendMoves, 1000 / 30);

				window.onunload = function() {
					Connect("GET", "/bye/");
				};

			} else {

				setInterval(function() {
					getMoves(function(data) {
						playerPosition.x = data.x;
						playerPosition.y = data.y;
					});
				}, 1000 / 30);
/*

				socket.on( "get", function(data){
					playerPosition.x = data.x;
					playerPosition.y = data.y;
				});
*/
			}

		});

		mainScreen = document.createElement('div');
		document.body.appendChild(mainScreen);

		fpsContainer = document.createElement('div');
		document.body.appendChild(fpsContainer);

		//create player  
		player = mainScreen.appendChild(document.createElement('div'));
		player.id = 'player';

		loop(mainLoop);

	};

	//our GameFramework returns public API visible from outside scope  
	return {
		start : start
	};
};

var game = new GF();
game.start();