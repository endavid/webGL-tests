
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
	// shaders
	this.shaderOIT = null;
	this.shaderOITResolve = null;
	// WebGL extensions
	this.extMRT = null;
	this.extFloat = null;
	this.initExtensions();
	this.initBuffers();
	this.initShaders();
	this.initGeometry();
}

Resources.prototype.initExtensions = function()
{
	this.extMRT = this.gl.getExtension('WEBGL_draw_buffers');
	if (!this.extMRT) {
		alert("Missing WEBGL_draw_buffers extension!");
		return false;
	}
	this.extFloat = this.gl.getExtension('OES_texture_float');
	if (!this.extFloat) {
		alert("Missing OES_texture_float extension!");
		return false;
	}
}

Resources.prototype.initShaders = function()
{
	var gl = this.gl;
	this.shaderOIT = GFX.useShader(gl, "shaders/geometry.vs", "shaders/oit.fs");
	this.shaderOITResolve = GFX.useShader(gl, "shaders/fullscreen.vs", "shaders/oit_resolve.fs");
	
	// vertex attributes
	this.attribUv = gl.getAttribLocation(this.shaderOIT, "uv");
	this.attribPosition = gl.getAttribLocation(this.shaderOIT, "position");
	this.attribNormal = gl.getAttribLocation(this.shaderOIT, "normal");
	// uniforms
	this.uniPmatrix = gl.getUniformLocation(this.shaderOIT, "Pmatrix");
	this.uniVmatrix = gl.getUniformLocation(this.shaderOIT, "Vmatrix");
	this.uniMmatrix = gl.getUniformLocation(this.shaderOIT, "Mmatrix");
	this.uniSampler = gl.getUniformLocation(this.shaderOIT, "sampler");
	this.uniSamplerAccum = gl.getUniformLocation(this.shaderOITResolve, "texAccumulation");
	this.uniSamplerReveal = gl.getUniformLocation(this.shaderOITResolve, "texReveal");
	gl.enableVertexAttribArray(this.attribUv);
	gl.enableVertexAttribArray(this.attribPosition);
	gl.enableVertexAttribArray(this.attribNormal);
}

Resources.prototype.initBuffers = function()
{
	var gl = this.gl;
	var extMRT = this.extMRT;
	this.pushRenderbuffer();
	this.pushFramebuffer();
	this.pushViewport();
	
	this.rb = gl.createRenderbuffer();
	this.fb = gl.createFramebuffer();
	this.txOITAccumulation = gl.createTexture();
	this.txOITReveal = gl.createTexture();
	gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
	gl.bindRenderbuffer(gl.RENDERBUFFER, this.rb);
	gl.bindTexture(gl.TEXTURE_2D, this.txOITAccumulation);
	this.setDefaultTextureParameters();
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.FLOAT, null);
	gl.bindTexture(gl.TEXTURE_2D, this.txOITReveal);
	this.setDefaultTextureParameters();
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.FLOAT, null);
	// attach textures to the framebuffer (MRT)
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extMRT.COLOR_ATTACHMENT0_WEBGL, gl.TEXTURE_2D, this.txOITAccumulation, 0);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, extMRT.COLOR_ATTACHMENT1_WEBGL, gl.TEXTURE_2D, this.txOITReveal, 0);
	// map the color attachments to draw buffer slots that the fragment shader will write to using gl_FragData
	extMRT.drawBuffersWEBGL([extMRT.COLOR_ATTACHMENT0_WEBGL, extMRT.COLOR_ATTACHMENT1_WEBGL]);
	// check
	if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
		console.error("Can't use framebuffer.");
		// See http://www.khronos.org/opengles/sdk/docs/man/xhtml/glCheckFramebufferStatus.xml
  	}
  	this.popViewport();
  	this.popFramebuffer();
  	this.popRenderbuffer();
}

