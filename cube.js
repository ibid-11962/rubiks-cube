"use strict";

var canvas;
var gl;

var points = [];
var colors = [];

var cube = Array.from({length: 27}, (v, k) => k); //positions
var theta = Array(27).fill().map(() => mat4());  //subcube rotation states
var dtheta = Array(27).fill().map(() => mat4());  //subcube velocities
var speed= 2.5;
var newspeed=2.5;
var scrams=0;

var isSpin = 0;
var spin = 0;

var drag = false;
var old_x, old_y;
var dX = 0, dY = 0;

var click1,click2;

//set initial viewing angle
var modelViewMatrix = mat4();
modelViewMatrix = mult(modelViewMatrix,rotateX(30));
modelViewMatrix = mult(modelViewMatrix,rotateY(-40));

var program;


// Shader transformation matrices

var modelViewMatrix, projectionMatrix;

var modelViewMatrixLoc;

var rots = [	//list of possible rotations
[0,1,2,5,8,7,6,3,4,0],
[9,10,11,14,17,16,15,12,13,0],
[18,19,20,23,26,25,24,21,22,0],
[0,3,6,15,24,21,18,9,12,1],
[1,4,7,16,25,22,19,10,13,1],
[2,5,8,17,26,23,20,11,14,1],
[9,18,19,20,11,2,1,0,10,2],
[12,21,22,23,14,5,4,3,13,2],
[15,24,25,26,17,8,7,6,16,2]];

window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    colorCube(); //push all the vertices to points and colors 

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

    gl.enable(gl.DEPTH_TEST);
	
    //  Load shaders and initialize attribute buffers

	program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    var cBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );

    var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );

    var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );


    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );
	
	document.getElementById("winwin").style.visibility = "hidden" //hide win text on startup
	document.getElementById("currentState").value=JSON.stringify([theta,cube]);	//set textbox to initial state
	
    //event listeners

	var slider = document.getElementById("myRange");
	slider.oninput = function() {
		newspeed = [.36,.5,.6,.75,1,1.2,1.5,1.8,2,2.5,3,3.6,4.5,6,7.5,15,18,30,90][this.value]; //all values chosen to divide a 90 degree turn into a whole number of frames
	}
	document.getElementById( "scram" ).onclick = function () {
        scrams = document.getElementById("scramNum").value;
    };
	document.getElementById( "load" ).onclick = function () {
		for (var i=0;i<27;i++) {
			for (var j=0;j<4;j++) {
				for (var k=0;k<4;k++){
					theta[i][j][k]=JSON.parse(document.getElementById( "currentState" ).value)[0][i][j][k];
					}
			}
		}
		cube=JSON.parse(document.getElementById( "currentState" ).value)[1].slice(0);
    };
	
    render();
	
	canvas.addEventListener("mousedown", function() {
		if (event.which ==1){
			click1 = selection();		
			
		} else if (event.which ==3){
			drag = true;
			old_x = event.pageX, old_y = event.pageY;
			event.preventDefault();
			return false;
		}
	});
	canvas.addEventListener("mouseup", function(){
		if (event.which ==1) {
			click2 = selection();
			console.log(click1,click2);
			
			for (var x=0;x<9;x++) {
				if (Math.floor(x/3)==click1[0]) //ignore any turns about an axis normal to the face clicked
					continue;
				for (var i=0;i<8;i++) { //iterate through all possible turns
					if (click1[1]!=rots[x][i])
						continue
					if (click2[1]==rots[x][(i+1)%8] || click2[1]==rots[x][(i+2)%8]) {
						rotat(rots[x],0);//turn forwards
						return;
					} else if (click2[1]==rots[x][(i+7)%8] || click2[1]==rots[x][(i+6)%8]) {
						rotat(rots[x],1);//turn backwards
						return;
					}
				}
			}			
			
		} else if (event.which ==3){
			drag = false;
		}
	});
	canvas.addEventListener("mouseout", function(){
		if (event.which ==3){
			drag = false;
		}
	});
	canvas.addEventListener("mousemove", function() {
		if (event.which ==3){
			if (!drag) return false;
			dX = (event.pageX-old_x)*10*Math.PI/canvas.width,
			dY = (event.pageY-old_y)*10*Math.PI/canvas.height;
			modelViewMatrix=mult(rotateY(dX),modelViewMatrix);
			modelViewMatrix=mult(rotateX(dY),modelViewMatrix);
			old_x = event.pageX, old_y = event.pageY;
			event.preventDefault();
		}
	});

	modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");

    projectionMatrix = ortho(-1.1, 1.1, -1.1, 1.1, -1.1, 1.1);
    gl.uniformMatrix4fv( gl.getUniformLocation(program, "projectionMatrix"),  false, flatten(projectionMatrix) );
	
}

