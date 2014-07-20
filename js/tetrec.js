// Game configurable defaults
var cell_width = 20;
var cell_height = 20;
var cols_count = 10;
var rows_count = 20;

var colors = {
	cupBackground : 'rgba(125, 125, 125, 0.6)',
	cupGrid : '#336699',
	figure : '#336699',
	cupContent : '#000000',
	nextFigureShadow : 'rgba(125, 125, 125, 0.9)'
};

var strings;

var pageContentHeight;

var canvas;
var canvas_width, canvas_height;
var context;
var glass = [];
var figures;
var figure = [];
var figure_x;
var figure_y;
var figure_type;
var figure_position;
var next_figure_type = Math.floor(Math.random() * 7);
var next_figure_position = Math.floor(Math.random() * 4);

var interval = 1000;
var down_timer;

// touch control related properties
var directions = {
	NONE : -1,
	TURN : 0,
	RIGHT : 1,
	DOWN : 2,
	LEFT : 3
}

var touching = false;
var touch_move_threshold = 10;
var touch_move_down_threshold = 30;
var touch_move_turn_threshold = 50;
var oldPageX;
var oldPageY;
var touchMoveLastTimestamp = 0;
var touchMoveInterval = 20;
var moveFigureLastTimestamp = 0;
var moveFigureInterval = 50;
var turnFigureLastTimestamp = 0;
var turnFigureInterval = 200;
var direction = directions.NONE;
var moveFigureRequestId = 0;

var count = 0;
var level = 0;
var playing = false;

var sceneToBeUpdated = false;

function adjustPageContentHeight() {
	var screen = $.mobile.getScreenHeight();
	var header = 0;
	if ($(".ui-header").length > 0) {
		header = $(".ui-header").hasClass("ui-header-fixed") ? $(".ui-header").outerHeight() - 1 : $(".ui-header").outerHeight();
	}
    contentCurrent = $(".ui-content").outerHeight() - $(".ui-content").height();
    var footer = 0;
    if ($(".ui-footer").length > 0) {
    	footer = $(".ui-footer").hasClass("ui-footer-fixed") ? $(".ui-footer").outerHeight() - 1 : $(".ui-footer").outerHeight();
    }
    pageContentHeight = screen - header - footer - contentCurrent;
	$(".ui-content").height(pageContentHeight);
}

function adjustCanvasHeight() {
	canvas_height = pageContentHeight * 0.99;
	canvas_width = canvas_height / 2;	
	canvas.height = canvas_height;
	canvas.width = canvas_width;
	// Calculate cell dimensions
	cell_width = canvas_width / cols_count;
	cell_height = canvas_height / rows_count;
	/*console.log("cell width: " + cell_width + ", cell height: " + cell_height + 
		", canvas width: " + canvas_width + ", canvas height: " + canvas_height);*/
	console.log("adjusting canvas size!");
}

//$(document).on("pagecontainertransition", adjustPageContentHeight);
$(window).on("orientationchange", function() {
	adjustPageContentHeight();
	adjustCanvasHeight();
}); // TODO: decide what to do on orientation change (landscape mode on smartphone)
$(window).on("resize", function() {
	adjustPageContentHeight();
	adjustCanvasHeight();
});

$( document ).on( "pagecontainershow", function( event, ui ) {
	console.log("Page was changed");
	adjustPageContentHeight();
	var activePageId = $( "body" ).pagecontainer( "getActivePage" ).attr('id');
	setBackground($('#' + activePageId + ' .ui-content'));
	if (activePageId === "tetrec_page") {
		console.log("Staring new game");
		canvas = document.getElementById('tetrec_canvas');
		context = canvas.getContext('2d');
		adjustCanvasHeight();
		prepareGame();
	}
});

function prepareVariables() {
	touching = false;
	direction = directions.NONE;
	// Clear cup content
	for (i = 0; i < cols_count; i++) {
		glass[i] = [];
		for (j = 0; j < rows_count; j++) {
			glass[i][j] = 0;
		}
	}
}

