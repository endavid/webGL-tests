
// ============================================
/// Class to init resources
function Resources(gl, width, height)
{
	this.gl = gl;
	this.width = width;
	this.height = height;
	this.rb = null; // render buffer
	this.fb = null; // frame buffer
	this.txOITAccumulation = null; // accumulation texture for OIT
	this.txOITReveal = null; // reveal texture for OIT
	// state
	this.oldFBO = 0;
	this.oldRBO = 0;
	this.oldViewport = [0,0,1,1];
	// shaders & attributes & uniforms
	this.shader = {};
	this.attrib = {};
	this.uniform = {};
	// buffers
	this.buffer = {};
	// WebGL extensions
	this.extFloat = null;
	this.initExtensions();
	this.initBuffers();
	this.initShaders();
	this.initGeometry();
}

Resources.prototype.initExtensions = function()
{
	this.extFloat = this.gl.getExtension('OES_texture_float');
	if (!this.extFloat) {
		alert("Missing OES_texture_float extension!");
		return false;
	}
}

Resources.prototype.initShaders = function()
{
	var gl = this.gl;
	this.shader["color"] = GFX.useShader(gl, "shaders/geometryColor.vs", "shaders/color.fs");
	
	// vertex attributes
	this.attrib["color"] = {}
	this.attrib["color"].color = gl.getAttribLocation(this.shader["color"], "color");
	this.attrib["color"].position = gl.getAttribLocation(this.shader["color"], "position");
	// uniforms
	this.uniform["color"] = {}
	this.uniform["color"].Pmatrix = gl.getUniformLocation(this.shader["color"], "Pmatrix");
	this.uniform["color"].Vmatrix = gl.getUniformLocation(this.shader["color"], "Vmatrix");
	this.uniform["color"].Mmatrix = gl.getUniformLocation(this.shader["color"], "Mmatrix");
	gl.enableVertexAttribArray(this.attrib["color"].color);
	gl.enableVertexAttribArray(this.attrib["color"].position);
}

Resources.prototype.initBuffers = function()
{

}


Resources.prototype.setDefaultTextureParameters = function()
{
	var gl = this.gl;
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); // can't use LINEAR with FLOAT textures :(
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S,     gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T,     gl.CLAMP_TO_EDGE);
}

Resources.prototype.initGeometry = function()
{
	var gl = this.gl;
	// geometry
	this.quad = [ // xyz, uv
		-1, -1, 0,  0, 0,
		-1,  1, 0,  0, 1,
		 1, -1, 0,  1, 0,
		 1,  1, 0,  1, 1
	];
	this.quadFaces = [0, 2, 1, 3];
	this.quadVB = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVB);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.quad), gl.STATIC_DRAW);
	this.quadIB = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.quadIB);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.quadFaces), gl.STATIC_DRAW);
	
	// dots	
	this.buffer["dots"] = gl.createBuffer();
    this.buffer["dotsColor"] = gl.createBuffer();
	var vertices = [
         0.0,  1.0,  0.0,
        -1.0, -1.0,  0.0,
         1.0, -1.0,  0.0
    ];
    var colors = [
        1.0, 0.0, 0.0, 1.0,
        0.0, 1.0, 0.0, 1.0,
        0.0, 0.0, 1.0, 1.0
    ];
    this.setDots(vertices, colors);
}

// dots for debugging samples
Resources.prototype.setDots = function(vertices, colors)
{
	var gl = this.gl;
	gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer["dots"]);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    this.buffer["dots"].itemSize = 3;
    this.buffer["dots"].numItems = vertices.length / 3;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer["dotsColor"]);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    this.buffer["dotsColor"].itemSize = 4;
    this.buffer["dotsColor"].numItems = colors.length / 4;	
}

