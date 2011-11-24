


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
	states = {}, //we will store currently pressed keys in the states object  
	frameCount = 0, 
	fps = 0, 
	lastTime = +(new Date()), 
	fpsContainer = null, 
	
	lastAnimChangeTime = {}, 
	timeStep = 150, //how many milliseconds to elapse between moves, to decouple speed from frame rate
	step = 10, //how many pixel player will move on each frame
	
	players = {}, //player elements
	playerPositions = {},
	playerIsMoving = {},
	defaultPlayerPosition = { //player position & size  
		x: 100,  
		y: 300,
		width : 80,
		height : 90
	},
	playerId = null,
	
	transformSupport = null, //method of moving player  
	animationSupport = null, // can we use CSS3 for animation
	
	platform = null, 
	platformPosition = { //platform position & size  
		x : 300,
		y : 240,
		width : 150,
		height : 150
	};
	
//	var socket = io.connect('http://localhost:1337/');
	
	
	// animation related members
	var frames = 3,
	actualFrame = {},
	image = {},
	imageStyle = {};
	
	var constructAnimationClass = function(prefix, animationName, frames, height){  

		var animationClass = "@" + prefix + "keyframes "+ animationName +" {\n",  
			step = 100/(frames+1);  
		for (var i = 0; i < frames+1; i++) {  
			animationClass += ~~((step*i)*100) / 100 + "% { " + 'background-position: 0 -' + i * height + 'px; }\n';  
			animationClass += ~~((step*(i+1)-0.01)*100)/100 + "% { " + 'background-position: 0 -' + i * height + 'px; }\n';  
		}

		return animationClass += '100'+ "% { " + prefix + 'background-position: 0 0 }\n}';
	};
	
	
	/////// physics /////
	
    var isJumping = false,    
    isFalling = false,
    jumpSpeed = 0,    
    fallSpeed = 0,
    groundY = 300,

	jump = function() {    
		if (!isJumping && !isFalling) {    
			fallSpeed = 0;    
			isJumping = true;    
			jumpSpeed = 20;
		}
	},

	checkJump = function() {
		if( isJumping ) {
			playerPositions[playerId].y -= jumpSpeed;    
			jumpSpeed--;
			
			if (jumpSpeed == 0) {    
				isJumping = false;    
				isFalling = true;    
				fallSpeed = 1;
			}
		}
	},

	fallStop = function(){    
		isFalling = false;    
		fallSpeed = 0;
	},

	checkFall = function(){
		if( isFalling ) {
			if (playerPositions[playerId].y < groundY ) {
					if( playerPositions[playerId].y + fallSpeed > groundY ) {
						playerPositions[playerId].y = groundY;
					} else {
						playerPositions[playerId].y += fallSpeed;	
					}
				fallSpeed++;    
			} else {
				fallStop();    
			}					
		}
	};
	
	/////// physics / end /////
	
	

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
	var getCSSPropertyPrefix = function(property) {
		var prefixes = {'Moz':'-moz-', 'Ms':'-ms-', 'Webkit':'-webkit-', 'O':'-o-'};
		for( var key in prefixes ) {
			if (typeof document.body.style[key+property] !== 'undefined') {
				return prefixes[key];
			}
		}
		return null;
	};

	var moveObject = function(object, x, y) { //we change 'movePlayer' to 'moveObject' with object as additional parameter  
		if (transformSupport === false) {
			object.style.top = y + "px";
			object.style.left = x + "px";
		} else {
			object.style[transformSupport] = 'translate(' + x + 'px, ' + y + 'px)';
		}
	};
	
	var animateObject = function( oneId ) {
		var isMoving = playerIsMoving[oneId];
		var currentTime = +(new Date());
		var diffTime = ~~((currentTime - lastAnimChangeTime[oneId]));
	
		// let's animate the character if any movement is going on
		if( isMoving ) {
			if( animationSupport ) {
				players[oneId].style[animationSupport] =  "move 0.5s linear 0s infinite";
				lastAnimChangeTime[oneId] = currentTime;
			} else if( diffTime >= timeStep ) {
				imageStyle[oneId].top = -1*playerPositions[oneId].height * actualFrame[oneId] + 'px';     
				if (actualFrame[oneId] == frames) {  
					actualFrame[oneId] = 0;  
				} else {  
					actualFrame[oneId]++;  
				}
				lastAnimChangeTime[oneId] = currentTime;
			}
		} else if( animationSupport && diffTime >= timeStep ) {
			players[oneId].style[animationSupport] =  "none";
			lastAnimChangeTime[oneId] = currentTime;			
		}
	};

	
	
	// cross browser event listening
	var addEventListener = function( element, event, callee ) {
		if( element.addEventListener ) {
			element.addEventListener( event, callee, false );	
		} else if( element.attachEvent ) { // IE event attachment
			element.attachEvent( event, callee );	
		}
	};
	

	var checkCollision = function(object1, object2) { //return 'true' if colliding, 'false' if not.  
		
		if (!(    
			(object1.y > object2.y+object2.height) ||    // 1 hits 2 from under
			(object1.y+object1.height < object2.y) ||    // 1 hits 2 from top
			(object1.x > object2.x+object2.width) ||     // 1 hits 2 from right
			(object1.x+object1.width < object2.x)        // 1 hits 2 from left
		)){

			return true;    
		}    
		return false;    
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
	
	
	var mainLoop = function() {
//		MeasureFPS();

		
		//update player position on each frame  
		if (states.left) {  
			playerPositions[playerId].x -= step;  
		} else if (states.right) {  
			playerPositions[playerId].x += step;
		}
		if (states.up) {
			jump();
		}
		
		
		checkJump();    
		checkFall();
		
		playerIsMoving[playerId] = isJumping || isFalling || states.left || states.right;

		
		var thisPlayer = playerPositions[playerId];
		if (checkCollision(thisPlayer, platformPosition)) {        
			if( isFalling ) {
				if( thisPlayer.y + thisPlayer.height > platformPosition.y ) {
					thisPlayer.y = platformPosition.y - thisPlayer.height;
				}
				fallStop();
			} else if( thisPlayer.y + thisPlayer.height > platformPosition.y ) {
				// player is below the platform, let's prevent him in going through it
				if( states.left ) {
					thisPlayer.x = platformPosition.x + platformPosition.width;
				} else if( states.right ) {
					thisPlayer.x = platformPosition.x - thisPlayer.width;
				}			
			}
		} else if( thisPlayer.y < groundY && false == isJumping ) {
			// let's make sure the player falls when going off the edge of a platform
			isFalling = true;
		}
		
		for( var oneId in playerPositions ) {
			var onePlayer = playerPositions[oneId];
			// let's check if this one player is colliding with any other
			for( var anotherId in playerPositions ) {
				if( anotherId != oneId ) {
					var anotherPlayer = playerPositions[anotherId];
					
					if( checkCollision(onePlayer, anotherPlayer) ) {
						if( onePlayer.x >= anotherPlayer.x ) {
							onePlayer.x = anotherPlayer.x + anotherPlayer.width + 1;
						} else if( onePlayer.x + onePlayer.width > anotherPlayer.x ) {
							onePlayer.x = anotherPlayer.x - onePlayer.width - 1;
						}
					}
				}
			}
				
			moveObject(players[oneId], playerPositions[oneId].x, playerPositions[oneId].y);
			
			animateObject( oneId );
		}
		
		loop(mainLoop);
	};
	

	var sendMoves = function() {

		Connect("GET", "/move/", {
			id : playerId,
			x : playerPositions[playerId].x,
			y : playerPositions[playerId].y
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

	
	var createPlayer = function( oneId, onePos ) {
		lastAnimChangeTime[oneId] = +(new Date());
		
		playerPositions[oneId] = {};
		playerPositions[oneId].x = parseInt(onePos.x);
		playerPositions[oneId].y = parseInt(onePos.y);
		playerPositions[oneId].width = defaultPlayerPosition.width;
		playerPositions[oneId].height = defaultPlayerPosition.height;
		
		players[oneId] = mainScreen.appendChild(document.createElement('div'));
		players[oneId].id = 'player'+oneId;
		players[oneId].className = 'player';
		
		if( animationSupport ) {
			var propertyPrefix = getCSSPropertyPrefix( 'Animation' );
			var animStyle = document.createElement('style');  
			animStyle.innerHTML = constructAnimationClass(propertyPrefix, 'move', 3, 90);  
			document.getElementsByTagName('head')[0].appendChild(animStyle);  
			players[oneId].style.backgroundImage = "url('odys.png')"; 
		} else { //  div with overflow:hidden fallback
			
			actualFrame[oneId] = 0;
			image[oneId] = document.createElement('img');
			image[oneId].src = 'odys.png';
			imageStyle[oneId] = image[oneId].style;
			
			players[oneId].appendChild( image[oneId] );
			canvasStyle = players[oneId].style;
			imageStyle[oneId].position = "absolute";

			canvasStyle.overflow = "hidden";
			canvasStyle.width = playerPositions[oneId].width + 'px';  
			canvasStyle.height = playerPositions[oneId].height; + 'px';
			imageStyle[oneId].top = 0;  
			imageStyle[oneId].left = 0;  
		}
	};
	
	var bye = function() {
		Connect("GET", "/bye/",  { id : playerId });
	};
	
	
	var start = function() {

		//features detection  
		transformSupport = detectPropertyPrefix('Transform');
		animationSupport = detectPropertyPrefix('Animation');
		
		
		mainScreen = document.createElement('div');
		document.body.appendChild(mainScreen);
/*
		fpsContainer = document.createElement('div');
		document.body.appendChild(fpsContainer);
*/		
		//create platform    
		platform = document.body.appendChild(document.createElement('div'));    
		platform.id = 'platform';    
		platform.style.width = platformPosition.width + "px";    
		platform.style.height = platformPosition.height + "px";    
		moveObject(platform, platformPosition.x, platformPosition.y);
		
		
		playerId = ~~(Math.random() * 87236584);

		Connect("GET", "/hello/", {
			id : playerId
		}, function(data) {
			for( var oneId in data ) {
				
				createPlayer( oneId, data[oneId] );					
			}
			
			setInterval(sendMoves, 1000 / 30 );

			setInterval(function() {
				getMoves(function(data) {
					for( oneId in data ) {
						if( oneId != playerId ) { // let's not allow the server to tell where we are, for now
							if( ! playerPositions[oneId] ) {
								createPlayer( oneId, data[oneId] );
							}
							var inX = parseInt(data[oneId].x);
							var inY = parseInt(data[oneId].y);
							if( playerPositions[oneId].x != inX || playerPositions[oneId].y != inY ) {
								playerIsMoving[oneId] = true;
							} else {
								playerIsMoving[oneId] = false;
							}
							playerPositions[oneId].x = inX;
							playerPositions[oneId].y = inY;						
						}
					}
					// let's check if someone has exited - TODO: optimize!
					for( var oneId in playerPositions ) {
						if( ! data[oneId] ) {
							mainScreen.removeChild( players[oneId] );
							delete playerPositions[oneId];
						}
					}
				});
			}, 1000 / 30 );
			
			
			loop(mainLoop);

		});


		
		// add the listener to the main, window object, and update the states
		addEventListener( window, 'keydown', function(event) {
			if (event.keyCode === 37) {
				states.left = true;
			} else if (event.keyCode === 38) {
				states.up = true;
			} else if (event.keyCode === 39) {
				states.right = true;
			} else if (event.keyCode === 40) {
				states.down = true;
			}
		} );

		// if the key will be released, change the states object
		addEventListener( window, 'keyup', function(event) {
			if (event.keyCode === 37) {
				states.left = false;// 
			} else if (event.keyCode === 38) {
				states.up = false;
			} else if (event.keyCode === 39) {
				states.right = false;
			} else if (event.keyCode === 40) {
				states.down = false;
			}
		} );


		
		window.onbeforeunload = bye;
		window.onunload = bye;

	};

	//our GameFramework returns public API visible from outside scope  
	return {
		start : start
	};
};

var game = new GF();
game.start();