function prepareTranslation() {
	var lang = (navigator.language || navigator.userLanguage).substring(0, 2);
	if (i18n.hasOwnProperty(lang)) {
		strings = i18n[lang];
	} else {
		strings = i18n.en;
	}
}

$('#gameButton').tap(function(event) {
	endGame();
	startGame();
});

function prepareGame() {
	disableTextSelection();
	prepareTranslation();
	// Translate UI strings
	$('#linesCaption').text(strings.lines);
	$('#levelCaption').text(strings.level);
	$('h1 #tetrecPageHeader').text(strings.tetrec);
	endGame();
	prepareFigures();
	$('#tetrec_canvas').attr("tabindex", "0");
	startGame();
}

function startGame() {
	prepareVariables();
	$('#tetrec_canvas').blur(pauseGame).focus(unpauseGame);
	generateFigureTypeAndPosition();
	count = 0;
	level = 0;
	interval = 1000;
	$('#lines').html(count);
	$('#level').html(level);
	drawScene();
	playing = true;
	$('#tetrec_canvas').focus();
}

function endGame() {
	pauseGame();
	$('#tetrec_canvas')
		.unbind('focus')
		.unbind('blur')
		//.unbind('keydown')
		//.unbind('mousemove')
	playing = false;
	clearTimeout(down_timer);
	down_timer = 0;
	drawBackground();
}

function pauseGame() {
	clearTimeout(down_timer);
	cancelAnimationFrame(moveFigureRequestId);
	moveFigureRequestId = 0;
	down_timer = 0;
	$('#tetrec_canvas')
		.focus(unpauseGame)
		.unbind('mousemove')
		.unbind('keydown');
	$( document ).off ( "vmousemove", "#tetrec_canvas" );
	$( document ).off ( "vmousedown", "#tetrec_canvas" );
	$( document ).off ( "vmouseup", "#tetrec_canvas" );
	$( document ).off ( "vmouseout", "#tetrec_canvas" );
	$('h1 #tetrecPageHeader').text(strings.paused);
}

function unpauseGame() {
	$('#tetrec_canvas')
		.unbind('focus')
		.keydown(onKeyDown);
	$( document ).on ( "vmousemove", "#tetrec_canvas", onTouchMove );
	$( document ).on ( "vmousedown", "#tetrec_canvas", onTouchStart );
	$( document ).on ( "vmouseup", "#tetrec_canvas", onTouchEnd );
	$( document ).on ( "vmouseout", "#tetrec_canvas", onTouchOut );
	$('h1 #tetrecPageHeader').text(strings.tetrec);
	if (down_timer == 0) {
		down_timer = setTimeout(processGame, interval);
	}
}

function prepareFigures() {
	figures = []; // 7 figure types
	for (i = 0; i < 7; i++) {
		figures[i] = [];
	}

	// Line figure
	figures[0][0] = figures[0][2] = [[1,0], [1,1], [1,2], [1,3]];
	figures[0][1] = figures[0][3] = [[0,1], [1,1], [2,1], [3,1]];

	// Square figure
	figures[1][0] = figures[1][1] = figures[1][2] = figures[1][3]
		= [[0,0], [1,0], [0,1], [1,1]];

	// L-figure
	figures[2][0] = [[0,0], [0,1], [0,2], [1,2]];
	figures[2][1] = [[0,0], [1,0], [2,0], [0,1]];
	figures[2][2] = [[0,0], [1,0], [1,1], [1,2]];
	figures[2][3] = [[2,0], [2,1], [1,1], [0,1]];

	// Z-figure
	figures[3][0] = figures[3][2] = [[1,0], [1,1], [0,1], [0,2]];
	figures[3][1] = figures[3][3] = [[0,0], [1,0], [1,1], [2,1]];

	// T-figure
	figures[4][0] = [[1,0], [1,1], [1,2], [2,1]];
	figures[4][1] = [[0,1], [1,1], [2,1], [1,2]];
	figures[4][2] = [[1,0], [1,1], [1,2], [0,1]];
	figures[4][3] = [[0,1], [1,1], [2,1], [1,0]];

	// Г-figure
	figures[5][0] = [[1,0], [1,1], [1,2], [0,2]];
	figures[5][1] = [[0,0], [0,1], [1,1], [2,1]];
	figures[5][2] = [[1,0], [0,0], [0,1], [0,2]];
	figures[5][3] = [[0,0], [1,0], [2,0], [2,1]];

	// S-figure
	figures[6][0] = figures[6][2] = [[0,0], [0,1], [1,1], [1,2]];
	figures[6][1] = figures[6][3] = [[2,0], [1,0], [1,1], [0,1]];
}

