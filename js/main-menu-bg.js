function showMenuBackground() {
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
	$('#main_page .ui-content').css('background', "transparent url('" + backgroundImage + "') repeat");
}