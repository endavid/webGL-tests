var ViewParameters = {
	isLockRotationY: false,
	isLockRotationX: false,
	modelRotationTheta: 0,
	modelRotationPhi: 0,
	cameraDistance: -6,
	cameraHeight: -0.7,
	onRotation: function() {},
}

// ============================================
/// Class to init resources
function Resources(gl, width, height)
{
	this.gl = gl;
	this.width = width;
	this.height = height;
	// shaders
	this.shaderLit = null;
	this.initShaders();
}

Resources.prototype.initShaders = function()
{
	var gl = this.gl;
	this.shaderLit = GFX.useShader(gl, "shaders/geometry.vs", "shaders/lighting.fs");

	// vertex attributes
	this.attribUv = gl.getAttribLocation(this.shaderLit, "uv");
	this.attribPosition = gl.getAttribLocation(this.shaderLit, "position");
	this.attribNormal = gl.getAttribLocation(this.shaderLit, "normal");
	// uniforms
	this.uniPmatrix = gl.getUniformLocation(this.shaderLit, "Pmatrix");
	this.uniVmatrix = gl.getUniformLocation(this.shaderLit, "Vmatrix");
	this.uniMmatrix = gl.getUniformLocation(this.shaderLit, "Mmatrix");
	this.uniSampler = gl.getUniformLocation(this.shaderLit, "sampler");
	gl.enableVertexAttribArray(this.attribUv);
	gl.enableVertexAttribArray(this.attribPosition);
	gl.enableVertexAttribArray(this.attribNormal);
}

Resources.prototype.setDefaultTextureParameters = function()
{
	var gl = this.gl;
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); // can't use LINEAR with FLOAT textures :(
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S,     gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T,     gl.CLAMP_TO_EDGE);
}

// ============================================
var main = function()
{
	var canvas = document.getElementById("demo_canvas");
	// -------------------------------------------------
	// capture mouse events
	// -------------------------------------------------
	var amortization=0.95;
	var drag=false;
	var old_x, old_y;
	var dX=0, dY=0;

	var updateViewRotation = function(dX, dY) {
		if (!ViewParameters.isLockRotationY) {
			ViewParameters.modelRotationTheta += dX;
		}
		if (!ViewParameters.isLockRotationX) {
			ViewParameters.modelRotationPhi += dY;
		}
		if (!ViewParameters.isLockRotationX && !ViewParameters.isLockRotationY) {
			if (Math.abs(dX) > 0.001 || Math.abs(dY) > 0.001) {
				ViewParameters.onRotation();
			}
		}
	}

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
		updateViewRotation(dX, dY);
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
	var modelData = {
		vertexBuffer: false,
		meshes: false
	};
  GFX.loadJsonModel(gl, 'resources/pear.json', modelData, function() {animate(0)});

	// ------------------------------------
	// matrices
	// ------------------------------------
	var projectionMatrix = MATH.getProjection(40, canvas.width/canvas.height, 0.1, 50);
	var modelMatrix = MATH.getI4();
	var viewMatrix = MATH.getI4();

	// --------------------------------------------
	// Drawing
	// --------------------------------------------

	gl.clearColor(0.1,0.3,0,1);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	gl.clearDepth(1.0);
	gl.enable(gl.CULL_FACE); // cull back faces
	var time_old=0;
	var animate = function(time)
	{
		var dt=time-time_old;
		time_old=time;

		if (!drag) {
		  dX*=amortization, dY*=amortization;
			updateViewRotation(dX, dY);
		}
		MATH.setI4(modelMatrix);
		MATH.rotateY(modelMatrix, ViewParameters.modelRotationTheta);
		MATH.rotateX(modelMatrix, ViewParameters.modelRotationPhi);
		MATH.setI4(viewMatrix);
		MATH.translateZ(viewMatrix, ViewParameters.cameraDistance);
		MATH.translateY(viewMatrix, ViewParameters.cameraHeight);

		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		gl.useProgram(res.shaderLit);
		gl.uniform1i(res.uniSampler, 0);
		gl.uniformMatrix4fv(res.uniPmatrix, false, projectionMatrix);
		gl.uniformMatrix4fv(res.uniVmatrix, false, viewMatrix);
		gl.uniformMatrix4fv(res.uniMmatrix, false, modelMatrix);
		gl.bindBuffer(gl.ARRAY_BUFFER, modelData.vertexBuffer);
		gl.vertexAttribPointer(res.attribPosition, 3, gl.FLOAT, false, 4*(3+3+2), 0);
		gl.vertexAttribPointer(res.attribNormal, 3, gl.FLOAT, false, 4*(3+3+2), 4*3);
		gl.vertexAttribPointer(res.attribUv, 2, gl.FLOAT, false, 4*(3+3+2), 4*(3+3));
		gl.uniformMatrix4fv(res.uniMmatrix, false, modelMatrix);

		// draw all submeshes
		modelData.meshes.forEach(function (mesh) {
			if (mesh.texture && mesh.texture.webglTexture) {
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, mesh.texture.webglTexture);
			}
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
			gl.drawElements(gl.TRIANGLES, mesh.numPoints, gl.UNSIGNED_SHORT, 0);
		});

		gl.flush();
		window.requestAnimationFrame(animate); // redraw the scene
	}
}
