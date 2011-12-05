


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
	accelerometerInfo = null,
	
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
	}, 
	// mobile behaviour
	lastYtilt = null;
	
//	var socket = io.connect('http://localhost:1337/');
	var socket = new EasyWebSocket("ws://bthj.is/HTML5-Games_Oct11");
	
	
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
			playerPositions[playerId].x -= step * states.stepWeight;  
		} else if (states.right) {  
			playerPositions[playerId].x += step * states.stepWeight;
		}
		if (states.up) {
			jump();
		}
		
		
		checkJump();    
		checkFall();

		
		var wasMoving = playerIsMoving[playerId];
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
//				if( navigator ) {
//					navigator.notification.vibrate(250);
//				}
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
					
					if( playerIsMoving[oneId] && checkCollision(onePlayer, anotherPlayer) ) {
						if( onePlayer.x >= anotherPlayer.x ) {
							onePlayer.x = anotherPlayer.x + anotherPlayer.width + 1;
						} else if( onePlayer.x + onePlayer.width > anotherPlayer.x ) {
							onePlayer.x = anotherPlayer.x - onePlayer.width - 1;
						}
						if( typeof(PhoneGap) != 'undefined' ) {
							navigator.notification.vibrate(500);
						}
					}
				}
			}
				
			moveObject(players[oneId], playerPositions[oneId].x, playerPositions[oneId].y);
			
			animateObject( oneId );
		}
		
		loop(mainLoop);
		
		if( wasMoving || playerIsMoving[playerId] ) {  // so all clients will stop animating the sprite
			/*
			 * sending here via socket doesn't seem to be asynchronous and affects the loop,
			 * so propbably it's better to do this via setInterval()
			 */
			sendMoves();
		}
	};
	

	var sendMoves = function() {

		socket.send({
			id : playerId,
			x : playerPositions[playerId].x,
			y : playerPositions[playerId].y
		});
	};
	
	socket.onmessage = function(event) {
		if( event.data.id != playerId ) {

			if( event.data.bye ) {
				mainScreen.removeChild( players[event.data.id] );
				delete playerPositions[event.data.id];
			} else if( ! playerPositions[event.data.id] ) {
				createPlayer( event.data.id, {x: event.data.x, y: event.data.y} );
				sendMoves();
			}
			if( playerPositions[event.data.id].x != event.data.x || 
					playerPositions[event.data.id].y != event.data.y ) {
				playerIsMoving[event.data.id] = true;
			} else {
				playerIsMoving[event.data.id] = false;
			}
			playerPositions[event.data.id].x = event.data.x;
			playerPositions[event.data.id].y = event.data.y;
		}
	};
	

	
	var createPlayer = function( oneId, onePos ) {
		lastAnimChangeTime[oneId] = +(new Date());
		
		playerPositions[oneId] = {};
		playerPositions[oneId].x = parseInt(onePos.x, 10);
		playerPositions[oneId].y = parseInt(onePos.y, 10);
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
		
		socket.send({
			id : playerId,
			bye : "true"
		});
		
		socket.close();
	};
	
	
	var setAccelerometerInfo = function( info ) {
		accelerometerInfo.innerHTML = info;
	};
	
	var setLeftState = function( state ) {
		states.left = state;
	};
	var setRightState = function( state ) {
		states.right = state;
	};
	var setUpState = function( state ) {
		states.up = state;
	}
	

	
	var start = function( ) {
		
		loadingMessage = document.body.appendChild(document.createElement('h1'));
		loadingMessage.innerHTML = "Loading...";

		//features detection  
		transformSupport = detectPropertyPrefix('Transform');
		animationSupport = detectPropertyPrefix('Animation');
		
		
		mainScreen = document.createElement('div');
		document.body.appendChild(mainScreen);
/*
		fpsContainer = document.createElement('div');
		document.body.appendChild(fpsContainer);
*/
		accelerometerInfo = document.createElement('span');
		document.body.appendChild(accelerometerInfo);

		
		//create platform    
		platform = document.body.appendChild(document.createElement('div'));    
		platform.id = 'platform';    
		platform.style.width = platformPosition.width + "px";    
		platform.style.height = platformPosition.height + "px";    
		moveObject(platform, platformPosition.x, platformPosition.y);

		
		// add the listener to the main, window object, and update the states
		addEventListener( window, 'keydown', function(event) {
			if (event.keyCode === 37) {
				states.left = true;
				states.stepWeight = 1;
			} else if (event.keyCode === 38) {
				states.up = true;
			} else if (event.keyCode === 39) {
				states.right = true;
				states.stepWeight = 1;
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
		
//		addEventListener( window, 'mousedown', function(event) {
//			jump();
//		});
		addEventListener( window, 'click', function(event) {
			jump();
		});
		
		window.onbeforeunload = bye;
//		window.onunload = bye;
//		socket.onclose = bye;
		
		
		playerId = ~~(Math.random() * 87236584);
		
		createPlayer( playerId, {x: defaultPlayerPosition.x, y: defaultPlayerPosition.y} );
		
		socket.onopen = function() {
			document.body.removeChild( loadingMessage );
			sendMoves();
		};
		
/*		
		setInterval(function(){
			if( playerIsMoving[playerId] ) {
				sendMoves();
			}
		}, 1000 / 60 );
*/
		
		
		if( typeof(PhoneGap) != 'undefined' ) {
			
			navigator.accelerometer.watchAcceleration(  
				function(tilt){ //success  
					
					if( tilt.x > 1.0 ) {
						states.left = true;
						states.right = false;
						states.stepWeight = tilt.x / 2;
					} else if( tilt.x < -1.0 ) {
						states.right = true;
						states.left = false;
						states.stepWeight = Math.abs(tilt.x / 2);
					} else {
						states.left = false;
						states.right = false;
						states.stepWeight = 1;
					}
					
					if( lastYtilt == null ) lastYtilt = tilt.y;
					if( Math.abs(lastYtilt - tilt.y) > 2.0 ) {
						setUpState( true );
						lastYtilt = tilt.y;
					} else {
						setUpState( false );
					}
					
//					setAccelerometerInfo( "tilt.y: " + tilt.y + ", <br />lastYtilt: " + lastYtilt + ", <br />stepWeight: " + states.stepWeight );
				},  
				function(){ //failure  
					alert('NEWFAGS CANT TRIFORCE');  
				},  
				{ //options  
					frequency: 100  
				});
		}
		
		
		loop(mainLoop);
	};

	//our GameFramework returns public API visible from outside scope  
	return {
		start : start,
		setAccelerometerInfo : setAccelerometerInfo,
		setLeftState : setLeftState,
		setRightState : setRightState,
		setUpState : setUpState
	};
};

document.addEventListener("deviceready", function () {  
	
	var game = new GF();
	game.start();
	
}, false );
