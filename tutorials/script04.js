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
	var GL;
	try {
		GL = canvas.getContext("experimental-webgl", {antialias: true});
		// for models with more than 64K vertices
		var EXT = GL.getExtension("OES_element_index_uint") ||
			GL.getExtension("MOZ_OES_element_index_uint") ||
			GL.getExtension("WEBKIT_OES_element_index_uint");
	} catch (e) {
		alert("Your browser is not WebGL compatible :(");
		return false;
	}
	// -------------------------------------------------
	// Shaders
	// -------------------------------------------------
	var shader_vertex_source = "\n\
	attribute vec3 position;\n\
	attribute vec3 normal;\n\
	attribute vec2 uv;\n\
	uniform mat4 Pmatrix;\n\
	uniform mat4 Vmatrix;\n\
	uniform mat4 Mmatrix;\n\
	varying vec2 vUV;\n\
	varying vec3 vNormal;\n\
	void main(void) { // pre-built function\n\
		gl_Position = Pmatrix * Vmatrix * Mmatrix * vec4(position, 1.);\n\
		vNormal = vec3(Mmatrix * vec4(normal, 0.));\n\
		vUV = uv;\n\
	}";
	var shader_fragment_source = "\n\
	precision mediump float;\n\
	uniform sampler2D sampler;\n\
	varying vec2 vUV;\n\
	varying vec3 vNormal;\n\
	void main(void) {\n\
		//gl_FragColor = vec4(vNormal, 1.0);\n\
		float fakeShading = dot(vec3(0.21, 0.072, 0.71), vNormal);\n\
		gl_FragColor = texture2D(sampler, vUV);\n\
		gl_FragColor.rgb *= fakeShading;\n\
	}";
	
	/// To compile a shader
	var getShader = function(source, type, typeString)
	{
		var shader = GL.createShader(type);
		GL.shaderSource(shader, source);
		GL.compileShader(shader);
		if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) {
			alert("ERROR IN "+typeString+" SHADER : " + GL.getShaderInfoLog(shader));
			return false;
		}
		return shader;
	}
	
	var shader_vertex = getShader(shader_vertex_source, GL.VERTEX_SHADER, "VERTEX");
	var shader_fragment = getShader(shader_fragment_source, GL.FRAGMENT_SHADER, "FRAGMENT");
	var shader_program = GL.createProgram();
	GL.attachShader(shader_program, shader_vertex);
	GL.attachShader(shader_program, shader_fragment);
	GL.linkProgram(shader_program);
	// vertex attributes
	var _uv = GL.getAttribLocation(shader_program, "uv");
	var _position = GL.getAttribLocation(shader_program, "position");
	var _normal = GL.getAttribLocation(shader_program, "normal");
	// uniforms
	var _Pmatrix = GL.getUniformLocation(shader_program, "Pmatrix");
	var _Vmatrix = GL.getUniformLocation(shader_program, "Vmatrix");
	var _Mmatrix = GL.getUniformLocation(shader_program, "Mmatrix");
	var _sampler = GL.getUniformLocation(shader_program, "sampler");
	GL.enableVertexAttribArray(_uv);
	GL.enableVertexAttribArray(_position);
	GL.enableVertexAttribArray(_normal);
	GL.useProgram(shader_program);
	GL.uniform1i(_sampler, 0);
	// ------------------------------------
	// model data
	// ------------------------------------
	var vertexBuffer=false, indexBuffer=false, numPoints=0;

	$.getJSON('resources/houseSantorini.json', function(model) {
	  //console.log("Loaded");
	  //vertices
	  vertexBuffer= GL.createBuffer();
	  GL.bindBuffer(GL.ARRAY_BUFFER, vertexBuffer);
	  GL.bufferData(GL.ARRAY_BUFFER,
	                new Float32Array(model.vertices),
	    GL.STATIC_DRAW);
	
	  //faces
	  indexBuffer=GL.createBuffer();
	  GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, indexBuffer);
	  GL.bufferData(GL.ELEMENT_ARRAY_BUFFER,
	                new Uint32Array(model.indices), // 32-bit for more than 64K verts
	    GL.STATIC_DRAW);
	
	  numPoints=model.indices.length;
	
	  animate(0);
	});

	
	// ------------------------------------
	// matrices
	// ------------------------------------
	var projectionMatrix = LIB.getProjection(40, canvas.width/canvas.height, 1, 100);
	var moveMatrix = LIB.getI4();
	var viewMatrix = LIB.getI4();
	LIB.translateZ(viewMatrix, -8);
	LIB.translateY(viewMatrix, -1);
	var THETA=0,
      	PHI=0;
	
    // Textures
	var getTexture=function(image_URL){
	  var image=new Image();
	  image.src=image_URL;
	  image.webglTexture=false;
	  image.onload=function(e) 
	  {
	    var texture=GL.createTexture();
	    GL.pixelStorei(GL.UNPACK_FLIP_Y_WEBGL, true);
	    GL.bindTexture(GL.TEXTURE_2D, texture);
	    GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, GL.RGBA, GL.UNSIGNED_BYTE, image);
	    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR);
	    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.NEAREST_MIPMAP_LINEAR);
	    GL.generateMipmap(GL.TEXTURE_2D);
	    GL.bindTexture(GL.TEXTURE_2D, null);
	    image.webglTexture=texture;
	  };
	  return image;
	};   

	var myTexture = getTexture("resources/houseSantorini.png");   
  	
	// Drawing
	GL.clearColor(0,0,0,0);
	GL.enable(GL.DEPTH_TEST);
	GL.depthFunc(GL.LEQUAL);
	GL.clearDepth(1.0);
	var time_old=0;
	var animate = function(time)
	{
		var dt=time-time_old;
		if (!drag) {
		  dX*=amortization, dY*=amortization;
		  THETA+=dX, PHI+=dY;
		}
		LIB.setI4(moveMatrix);
		LIB.rotateY(moveMatrix, THETA);
		LIB.rotateX(moveMatrix, PHI);
		time_old=time;
    
		GL.viewport(0, 0, canvas.width, canvas.height);
		GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
		
		// draw
		GL.uniformMatrix4fv(_Pmatrix, false, projectionMatrix);
		GL.uniformMatrix4fv(_Vmatrix, false, viewMatrix);
		GL.uniformMatrix4fv(_Mmatrix, false, moveMatrix);
		if (myTexture.webglTexture) {
		  GL.activeTexture(GL.TEXTURE0);
		  GL.bindTexture(GL.TEXTURE_2D, myTexture.webglTexture);
		}
		GL.bindBuffer(GL.ARRAY_BUFFER, vertexBuffer);
		GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 4*(3+3+2), 0);
		GL.vertexAttribPointer(_normal, 3, GL.FLOAT, false, 4*(3+3+2), 4*3);
		GL.vertexAttribPointer(_uv, 2, GL.FLOAT, false, 4*(3+3+2), 4*(3+3));
		GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, indexBuffer);
		GL.drawElements(GL.TRIANGLES, numPoints, GL.UNSIGNED_INT, 0);

		GL.flush(); 
		window.requestAnimationFrame(animate); // redraw the scene
	}	
}