// ----------------------------------------------
// State
// ----------------------------------------------
Resources.prototype.pushFramebuffer = function()
{
	this.oldFBO = this.gl.getParameter(this.gl.FRAMEBUFFER_BINDING);
}
Resources.prototype.pushRenderbuffer = function()
{
	this.oldRBO = this.gl.getParameter(this.gl.RENDERBUFFER_BINDING);
}
Resources.prototype.pushViewport = function()
{
	this.oldViewport = this.gl.getParameter(this.gl.VIEWPORT);
}
Resources.prototype.popFramebuffer = function()
{
	this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.oldFBO);
}
Resources.prototype.popRenderbuffer = function()
{
	this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.oldRBO);
}
Resources.prototype.popViewport = function()
{
	var v = this.oldViewport;
	this.gl.viewport(v[0], v[1], v[2], v[3]);
}
// ----------------------------------------------
// Drawing ops
// ----------------------------------------------
Resources.prototype.drawFullScreenQuad = function()
{
	var gl = this.gl;
	gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVB);
	gl.vertexAttribPointer(this.attribPosition, 3, gl.FLOAT, false, 4*(3+2), 0);
	gl.vertexAttribPointer(this.attribUv, 2, gl.FLOAT, false, 4*(3+2), 4*3);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.quadIB);
	gl.drawElements(gl.TRIANGLE_STRIP, this.quadFaces.length, gl.UNSIGNED_SHORT, 0);
}

// ============================================
var main = function(vertices, colors)
{
	var canvas = document.getElementById("debugSamplesCanvas");
	// -------------------------------------------------
	// capture mouse events
	// -------------------------------------------------
	var amortization=0.95;
	var drag=false;
	var old_x, old_y;
	var dX=0, dY=0;
	
	var mouseDown=function(e) {
	  drag=true;
	  old_x=e.pageX, old_y=e.pageY;
	  e.preventDefault();
	  return false;
	};
	
	var mouseUp=function(e){
	  drag=false;
	};
	
	var mouseMove=function(e) {
	  if (!drag) return false;
	  dX=(e.pageX-old_x)*Math.PI/canvas.width,
	    dY=(e.pageY-old_y)*Math.PI/canvas.height;
	  THETA+=dX;
	  PHI+=dY;
	  old_x=e.pageX, old_y=e.pageY;
	  e.preventDefault();
	};
	
	canvas.addEventListener("mousedown", mouseDown, false);
	canvas.addEventListener("mouseup", mouseUp, false);
	canvas.addEventListener("mouseout", mouseUp, false);
	canvas.addEventListener("mousemove", mouseMove, false);
  
	// -------------------------------------------------
	// Get WebGL context
	// -------------------------------------------------
	var gl;
	try {
		gl = canvas.getContext("experimental-webgl", {antialias: true});
	} catch (e) {
		alert("Your browser is not WebGL compatible :(");
		return false;
	}
	// ------------------------------------
	// Resources
	// ------------------------------------
	var res = new Resources(gl, canvas.width, canvas.height);
	res.setDots(vertices, colors);
	
	// ------------------------------------
	// matrices
	// ------------------------------------
	var projectionMatrix = MATH.getProjection(40, canvas.width/canvas.height, 1, 100);
	var modelMatrix = MATH.getI4();
	var viewMatrix = MATH.getI4();
	MATH.translateZ(viewMatrix, -2);
	var THETA=0,
      	PHI=0;
	
	
	// Drawing
	gl.clearColor(0,0,0,1);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	gl.clearDepth(1.0);
	var time_old=0;
	var animate = function(time)
	{
		var dt=time-time_old;
		if (!drag) {
		  dX*=amortization, dY*=amortization;
		  THETA+=dX, PHI+=dY;
		}
		MATH.setI4(modelMatrix);
		MATH.rotateY(modelMatrix, THETA);
		MATH.rotateX(modelMatrix, PHI);
		time_old=time;
    
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(0.1,0.1,0,1);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		gl.useProgram(res.shader["color"]);
		gl.uniformMatrix4fv(res.uniform["color"].Pmatrix, false, projectionMatrix);
		gl.uniformMatrix4fv(res.uniform["color"].Vmatrix, false, viewMatrix);
		gl.uniformMatrix4fv(res.uniform["color"].Mmatrix, false, modelMatrix);
		gl.bindBuffer(gl.ARRAY_BUFFER, res.buffer["dots"]);
		gl.vertexAttribPointer(res.attrib["color"].position, res.buffer["dots"].itemSize, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ARRAY_BUFFER, res.buffer["dotsColor"]);
		gl.vertexAttribPointer(res.attrib["color"].color, res.buffer["dotsColor"].itemSize, gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.POINTS, 0, res.buffer["dots"].numItems);  	
		gl.flush(); 
		window.requestAnimationFrame(animate); // redraw the scene
	}
	
	animate(0); // first lunch
}