function generateFigureTypeAndPosition() {
	figure_type = next_figure_type;
	figure_position = next_figure_position;
	next_figure_type = Math.floor(Math.random() * 7);
	next_figure_position = Math.floor(Math.random() * 4);
	figure_x = 4;
	figure_y = 0;
}

function onKeyDown(event) {
	event.preventDefault();
	switch (event.keyCode) {
		case 32: dropFigure(); break;
		case 37: moveLeft(); break;
		case 38: turn(); break;
		case 39: moveRight(); break;
		case 40: moveDown(); break;
	}
	if (sceneToBeUpdated) drawScene();
	return false;
}

function onTouchMove(event) {
	event.preventDefault();
	if (!touching) return;
	var currentTimestamp = new Date().getTime();
	if (currentTimestamp - touchMoveLastTimestamp < touchMoveInterval) return;
	var xDiff = event.clientX - oldPageX;
	var yDiff = event.clientY - oldPageY;
	// check if we can register move direction
	if (direction != directions.RIGHT && xDiff > touch_move_threshold) {
		direction = directions.RIGHT;
	} 
	if (direction != directions.LEFT && xDiff < -touch_move_threshold) {
		direction = directions.LEFT;
	}

	if (direction != directions.DOWN && yDiff > touch_move_down_threshold) {
		direction = directions.DOWN;
	}
	if (direction != directions.TURN && yDiff < -touch_move_turn_threshold) {
		direction = directions.TURN;
	}
	touchMoveLastTimestamp = currentTimestamp;
}

function moveFigure() {
	var currentTimestamp = new Date().getTime();
	if (currentTimestamp - moveFigureLastTimestamp > moveFigureInterval) {
		if (direction != directions.NONE) {
			switch (direction) {
				case directions.DOWN: moveDown(); break;
				case directions.LEFT: moveLeft(); break;
				case directions.RIGHT: moveRight(); break;
			}
			if (sceneToBeUpdated) drawScene();
		}
		moveFigureLastTimestamp = currentTimestamp;
	}
	if (currentTimestamp - turnFigureLastTimestamp > turnFigureInterval && direction == directions.TURN) {
		turn();
		drawScene();
		turnFigureLastTimestamp = currentTimestamp;
	}
	moveFigureRequestId = requestAnimationFrame(moveFigure, $('#tetrec_canvas'));
}

function onTouchStart(event) {
	if (!touching) {
		oldPageX = event.clientX;
		oldPageY = event.clientY;
		touching = true;
		//cancelAnimationFrame(moveFigureRequestId);
		moveFigureRequestId = requestAnimationFrame(moveFigure, $('#tetrec_canvas'));
	}
}

function onTouchEnd(event) {
	if (touching) {
		cancelAnimationFrame(moveFigureRequestId);
		moveFigureRequestId = -999;
		direction = directions.NONE;
		touching = false;
	}
}

function onTouchOut(event) {
	// TODO: maybe need to trigger move event to perform the final move?
	$('#tetrec_canvas').trigger('vmouseup');
}