Resources.prototype.setOITBuffer = function()
{
	var gl = this.gl;
	gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
	gl.bindRenderbuffer(gl.RENDERBUFFER, this.rb);
	gl.viewport(0, 0, this.width, this.height);
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
var main = function()
{
	var canvas = document.getElementById("demo_canvas");
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
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

	// ------------------------------------
	// model data
	// ------------------------------------
	var vertexBuffer=false, indexBuffer=false, numPoints=0;

	$.getJSON('resources/pear.json', function(model) {
	  //console.log("Loaded");
	  //vertices
	  vertexBuffer= gl.createBuffer();
	  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	  gl.bufferData(gl.ARRAY_BUFFER,
	                new Float32Array(model.vertices),
	    gl.STATIC_DRAW);
	
	  //faces
	  indexBuffer=gl.createBuffer();
	  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
	                new Uint16Array(model.indices), // 32-bit for more than 64K verts
	    gl.STATIC_DRAW);
	
	  numPoints=model.indices.length;
	
	  animate(0);
	});

	
	// ------------------------------------
	// matrices
	// ------------------------------------
	var projectionMatrix = MATH.getProjection(40, canvas.width/canvas.height, 1, 100);
	var modelMatrix = MATH.getI4();
	var viewMatrix = MATH.getI4();
	MATH.translateZ(viewMatrix, -8);
	MATH.translateY(viewMatrix, -0.7);
	var THETA=0,
      	PHI=0;
	
	// ------------------------------------
    // Textures
	// ------------------------------------
	var getTexture=function(image_URL){
	  var image=new Image();
	  image.src=image_URL;
	  image.webglTexture=false;
	  image.onload=function(e) 
	  {
	    var texture=gl.createTexture();
	    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	    gl.bindTexture(gl.TEXTURE_2D, texture);
	    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
	    gl.generateMipmap(gl.TEXTURE_2D);
	    gl.bindTexture(gl.TEXTURE_2D, null);
	    image.webglTexture=texture;
	  };
	  return image;
	};   

	var myTexture = getTexture("resources/pear.png");   
  	
	// --------------------------------------------
	// Buffers
	// --------------------------------------------
	
	// Drawing
	gl.clearColor(0,0,0,1);
	gl.disable(gl.DEPTH_TEST);
	gl.depthMask(false); // disable zwrite
	gl.enable(gl.CULL_FACE); // cull back faces
	gl.enable(gl.BLEND);
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
		gl.clearColor(0.1,0.3,0,1);
		gl.clear(gl.COLOR_BUFFER_BIT);
		
		res.pushRenderbuffer();
		res.pushFramebuffer();
		res.pushViewport();
		res.setOITBuffer(); // draw offscreen
		gl.clearColor(0,0,0,1);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.useProgram(res.shaderOIT);
		gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE_MINUS_SRC_ALPHA);
		gl.uniform1i(res.uniSampler, 0);
		gl.uniformMatrix4fv(res.uniPmatrix, false, projectionMatrix);
		gl.uniformMatrix4fv(res.uniVmatrix, false, viewMatrix);
		gl.uniformMatrix4fv(res.uniMmatrix, false, modelMatrix);
		if (myTexture.webglTexture) {
		  gl.activeTexture(gl.TEXTURE0);
		  gl.bindTexture(gl.TEXTURE_2D, myTexture.webglTexture);
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
		gl.vertexAttribPointer(res.attribPosition, 3, gl.FLOAT, false, 4*(3+3+2), 0);
		gl.vertexAttribPointer(res.attribNormal, 3, gl.FLOAT, false, 4*(3+3+2), 4*3);
		gl.vertexAttribPointer(res.attribUv, 2, gl.FLOAT, false, 4*(3+3+2), 4*(3+3));
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
		// draw a series of pears ;)
		for (var i=-2; i<3; i++)
		{
			var m = modelMatrix.slice(0); // clone array
			MATH.translateX(m, i);
			for (var j=0; j<3; j++)
			{
				MATH.translateZ(m, 2);
				gl.uniformMatrix4fv(res.uniMmatrix, false, m);
				gl.drawElements(gl.TRIANGLES, numPoints, gl.UNSIGNED_SHORT, 0);
			}
		}

		res.popViewport();
		res.popFramebuffer();
		res.popRenderbuffer();
		
		gl.useProgram(res.shaderOITResolve);
		gl.blendFunc(gl.ONE_MINUS_SRC_ALPHA, gl.SRC_ALPHA);
		gl.uniform1i(res.uniSamplerAccum, 0);
		gl.uniform1i(res.uniSamplerReveal, 1);
		gl.disableVertexAttribArray(res.attribNormal);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, res.txOITAccumulation);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, res.txOITReveal);
		res.drawFullScreenQuad();
		gl.enableVertexAttribArray(res.attribNormal);
  	
		gl.flush(); 
		window.requestAnimationFrame(animate); // redraw the scene
	}	
}