function colorCube()
{
	for (var i = 0; i < 216; i+=8) { //define 6 quads. Repeat per each of the 27 subcubes
		quad( (1+i), (0+i), (3+i), (2+i) );
		quad( (2+i), (3+i), (7+i), (6+i) );
		quad( (3+i), (0+i), (4+i), (7+i) );
		quad( (6+i), (5+i), (1+i), (2+i) );
		quad( (4+i), (5+i), (6+i), (7+i) );
		quad( (5+i), (4+i), (0+i), (1+i) );
	}
}

function quad(a, b, c, d) //pushes a quadrilateral using the indexes of four points in the vertices array
{
    var vertices = [ //list of all 27x8 vertices]
        vec4( -0.59, -0.59,  -0.21, 1.0 ),
        vec4( -0.59,  -0.21,  -0.21, 1.0 ),
        vec4( -0.21,  -0.21,  -0.21, 1.0 ),
        vec4( -0.21, -0.59,  -0.21, 1.0 ),
        vec4( -0.59, -0.59, -0.59, 1.0 ),
        vec4( -0.59,  -0.21, -0.59, 1.0 ),
        vec4( -0.21,  -0.21, -0.59, 1.0 ),
        vec4( -0.21, -0.59, -0.59, 1.0 ),
		
		vec4( -0.59, -0.19,  -0.21, 1.0 ),
        vec4( -0.59,  0.19,  -0.21, 1.0 ),
        vec4( -0.21,  0.19,  -0.21, 1.0 ),
        vec4( -0.21, -0.19,  -0.21, 1.0 ),
        vec4( -0.59, -0.19, -0.59, 1.0 ),
        vec4( -0.59,  0.19, -0.59, 1.0 ),
        vec4( -0.21,  0.19, -0.59, 1.0 ),
        vec4( -0.21, -0.19, -0.59, 1.0 ),
		
		vec4( -0.59, 0.21,  -0.21, 1.0 ),
        vec4( -0.59,  0.59,  -0.21, 1.0 ),
        vec4( -0.21,  0.59,  -0.21, 1.0 ),
        vec4( -0.21, 0.21,  -0.21, 1.0 ),
        vec4( -0.59, 0.21, -0.59, 1.0 ),
        vec4( -0.59,  0.59, -0.59, 1.0 ),
        vec4( -0.21,  0.59, -0.59, 1.0 ),
        vec4( -0.21, 0.21, -0.59, 1.0 ),
		
        vec4( -0.59, -0.59,  0.19, 1.0 ),
        vec4( -0.59,  -0.21,  0.19, 1.0 ),
        vec4( -0.21,  -0.21,  0.19, 1.0 ),
        vec4( -0.21, -0.59,  0.19, 1.0 ),
        vec4( -0.59, -0.59, -0.19, 1.0 ),
        vec4( -0.59,  -0.21, -0.19, 1.0 ),
        vec4( -0.21,  -0.21, -0.19, 1.0 ),
        vec4( -0.21, -0.59, -0.19, 1.0 ),
		
		vec4( -0.59, -0.19,  0.19, 1.0 ),
        vec4( -0.59,  0.19,  0.19, 1.0 ),
        vec4( -0.21,  0.19,  0.19, 1.0 ),
        vec4( -0.21, -0.19,  0.19, 1.0 ),
        vec4( -0.59, -0.19, -0.19, 1.0 ),
        vec4( -0.59,  0.19, -0.19, 1.0 ),
        vec4( -0.21,  0.19, -0.19, 1.0 ),
        vec4( -0.21, -0.19, -0.19, 1.0 ),
		
		vec4( -0.59, 0.21,  0.19, 1.0 ),
        vec4( -0.59,  0.59,  0.19, 1.0 ),
        vec4( -0.21,  0.59,  0.19, 1.0 ),
        vec4( -0.21, 0.21,  0.19, 1.0 ),
        vec4( -0.59, 0.21, -0.19, 1.0 ),
        vec4( -0.59,  0.59, -0.19, 1.0 ),
        vec4( -0.21,  0.59, -0.19, 1.0 ),
        vec4( -0.21, 0.21, -0.19, 1.0 ),

        vec4( -0.59, -0.59,  0.59, 1.0 ),
        vec4( -0.59,  -0.21,  0.59, 1.0 ),
        vec4( -0.21,  -0.21,  0.59, 1.0 ),
        vec4( -0.21, -0.59,  0.59, 1.0 ),
        vec4( -0.59, -0.59, 0.21, 1.0 ),
        vec4( -0.59,  -0.21, 0.21, 1.0 ),
        vec4( -0.21,  -0.21, 0.21, 1.0 ),
        vec4( -0.21, -0.59, 0.21, 1.0 ),
		
		vec4( -0.59, -0.19,  0.59, 1.0 ),
        vec4( -0.59,  0.19,  0.59, 1.0 ),
        vec4( -0.21,  0.19,  0.59, 1.0 ),
        vec4( -0.21, -0.19,  0.59, 1.0 ),
        vec4( -0.59, -0.19, 0.21, 1.0 ),
        vec4( -0.59,  0.19, 0.21, 1.0 ),
        vec4( -0.21,  0.19, 0.21, 1.0 ),
        vec4( -0.21, -0.19, 0.21, 1.0 ),
		
		vec4( -0.59, 0.21,  0.59, 1.0 ),
        vec4( -0.59,  0.59,  0.59, 1.0 ),
        vec4( -0.21,  0.59,  0.59, 1.0 ),
        vec4( -0.21, 0.21,  0.59, 1.0 ),
        vec4( -0.59, 0.21, 0.21, 1.0 ),
        vec4( -0.59,  0.59, 0.21, 1.0 ),
        vec4( -0.21,  0.59, 0.21, 1.0 ),
        vec4( -0.21, 0.21, 0.21, 1.0 ),

		
		vec4( -0.19, -0.59,  -0.21, 1.0 ),
        vec4( -0.19,  -0.21,  -0.21, 1.0 ),
        vec4( 0.19,  -0.21,  -0.21, 1.0 ),
        vec4( 0.19, -0.59,  -0.21, 1.0 ),
        vec4( -0.19, -0.59, -0.59, 1.0 ),
        vec4( -0.19,  -0.21, -0.59, 1.0 ),
        vec4( 0.19,  -0.21, -0.59, 1.0 ),
        vec4( 0.19, -0.59, -0.59, 1.0 ),
		
		vec4( -0.19, -0.19,  -0.21, 1.0 ),
        vec4( -0.19,  0.19,  -0.21, 1.0 ),
        vec4( 0.19,  0.19,  -0.21, 1.0 ),
        vec4( 0.19, -0.19,  -0.21, 1.0 ),
        vec4( -0.19, -0.19, -0.59, 1.0 ),
        vec4( -0.19,  0.19, -0.59, 1.0 ),
        vec4( 0.19,  0.19, -0.59, 1.0 ),
        vec4( 0.19, -0.19, -0.59, 1.0 ),
		
		vec4( -0.19, 0.21,  -0.21, 1.0 ),
        vec4( -0.19,  0.59,  -0.21, 1.0 ),
        vec4( 0.19,  0.59,  -0.21, 1.0 ),
        vec4( 0.19, 0.21,  -0.21, 1.0 ),
        vec4( -0.19, 0.21, -0.59, 1.0 ),
        vec4( -0.19,  0.59, -0.59, 1.0 ),
        vec4( 0.19,  0.59, -0.59, 1.0 ),
        vec4( 0.19, 0.21, -0.59, 1.0 ),
		
        vec4( -0.19, -0.59,  0.19, 1.0 ),
        vec4( -0.19,  -0.21,  0.19, 1.0 ),
        vec4( 0.19,  -0.21,  0.19, 1.0 ),
        vec4( 0.19, -0.59,  0.19, 1.0 ),
        vec4( -0.19, -0.59, -0.19, 1.0 ),
        vec4( -0.19,  -0.21, -0.19, 1.0 ),
        vec4( 0.19,  -0.21, -0.19, 1.0 ),
        vec4( 0.19, -0.59, -0.19, 1.0 ),
		
		vec4( -0.19, -0.19,  0.19, 1.0 ),
        vec4( -0.19,  0.19,  0.19, 1.0 ),
        vec4( 0.19,  0.19,  0.19, 1.0 ),
        vec4( 0.19, -0.19,  0.19, 1.0 ),
        vec4( -0.19, -0.19, -0.19, 1.0 ),
        vec4( -0.19,  0.19, -0.19, 1.0 ),
        vec4( 0.19,  0.19, -0.19, 1.0 ),
        vec4( 0.19, -0.19, -0.19, 1.0 ),
		
		vec4( -0.19, 0.21,  0.19, 1.0 ),
        vec4( -0.19,  0.59,  0.19, 1.0 ),
        vec4( 0.19,  0.59,  0.19, 1.0 ),
        vec4( 0.19, 0.21,  0.19, 1.0 ),
        vec4( -0.19, 0.21, -0.19, 1.0 ),
        vec4( -0.19,  0.59, -0.19, 1.0 ),
        vec4( 0.19,  0.59, -0.19, 1.0 ),
        vec4( 0.19, 0.21, -0.19, 1.0 ),

        vec4( -0.19, -0.59,  0.59, 1.0 ),
        vec4( -0.19,  -0.21,  0.59, 1.0 ),
        vec4( 0.19,  -0.21,  0.59, 1.0 ),
        vec4( 0.19, -0.59,  0.59, 1.0 ),
        vec4( -0.19, -0.59, 0.21, 1.0 ),
        vec4( -0.19,  -0.21, 0.21, 1.0 ),
        vec4( 0.19,  -0.21, 0.21, 1.0 ),
        vec4( 0.19, -0.59, 0.21, 1.0 ),
		
		vec4( -0.19, -0.19,  0.59, 1.0 ),
        vec4( -0.19,  0.19,  0.59, 1.0 ),
        vec4( 0.19,  0.19,  0.59, 1.0 ),
        vec4( 0.19, -0.19,  0.59, 1.0 ),
        vec4( -0.19, -0.19, 0.21, 1.0 ),
        vec4( -0.19,  0.19, 0.21, 1.0 ),
        vec4( 0.19,  0.19, 0.21, 1.0 ),
        vec4( 0.19, -0.19, 0.21, 1.0 ),
		
		vec4( -0.19, 0.21,  0.59, 1.0 ),
        vec4( -0.19,  0.59,  0.59, 1.0 ),
        vec4( 0.19,  0.59,  0.59, 1.0 ),
        vec4( 0.19, 0.21,  0.59, 1.0 ),
        vec4( -0.19, 0.21, 0.21, 1.0 ),
        vec4( -0.19,  0.59, 0.21, 1.0 ),
        vec4( 0.19,  0.59, 0.21, 1.0 ),
        vec4( 0.19, 0.21, 0.21, 1.0 ),
		
		
		vec4( 0.21, -0.59,  -0.21, 1.0 ),
        vec4( 0.21,  -0.21,  -0.21, 1.0 ),
        vec4( 0.59,  -0.21,  -0.21, 1.0 ),
        vec4( 0.59, -0.59,  -0.21, 1.0 ),
        vec4( 0.21, -0.59, -0.59, 1.0 ),
        vec4( 0.21,  -0.21, -0.59, 1.0 ),
        vec4( 0.59,  -0.21, -0.59, 1.0 ),
        vec4( 0.59, -0.59, -0.59, 1.0 ),
		
		vec4( 0.21, -0.19,  -0.21, 1.0 ),
        vec4( 0.21,  0.19,  -0.21, 1.0 ),
        vec4( 0.59,  0.19,  -0.21, 1.0 ),
        vec4( 0.59, -0.19,  -0.21, 1.0 ),
        vec4( 0.21, -0.19, -0.59, 1.0 ),
        vec4( 0.21,  0.19, -0.59, 1.0 ),
        vec4( 0.59,  0.19, -0.59, 1.0 ),
        vec4( 0.59, -0.19, -0.59, 1.0 ),
		
		vec4( 0.21, 0.21,  -0.21, 1.0 ),
        vec4( 0.21,  0.59,  -0.21, 1.0 ),
        vec4( 0.59,  0.59,  -0.21, 1.0 ),
        vec4( 0.59, 0.21,  -0.21, 1.0 ),
        vec4( 0.21, 0.21, -0.59, 1.0 ),
        vec4( 0.21,  0.59, -0.59, 1.0 ),
        vec4( 0.59,  0.59, -0.59, 1.0 ),
        vec4( 0.59, 0.21, -0.59, 1.0 ),
		
        vec4( 0.21, -0.59,  0.19, 1.0 ),
        vec4( 0.21,  -0.21,  0.19, 1.0 ),
        vec4( 0.59,  -0.21,  0.19, 1.0 ),
        vec4( 0.59, -0.59,  0.19, 1.0 ),
        vec4( 0.21, -0.59, -0.19, 1.0 ),
        vec4( 0.21,  -0.21, -0.19, 1.0 ),
        vec4( 0.59,  -0.21, -0.19, 1.0 ),
        vec4( 0.59, -0.59, -0.19, 1.0 ),
		
		vec4( 0.21, -0.19,  0.19, 1.0 ),
        vec4( 0.21,  0.19,  0.19, 1.0 ),
        vec4( 0.59,  0.19,  0.19, 1.0 ),
        vec4( 0.59, -0.19,  0.19, 1.0 ),
        vec4( 0.21, -0.19, -0.19, 1.0 ),
        vec4( 0.21,  0.19, -0.19, 1.0 ),
        vec4( 0.59,  0.19, -0.19, 1.0 ),
        vec4( 0.59, -0.19, -0.19, 1.0 ),
		
		vec4( 0.21, 0.21,  0.19, 1.0 ),
        vec4( 0.21,  0.59,  0.19, 1.0 ),
        vec4( 0.59,  0.59,  0.19, 1.0 ),
        vec4( 0.59, 0.21,  0.19, 1.0 ),
        vec4( 0.21, 0.21, -0.19, 1.0 ),
        vec4( 0.21,  0.59, -0.19, 1.0 ),
        vec4( 0.59,  0.59, -0.19, 1.0 ),
        vec4( 0.59, 0.21, -0.19, 1.0 ),

        vec4( 0.21, -0.59,  0.59, 1.0 ),
        vec4( 0.21,  -0.21,  0.59, 1.0 ),
        vec4( 0.59,  -0.21,  0.59, 1.0 ),
        vec4( 0.59, -0.59,  0.59, 1.0 ),
        vec4( 0.21, -0.59, 0.21, 1.0 ),
        vec4( 0.21,  -0.21, 0.21, 1.0 ),
        vec4( 0.59,  -0.21, 0.21, 1.0 ),
        vec4( 0.59, -0.59, 0.21, 1.0 ),
		
		vec4( 0.21, -0.19,  0.59, 1.0 ),
        vec4( 0.21,  0.19,  0.59, 1.0 ),
        vec4( 0.59,  0.19,  0.59, 1.0 ),
        vec4( 0.59, -0.19,  0.59, 1.0 ),
        vec4( 0.21, -0.19, 0.21, 1.0 ),
        vec4( 0.21,  0.19, 0.21, 1.0 ),
        vec4( 0.59,  0.19, 0.21, 1.0 ),
        vec4( 0.59, -0.19, 0.21, 1.0 ),
		
		vec4( 0.21, 0.21,  0.59, 1.0 ),
        vec4( 0.21,  0.59,  0.59, 1.0 ),
        vec4( 0.59,  0.59,  0.59, 1.0 ),
        vec4( 0.59, 0.21,  0.59, 1.0 ),
        vec4( 0.21, 0.21, 0.21, 1.0 ),
        vec4( 0.21,  0.59, 0.21, 1.0 ),
        vec4( 0.59,  0.59, 0.21, 1.0 ),
        vec4( 0.59, 0.21, 0.21, 1.0 ),
    ];

    var vertexColors = [
        [ 0.0, 0.0, 0.0, 1.0 ],  // black
        [ 1.0, 0.0, 0.0, 1.0 ],  // red
        [ 1.0, 1.0, 0.0, 1.0 ],  // yellow
        [ 0.0, 1.0, 0.0, 1.0 ],  // green
        [ 0.0, 0.0, 1.0, 1.0 ],  // blue
        [ 1.0, 0.0, 1.0, 1.0 ],  // magenta
        [ 0.0, 1.0, 1.0, 1.0 ],  // cyan
        [ 1.0, 1.0, 1.0, 1.0 ]   // white
    ];

    var indices = [ a, b, c, a, c, d ]; // create two triangles based with the quad vertices

    for ( var i = 0; i < indices.length; ++i ) {
        points.push( vertices[indices[i]] );

		if (Math.max(Math.abs(vertices[a][0]),Math.abs(vertices[a][1]),Math.abs(vertices[a][2]))+Math.max(Math.abs(vertices[b][0]),Math.abs(vertices[b][1]),Math.abs(vertices[b][2]))+Math.max(Math.abs(vertices[c][0]),Math.abs(vertices[c][1]),Math.abs(vertices[c][2]))+Math.max(Math.abs(vertices[d][0]),Math.abs(vertices[d][1]),Math.abs(vertices[d][2])) > 2) { //if the quad is an outside face
			colors.push(vertexColors[a%8]); //assign color based on first index 
		} else {
			colors.push(vertexColors[0]); //otherwise make it black
		}
    }
}

 
function render()
{
	
	if (!drag) { //slow to a stop
		dX *= .95, dY*=.95;
		modelViewMatrix=mult(rotateY(dX),modelViewMatrix);
		modelViewMatrix=mult(rotateX(dY),modelViewMatrix);
	}
	
	if ((scrams!=0) && !isSpin) {
		rotat(rots[Math.floor(Math.random() * 9)],Math.floor(Math.random() * 2));
		scrams--;
	}
	
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


	if (spin == 90/speed) { //reset state to not spinning every cycle
			if (isSpin) {
				document.getElementById("currentState").value=JSON.stringify([theta,cube]); //update save box text if there was a new spin
				checkSolve();
			}
			isSpin = 0;
			spin = 0;
			speed=newspeed;
			dtheta = Array(27).fill().map(() => mat4());
		} else {
			spin++
		}			
	for (var i = 0; i < 27;i++) {
		if (i==13) { //don't render middle cube
			continue;
		}
		theta[i]=mult(dtheta[i],theta[i]); //increment rotations
		
		var t = mult(modelViewMatrix, theta[i]); //adjust to model
		gl.uniformMatrix4fv( modelViewMatrixLoc,  false, flatten(t) );
		gl.uniform1f(gl.getUniformLocation(program, "i"),0);
		gl.drawArrays( gl.TRIANGLES, 36*i, 36);
	}
	
	requestAnimFrame( render );
}

