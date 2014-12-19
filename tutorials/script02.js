var main = function()
{
	var canvas = document.getElementById("demo_canvas");
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	// Get WebGL context
	var GL;
	try {
		GL = canvas.getContext("experimental-webgl", {antialias: true});
	} catch (e) {
		alert("Your browser is not WebGL compatible :(");
		return false;
	}
	// Shaders
	var shader_vertex_source = "\n\
	attribute vec3 position;\n\
	attribute vec3 color;\n\
	uniform mat4 Pmatrix;\n\
	uniform mat4 Vmatrix;\n\
	uniform mat4 Mmatrix;\n\
	varying vec3 vColor;\n\
	void main(void) { // pre-built function\n\
		gl_Position = Pmatrix * Vmatrix * Mmatrix * vec4(position, 1.);\n\
		vColor = color;\n\
	}";
	var shader_fragment_source = "\n\
	precision mediump float;\n\
	varying vec3 vColor;\n\
	void main(void) {\n\
		gl_FragColor = vec4(vColor,1.);\n\
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
	var _color = GL.getAttribLocation(shader_program, "color");
	var _position = GL.getAttribLocation(shader_program, "position");
	// uniforms
	var _Pmatrix = GL.getUniformLocation(shader_program, "Pmatrix");
	var _Vmatrix = GL.getUniformLocation(shader_program, "Vmatrix");
	var _Mmatrix = GL.getUniformLocation(shader_program, "Mmatrix");
	GL.enableVertexAttribArray(_color);
	GL.enableVertexAttribArray(_position);
	GL.useProgram(shader_program);
	// points
	var vertexData = [
    -1,-1,-1,
    0,0,0,
    1,-1,-1,
    1,0,0,
    1,1,-1,
    1,1,0,
    -1,1,-1,
    0,1,0,
    -1,-1,1,
    0,0,1,
    1,-1,1,
    1,0,1,
    1,1,1,
    1,1,1,
    -1,1,1,
    0,1,1
	];
	var vertexBuffer = GL.createBuffer();
	GL.bindBuffer(GL.ARRAY_BUFFER, vertexBuffer);
	GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(vertexData), GL.STATIC_DRAW);
	// faces
	var faces = [
    0,1,2,
    0,2,3,

    4,5,6,
    4,6,7,

    0,3,7,
    0,4,7,

    1,2,6,
    1,5,6,

    2,3,6,
    3,7,6,

    0,1,5,
    0,4,5
	];
	var indexBuffer = GL.createBuffer();
	GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, indexBuffer);
	GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(faces), GL.STATIC_DRAW);
	// matrices
	var projectionMatrix = LIB.getProjection(40, canvas.width/canvas.height, 1, 100);
	var moveMatrix = LIB.getI4();
	var viewMatrix = LIB.getI4();
	LIB.translateZ(viewMatrix, -5);
	
	// Drawing
	GL.clearColor(0,0,0,0);
	GL.enable(GL.DEPTH_TEST);
	GL.depthFunc(GL.LEQUAL);
	GL.clearDepth(1.0);
	var time_old=0;
	var animate = function(time)
	{
		var dt=time-time_old;
		LIB.rotateZ(moveMatrix, dt*0.001);
		LIB.rotateY(moveMatrix, dt*0.002);
		LIB.rotateX(moveMatrix, dt*0.003);
		time_old=time;
    
		GL.viewport(0, 0, canvas.width, canvas.height);
		GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
		
		// draw
		GL.uniformMatrix4fv(_Pmatrix, false, projectionMatrix);
		GL.uniformMatrix4fv(_Vmatrix, false, viewMatrix);
		GL.uniformMatrix4fv(_Mmatrix, false, moveMatrix);		
		GL.bindBuffer(GL.ARRAY_BUFFER, vertexBuffer);
		GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 4*(3+3), 0);
		GL.vertexAttribPointer(_color, 3, GL.FLOAT, false, 4*(3+3), 4*3);
		GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, indexBuffer);
		GL.drawElements(GL.TRIANGLES, faces.length, GL.UNSIGNED_SHORT, 0);

		GL.flush(); 
		window.requestAnimationFrame(animate); // redraw the scene
	}
	
	animate(0); // first launch
}
