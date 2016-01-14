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

	destroyBuffers: function(gl, modelData)
	{
		if (modelData.meshes) {
			modelData.meshes.forEach(function (m) {
				if (m.texture && m.texture.webglTexture) {
					gl.deleteTexture(m.texture.webglTexture);
				}
				gl.deleteBuffer(m.indexBuffer);
			});
			modelData.meshes = false;
		}
		if (modelData.vertexBuffer) {
			gl.deleteBuffer(modelData.vertexBuffer);
			modelData.vertexBuffer = false;
		}
	},

	// tries to get the datatype
	loadModel: function(gl, model, modelData, callback)
	{
		var ext = GFX.getFileExtension(model.uri);
		if (ext === "") {
			ext = GFX.getFileExtension(model.name);
		}
		var fn = GFX["loadModel"+ext];
		if(ext !== "" && typeof fn === 'function') {
			fn(gl, model.uri, modelData, callback);
		} else {
			window.alert("Unsupported format: "+ext);
		}
		modelData.modelURL = model.uri;
	},

	// format:
	// { name: // model name
	//   vertices: // float array in this order: position (3), normal (3), uv (2)
	//   meshes: // array of submeshes
	//      [ {texture: // texture file name
	//				 indices: // faces of the submesh
	//			}]
	// }
	initModelFromJson: function(gl, modelData, textureDir, model) {
		//vertices
		modelData.vertexBuffer= gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, modelData.vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER,
									new Float32Array(model.vertices),
			gl.STATIC_DRAW);
		//submeshes
		modelData.meshes=[];
		model.meshes.forEach(function (m){
			var mesh = {
				indexBuffer: gl.createBuffer(),
				numPoints: m.indices.length,
				texture: m.texture ? GFX.loadTexture(gl, textureDir + "/" + m.texture) : false
			};
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
										new Uint16Array(m.indices), // 32-bit for more than 64K verts
				gl.STATIC_DRAW);
			modelData.meshes.push(mesh);
		});
	},

	loadModelJson: function(gl, uri, modelData, callback)
	{
		// free previous resources
		GFX.destroyBuffers(gl, modelData);
		modelData.modelURL = uri;
		$.getJSON(uri, function(model) {
			GFX.initModelFromJson(gl, modelData, uri.substr(0,uri.lastIndexOf('/')), model);
			callback();
		});
	},

	parseObjWavefront: function(data) {
		var lines = data.split("\n");
		var positions = [];
		var normals = [];
		var uvs = [];
		var meshes = [];
		var uniqueIndexTriplets = {};
		var model = {
			vertices: [],
			meshes: []
		};
		lines.forEach(function(s) {
			var m;
			m = /v\s(\-?\d+(?:\.\d+)?)\s(\-?\d+(?:\.\d+)?)\s(\-?\d+(?:\.\d+)?)/.exec(s);
			if (m) {
				m.slice(1, 4).forEach(function(val){
					positions.push(parseFloat(val));
				});
				return;
			}
			m = /vn\s(\-?\d+(?:\.\d+)?)\s(\-?\d+(?:\.\d+)?)\s(\-?\d+(?:\.\d+)?)/.exec(s);
			if (m) {
				m.slice(1, 4).forEach(function(val){
					normals.push(parseFloat(val));
				});
				return;
			}
			m = /vt\s(\-?\d+(?:\.\d+)?)\s(\-?\d+(?:\.\d+)?)/.exec(s);
			if (m) {
				uvs.push(parseFloat(m[1]));
				uvs.push(parseFloat(m[2]));
				return;
			}
			m = /usemap\s(.*)/.exec(s);
			if (m) {
				meshes.push({material: m[1], indices: []});
				return;
			}
			m = /f\s(\d+(?:\/\d+){0,2})\s(\d+(?:\/\d+){0,2})\s(\d+(?:\/\d+){0,2})/.exec(s);
			if (m) {
				m.slice(1, 4).forEach(function(val) {
					if (uniqueIndexTriplets[val] === undefined) {
						uniqueIndexTriplets[val] = 1;
					} else {
						uniqueIndexTriplets[val]++;
					}
					meshes[meshes.length-1].indices.push(val);
					//var triplet = val.split("/").map(function(d) {return parseInt(d)-1});
					//meshes[meshes.length-1].indices.push(triplet);
				});
			}
		});
		var countSharedVertices = 0;
		var uniqueIndexKeys = Object.keys(uniqueIndexTriplets);
		var newVertexIndex = 0;
		uniqueIndexKeys.forEach(function(k) {
			if (uniqueIndexTriplets[k] > 1) {
				countSharedVertices++;
			}
			uniqueIndexTriplets[k] = newVertexIndex++;
			var triplet = k.split("/").map(function(d) {return parseInt(d)-1;});
			model.vertices.push(positions[3*triplet[0]]);
			model.vertices.push(positions[3*triplet[0]+1]);
			model.vertices.push(positions[3*triplet[0]+2]);
			model.vertices.push(triplet[1]===undefined?0:normals[3*triplet[1]]);
			model.vertices.push(triplet[1]===undefined?0:normals[3*triplet[1]+1]);
			model.vertices.push(triplet[1]===undefined?0:normals[3*triplet[1]+2]);
			model.vertices.push(triplet[2]===undefined?0:uvs[2*triplet[2]]);
			model.vertices.push(triplet[2]===undefined?0:uvs[2*triplet[2]+1]);
		});
		console.log("# shared vertices: "+countSharedVertices+"/"+positions.length);
		meshes.forEach(function(m){
			var submesh = { texture: m.material, indices: [] };
			// populate with new indices
			m.indices.forEach(function(i) {
				submesh.indices.push(uniqueIndexTriplets[i]);
			});
			model.meshes.push(submesh);
		});
		return model;
	},

	loadModelObj: function(gl, file, modelData, callback)
	{
		$.ajax({
			async: true,
			url: file,
			success: function(data) {
				var model = GFX.parseObjWavefront(data);
				model.name = GFX.getFileNameWithoutExtension(file);
				GFX.initModelFromJson(gl, modelData, file.substr(0,file.lastIndexOf('/')), model);
				callback();
			},
			dataType: 'text'
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

	getFileNameWithoutExtension: function(file) {
		var iSlash = file.lastIndexOf('/')+1;
		var iDot = file.lastIndexOf('.');
		return file.substr(iSlash, iDot - iSlash);
	},

	// returns the extension in Camel case. Eg. Json, Obj
	getFileExtension: function(file) {
		var iDot = file.lastIndexOf('.');
		if (iDot < 0) {
			return "";
		}
		var ext = file.substr(iDot+1).toLowerCase();
		return ext.substr(0,1).toUpperCase()+ext.substr(1);
	},

	exportObjModel: function(file) {
		var filename = GFX.getFileNameWithoutExtension(file);
		$.getJSON(file, function(model) {
			var out = "# Vertices\n";
			var i;
			for (i = 0; i < model.vertices.length; i+=8 ) {
				out += "v " + model.vertices[i] + " " + model.vertices[i+1] + " " + model.vertices[i+2] + "\n";
			}
			out += "# Normals\n";
			for (i = 0; i < model.vertices.length; i+=8 ) {
				out += "vn " + model.vertices[i+3] + " " + model.vertices[i+4] + " " + model.vertices[i+5] + "\n";
			}
			out += "# Texture coordinates\n";
			for (i = 0; i < model.vertices.length; i+=8 ) {
				out += "vt " + model.vertices[i+6] + " " + model.vertices[i+7] + "\n";
			}
			model.meshes.forEach(function (m) {
				out += "usemap " + m.texture + "\n"; // old Wavefront texture map
				for (var i = 0; i < m.indices.length; i+=3 ) {
					var i1 = m.indices[i] + 1;
					var i2 = m.indices[i+1] + 1;
					var i3 = m.indices[i+2] + 1;
					out += "f " + i1 +"/" + i1 + "/" + i1 + " ";
					out += i2 +"/" + i2 + "/" + i2 + " ";
					out += i3 +"/" + i3 + "/" + i3 + "\n";
				}
			});

			saveAs(
				new Blob([out], {type: "text/plain;charset=" + document.characterSet}),
				filename + ".obj"
			);

		});
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
			0.5/tan, 0, 0, 0,
			0, 0.5*a/tan, 0, 0,
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
    m[0]=1; m[1]=0; m[2]=0; m[3]=0;
    m[4]=0; m[5]=1; m[6]=0; m[7]=0;
    m[8]=0; m[9]=0; m[10]=1; m[11]=0;
    m[12]=0; m[13]=0; m[14]=0; m[15]=1;
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