function dropFigure() {
	// Get figure copy
	for (i = 0; i < 4; i++) {
		figure[i] = figures[figure_type][figure_position][i].slice(0);
		figure[i][0] += figure_x;
		figure[i][1] += figure_y;
	}
	// TODO: remember what this code does and add comments with the details
	the_highest_places = [rows_count - 1, rows_count - 1, rows_count - 1, rows_count - 1];
	for (i = 0; i < 4; i++) {
		for (j = figure[i][1]; j < rows_count; j++) {
			if (glass[figure[i][0]][j] == 1) {
				the_highest_places[i] = j - figure[i][1] - 1;
				break;
			}
		}
		the_highest_places[i] = j - figure[i][1] - 1;
	}
	min_height = Math.min(the_highest_places[0], the_highest_places[1], the_highest_places[2], 
		the_highest_places[3]);
	figure_y += min_height;
	checkIfDropped();
	sceneToBeUpdated = true;
}

function turn() {
	temp_figure_position = figure_position;
	temp_figure_position++;
	if (temp_figure_position > 3) {
		temp_figure_position = 0;
	}
	for (i = 0; i < 4; i++) {
		figure[i] = figures[figure_type][temp_figure_position][i].slice(0);
		figure[i][0] += figure_x;
		figure[i][1] += figure_y;
		if (glass[figure[i][0]][figure[i][1]] == undefined || glass[figure[i][0]][figure[i][1]] == 1) {
			return false;
		}
	}
	figure_position = temp_figure_position;
	sceneToBeUpdated = true;
}

function moveLeft() {
	for (i = 0; i < 4; i++) {
		figure[i] = figures[figure_type][figure_position][i].slice(0);
		figure[i][0] += figure_x;
		figure[i][1] += figure_y;
		if (figure[i][0] - 1 < 0 || glass[figure[i][0] - 1][figure[i][1]] == 1) {
			return;
		}
	}
	figure_x--;
	sceneToBeUpdated = true;
}

function moveRight() {
	for (i = 0; i < 4; i++) {
		figure[i] = figures[figure_type][figure_position][i].slice(0);
		figure[i][0] += figure_x;
		figure[i][1] += figure_y;
		if (figure[i][0] + 1 >= cols_count || glass[figure[i][0] + 1][figure[i][1]] == 1) {
			return;
		}
	}
	figure_x++;
	sceneToBeUpdated = true;
}

function moveDown() {
	checkIfDropped();
	figure_y++;
	sceneToBeUpdated = true;
}

function checkIfDropped() {
	dropped = false;
	for (i = 0; i < 4; i++) {
		figure[i] = figures[figure_type][figure_position][i].slice(0);
		figure[i][0] += figure_x;
		figure[i][1] += figure_y;
		// End game if cup is filled
		if (glass[figure[i][0]][figure[i][1]] == undefined || glass[figure[i][0]][figure[i][1]] == 1) {
			endGame();
			return false;
		}
		else if (glass[figure[i][0]][figure[i][1]+1] == 1 || figure[i][1]+1 >= rows_count) {
			dropped = true;
		}
	}
	if (dropped) {
		// Add fallen figure to cup content
		for (i = 0; i < 4; i++) {
			glass[figure[i][0]][figure[i][1]] = 1;
		}
		// Check if line is filled
		for (j = rows_count - 1; j > 0; j--) {
			line_filled = true;
			for (i = 0; i < cols_count; i++) {
				if (glass[i][j] != 1) {
					line_filled = false;
				}
			}
			if (line_filled) {
				for (k = j; k > 0; k--) {
					for (i = 0; i < cols_count; i++) {
						glass[i][k] = glass[i][k-1];
					}
				}
				for (i = 0; i < cols_count; i++) {
					glass[i][0] = 0;
				}
				j++;
				count++;
				if (count % 20 == 0) {
					level++;
					if (interval > 100) {
						clearTimeout(down_timer);
						interval = 1000 - level * 100;
						down_timer = setTimeout(processGame, interval);
					}
				}
				$('#lines').html(count);
				$('#level').html(level);
			}
		}
		// Generate new figure and its position
		generateFigureTypeAndPosition();
	}
}

function processGame() {
	if (playing) {
		moveDown();
		drawScene();
		clearTimeout(down_timer);
		down_timer = setTimeout(processGame, interval);
	}
}