function rotat(face,direction) {
	if (isSpin) return //don't allow a new turn if the animation hasn't finished
	if (!direction) {
		face = face.slice(0,8).reverse().concat(face[8]).concat(face[9]); //flip array
	}
	//rotate cube matrix
	var cubes = [];
	var t1 = cube[face[0]];
	var t2 = cube[face[1]];
	for (var i=0;i<8;i++){
		cubes.push(cube[face[i]]); //create list of which cubes are affected
		cube[face[i]]=cube[face[(i+2)%8]];
	}
	cube[face[6]]=t1;
	cube[face[7]]=t2;
	cubes.push(cube[face[8]]); 
	//generate rotation matrices 
	var ax = Array(4).fill().map((_, x) => (x==face[9]?1:0)) 
	var vel = rotate(speed*(direction?-1:1),ax);
	isSpin=1; //set animation flags
	spin=0;
	//set cubes to rotate
	for(var x in cubes) {
		dtheta[cubes[x]]=vel;
	}
	document.getElementById("winwin").style.visibility = "hidden" //hide the solved message 
}

function checkSolve(){
	
	var middles = [[3,9,9,11,15,21],[4,10,12,14,16,22],[5,11,15,17,17,23]];
	
	for (var i=0;i<27;i++) {
		if (i==13) continue; //don't check the center
		var x = middles[1].indexOf(i)
		if (x!=-1) { //if it's a middle piece just check the relative position, not the rotation
			if (cube.indexOf(middles[0][x])-cube.indexOf(middles[1][x])!=cube.indexOf(middles[1][x])-cube.indexOf(middles[2][x])) //check that center positions match
				return;
			continue;
		}
		for (var j=0;j<4;j++) {
			for (var k=0;k<4;k++) {
				if (Math.abs(theta[i][j][k]-theta[0][j][k])>.5) { //check that all rotation matrices are the same
					return;
				}
			}
		}
	}
	document.getElementById("winwin").style.visibility = "visible" //show solved message
}

