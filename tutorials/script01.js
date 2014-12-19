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
	attribute vec2 position;\n\
	attribute vec3 color;\n\
	varying vec3 vColor;\n\
	void main(void) { // pre-built function\n\
		gl_Position = vec4(position, 0., 1.);\n\
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
	GL.enableVertexAttribArray(_color);
	GL.enableVertexAttribArray(_position);
	GL.useProgram(shader_program);
	// points
	var triangle_vertex = [
		-1, -1,  // pos
		0, 0, 1, // color
		1, -1,
		1, 1, 0,
		1, 1,
		1, 0, 0,
		-1, 1,
		1, 1, 1
	];
	var vertexBuffer = GL.createBuffer();
	GL.bindBuffer(GL.ARRAY_BUFFER, vertexBuffer);
	GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(triangle_vertex), GL.STATIC_DRAW);
	// faces
	var triangle_faces = [0,1,2,3,0,2];
	var indexBuffer = GL.createBuffer();
	GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, indexBuffer);
	GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(triangle_faces), GL.STATIC_DRAW);
	
	// Drawing
	GL.clearColor(0,0,0,0);
	var animate = function()
	{
		GL.viewport(0, 0, canvas.width, canvas.height);
		GL.clear(GL.COLOR_BUFFER_BIT);
		
		// draw
		GL.bindBuffer(GL.ARRAY_BUFFER, vertexBuffer);
		GL.vertexAttribPointer(_position, 2, GL.FLOAT, false, 4*(2+3), 0);
		GL.vertexAttribPointer(_color, 3, GL.FLOAT, false, 4*(2+3), 4*2);
		GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, indexBuffer);
		GL.drawElements(GL.TRIANGLES, triangle_faces.length, GL.UNSIGNED_SHORT, 0);

		GL.flush(); 
		window.requestAnimationFrame(animate); // redraw the scene
	}
	
	animate(); // first launch
}
