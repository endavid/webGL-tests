// Singletons, so defined with object literals
// Ref. http://www.phpied.com/3-ways-to-define-a-javascript-class/

/**
 * Graphics libs
 * They require jQuery
 * Refs: http://stackoverflow.com/questions/5878703/webgl-is-there-an-alternative-to-embedding-shaders-in-html
 */
var GFX = {
	shaderCache: {},
	SHADER_TYPE_FRAGMENT: "x-shader/x-fragment",
	SHADER_TYPE_VERTEX: "x-shader/x-vertex",

	/// Eg. var shaderProgram = GFX.useShader(gl, "shaders/main.vs", "shaders/main.fs");
	useShader: function(gl, vsPath, fsPath)
	{
		GFX.loadShader(vsPath, GFX.SHADER_TYPE_VERTEX);
		GFX.loadShader(fsPath, GFX.SHADER_TYPE_FRAGMENT);
		var vertexShader = GFX.getShader(gl, vsPath);
		var fragmentShader = GFX.getShader(gl, fsPath);
		var prog = gl.createProgram();
		gl.attachShader(prog, vertexShader);
		gl.attachShader(prog, fragmentShader);
		gl.linkProgram(prog);
		if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
			alert("Could not initialise shaders: "+vsPath+", "+fsPath);
		}
		return prog;
	},

	loadShader: function(file, type)
	{
		var cacheLine, shader;
		$.ajax({
			async: false, // wait...
			url: file,
			success: function(data) {
				cacheLine = {script: data, type: type};
			},
			dataType: 'text'
		});
		// store in cache
		GFX.shaderCache[file] = cacheLine;
	},

	getShader: function(gl, id)
	{
		var shaderObj = GFX.shaderCache[id];
		var shaderScript = shaderObj.script;
		var shaderType = shaderObj.type;
		var shader;
		if (shaderType == GFX.SHADER_TYPE_FRAGMENT) {
			shader = gl.createShader(gl.FRAGMENT_SHADER);
		} else if (shaderType == GFX.SHADER_TYPE_VERTEX) {
			shader = gl.createShader(gl.VERTEX_SHADER);
		} else {
			return null;
		}
		gl.shaderSource(shader, shaderScript);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			alert(gl.getShaderInfoLog(shader));
			return null;
		}
		return shader;
	}, // getShader

	loadJsonModel: function(gl, file, modelData, callback)
	{
		$.getJSON(file, function(model) {
			//console.log("Loaded");
			//vertices
			modelData.vertexBuffer= gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, modelData.vertexBuffer);
			gl.bufferData(gl.ARRAY_BUFFER,
										new Float32Array(model.vertices),
				gl.STATIC_DRAW);

			// parent directory of the Json file
			var dir = file.substr(0,file.lastIndexOf('/'));
			//submeshes
			modelData.meshes=[];
			model.meshes.forEach(function (m){
				var mesh = {
					indexBuffer: gl.createBuffer(),
					numPoints: m.indices.length,
					texture: m.texture ? GFX.loadTexture(gl, dir + "/" + m.texture) : false
				};
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
				gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
											new Uint16Array(m.indices), // 32-bit for more than 64K verts
					gl.STATIC_DRAW);
				modelData.meshes.push(mesh);
			});

			callback();
		});
	},

	loadTexture: function(gl, image_URL) {
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
	},
};

/** Math libs */
var MATH = {
	degToRad: function(angle)
	{
		return(angle * Math.PI/180);
	},

	getProjection: function(angle, a, zMin, zMax)
	{
		var tan = Math.tan(MATH.degToRad(0.5*angle)),
			A = -(zMax + zMin)/(zMax - zMin),
			B = (-2*zMax*zMin)/(zMax-zMin);
		return [
			.5/tan, 0, 0, 0,
			0, .5*a/tan, 0, 0,
			0, 0, A, -1,
			0, 0, B, 0
		];
	},

  getI4: function() {
    return [1,0,0,0,
            0,1,0,0,
            0,0,1,0,
            0,0,0,1];
  },

  setI4: function(m) {
    m[0]=1, m[1]=0, m[2]=0, m[3]=0,
      m[4]=0, m[5]=1, m[6]=0, m[7]=0,
      m[8]=0, m[9]=0, m[10]=1, m[11]=0,
      m[12]=0, m[13]=0, m[14]=0, m[15]=1;
  },

  rotateX: function(m, angle) {
    var c=Math.cos(angle);
    var s=Math.sin(angle);
    var mv1=m[1], mv5=m[5], mv9=m[9];
    m[1]=m[1]*c-m[2]*s;
    m[5]=m[5]*c-m[6]*s;
    m[9]=m[9]*c-m[10]*s;

    m[2]=m[2]*c+mv1*s;
    m[6]=m[6]*c+mv5*s;
    m[10]=m[10]*c+mv9*s;
  },

  rotateY: function(m, angle) {
    var c=Math.cos(angle);
    var s=Math.sin(angle);
    var mv0=m[0], mv4=m[4], mv8=m[8];
    m[0]=c*m[0]+s*m[2];
    m[4]=c*m[4]+s*m[6];
    m[8]=c*m[8]+s*m[10];

    m[2]=c*m[2]-s*mv0;
    m[6]=c*m[6]-s*mv4;
    m[10]=c*m[10]-s*mv8;
  },

  rotateZ: function(m, angle) {
    var c=Math.cos(angle);
    var s=Math.sin(angle);
    var mv0=m[0], mv4=m[4], mv8=m[8];
    m[0]=c*m[0]-s*m[1];
    m[4]=c*m[4]-s*m[5];
    m[8]=c*m[8]-s*m[9];

    m[1]=c*m[1]+s*mv0;
    m[5]=c*m[5]+s*mv4;
    m[9]=c*m[9]+s*mv8;
  },

  translateX: function(m, t){
    m[12]+=t;
  },

  translateY: function(m, t){
    m[13]+=t;
  },

  translateZ: function(m, t){
    m[14]+=t;
  }

};