function drawBackground() {
	console.log("drawing bg");
	// Fill the cup with background color
	context.fillStyle = colors.cupBackground;
	context.fillRect(0, 0, $('#tetrec_canvas').width(), $('#tetrec_canvas').height());
	// Draw cup grid
	context.strokeStyle = colors.cupGrid;
	context.lineWidth = 1;
	var x = cell_width, y = 0;
	for (i = 1; i < cols_count; i++) {
		context.beginPath();
		context.moveTo(x * i, 0);
		context.lineTo(x * i, $('#tetrec_canvas').height());
		context.stroke();
	}
	x = 0; y = cell_height;
	for (i = 1; i < rows_count; i++) {
		context.beginPath();
		context.moveTo(0, y * i);
		context.lineTo($('#tetrec_canvas').width(), y * i);
		context.stroke();
	}
}

function drawScene() {
	console.log("drawing scene");
	// Clear the scene
	context.clearRect(0, 0, $('#tetrec_canvas').width(), $('#tetrec_canvas').height());
	// Draw background
	drawBackground();
	// Draw cup content
	context.fillStyle = colors.cupContent;
	for (i = 0; i < cols_count; i++) {
		for (j = 0; j < rows_count; j++) {
			if (glass[i][j] == 1) {
				context.fillRect(i * cell_width, j * cell_height, cell_width, cell_height);
			}
		}
	}
	// Draw next figure shadow
	context.fillStyle = colors.nextFigureShadow;
	next_figure = [];
	for (i = 0; i < 4; i++) {
		next_figure[i] = figures[next_figure_type][next_figure_position][i].slice(0);
		context.fillRect((next_figure[i][0] + 4) * cell_width, next_figure[i][1] * cell_height, cell_width, cell_height);
	}
	// Draw current figure
	context.fillStyle = colors.figure;
	for (i = 0; i < 4; i++) {
		figure[i] = figures[figure_type][figure_position][i].slice(0);
		context.fillRect((figure[i][0] + figure_x) * cell_width, (figure[i][1] + figure_y) * cell_height, cell_width, cell_height);
	}
	sceneToBeUpdated = false;
}

function disableTextSelection() {
	$('body, #tetrec_canvas').attr('unselectable','on')
     .css({'-moz-user-select':'-moz-none',
           '-moz-user-select':'none',
           '-o-user-select':'none',
           '-khtml-user-select':'none', /* you could also put this in a class */
           '-webkit-user-select':'none',/* and add the CSS class here instead */
           '-ms-user-select':'none',
           'user-select':'none'
     }).bind('selectstart', function(){ return false; });
}

function setBackground($selector) {
	var squareWidth = 20;
	var squareHeight = 20;
	var canvasWidth = 100;
	var canvasHeight = 100;
	var squaresInRow = canvasWidth / squareWidth;
	var squaresInColumn = canvasHeight / squareHeight;
	var canvas = document.createElement("canvas");
	canvas.width = canvasWidth;
	canvas.height = canvasHeight;
	var context = canvas.getContext('2d');
	//first we clear the canvas
	context.clearRect(0, 0, canvasWidth, canvasHeight);
	//setup the palette array
	var grayPalette = ["#aaaaaa","#bbbbbb","#cccccc","#dddddd","#eeeeee"];

	//create 10x10 squares
	for (var i = 0; i < squaresInRow; i++) {
		for(var j = 0; j < squaresInColumn; j++) {
			//indicate when starting drawing a rectangle
			context.beginPath();
			context.rect(0 + squareHeight * j, 0 + squareWidth * i, squareHeight, squareWidth);

			//choose a random color from the palette
			var randomColorIndex = Math.round(Math.random() * (grayPalette.length-1));
			context.fillStyle = grayPalette[randomColorIndex];

			//fill the rectangle with the selected color
			context.fill();

			//draw a white border for the rectangle
			context.strokeStyle = "#ffffff";
			context.stroke();

			//indicating when finished drawing the rectangle
			context.closePath();
		}
	}

	var backgroundImage = canvas.toDataURL();
	$selector.css('background', "transparent url('" + backgroundImage + "') repeat");
}