function selection() {
	var face = new Uint8Array(4);
	var pos = new Uint8Array(4);
	
	//render cube in initial state to use color to determine face
	
	gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.uniformMatrix4fv( modelViewMatrixLoc,  false, flatten(modelViewMatrix) );
	gl.uniform1f(gl.getUniformLocation(program, "i"),0);
	gl.drawArrays( gl.TRIANGLES, 0, 36*27);
	
	gl.readPixels(event.pageX, self.canvas.clientHeight-event.pageY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, face);
	
	var ax; //assign axis
	if(face[0]==255)
	if(face[1]==255) ax = 0;
	else if(face[2]==255) ax = 0;
	else ax = "2";
	else if(face[1]==255)
	if(face[2]==255) ax = 1;
	else ax = "1";
	else if(face[2]==255) ax = 2;
	else ax = 3;

	//render cube in initial state with one of the color bytes equal to the subcube to determine position
	
	gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.uniformMatrix4fv( modelViewMatrixLoc,  false, flatten(modelViewMatrix) );
	for (var i = 0; i < 27;i++) {
		gl.uniform1f(gl.getUniformLocation(program, "i"),(i+.001)/256);
		gl.drawArrays( gl.TRIANGLES, 36*i, 36);
	}
	gl.readPixels(event.pageX, self.canvas.clientHeight-event.pageY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pos);
	
	gl.uniform1f(gl.getUniformLocation(program, "i"), 0);
	return [ax,pos[0]];
}