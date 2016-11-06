(function() {
  "use strict";
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
					if (m.albedoMap && m.albedoMap.webglTexture) {
						gl.deleteTexture(m.albedoMap.webglTexture);
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
		loadModel: function(gl, params, modelData, callback)
		{
			var loaders = {
				loadModelJson: function() {
					$.getJSON(params.model.uri, function(model) {
						GFX.initModelFromJson(gl, modelData, params.imageUris, model);
						callback();
					});
				},
				loadModelObj: function()
				{
					GFX.modelFileToJson(params, function(model) {
						GFX.initModelFromJson(gl, modelData, params.imageUris, model);
						callback();
					});
				}
			};
			var ext = GFX.getModelFileExtension(params.model);
			var fn = loaders["loadModel"+ext];
			if(ext !== "" && typeof fn === 'function') {
				// free previous resources
				GFX.destroyBuffers(gl, modelData);
				modelData.modelURL = params.model.uri;
				fn();
			} else {
				window.alert("Unsupported format: "+ext);
			}
		},

		// format:
		// { name: // model name
    //   materials: {
    //     "name": {
    //       albedoMap: "image.png",
    //     }
    //   },
		//   vertices: // float array in this order: position (3), normal (3), uv (2)
		//   meshes: // array of submeshes
		//      [ {material: // material reference
		//				 indices: // faces of the submesh
		//			}]
		// }
		initModelFromJson: function(gl, modelData, imageUris, model) {
			//vertices
			modelData.vertexBuffer= gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, modelData.vertexBuffer);
			gl.bufferData(gl.ARRAY_BUFFER,
										new Float32Array(model.vertices),
				            gl.STATIC_DRAW);
			//submeshes
			modelData.meshes=[];
			model.meshes.forEach(function (m){
        var mat = m.material !== undefined ? model.materials[m.material] || {} : {};
				var albedoMapName = mat.albedoMap || "missing";
        // if the .dds texture is missing, try to find equivalent .png
        var albedoMapUri = imageUris[albedoMapName] || imageUris[GFX.getFileNameWithoutExtension(albedoMapName)+".png"];
				var mesh = {
					indexBuffer: gl.createBuffer(),
					numPoints: m.indices.length,
					albedoMap: albedoMapUri !== undefined ? GFX.loadTexture(gl, albedoMapUri) : false
				};
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
				gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
											new Uint16Array(m.indices), // 32-bit for more than 64K verts
					gl.STATIC_DRAW);
				modelData.meshes.push(mesh);
			});
		},

		modelFileToJson: function(params, callback)
		{
			var ext = GFX.getModelFileExtension(params.model);
			if (ext === "Obj") {
				$.ajax({
					async: true,
					url: params.model.uri,
					success: function(data) {
						var model = window.WavefrontUtils.parseObjWavefront(data);
            model.name = GFX.getFileNameWithoutExtension(params.model.name) + ".json";
            if (model.materialFile !== undefined && params.materialUris[model.materialFile] !== undefined) {
              $.ajax({
      					async: true,
      					url: params.materialUris[model.materialFile],
      					success: function(mtldata) {
                  model.materials = window.WavefrontUtils.parseMaterial(mtldata);
      						callback(model);
      					},
      					dataType: 'text'
      				});
            }
            else {
						  callback(model);
            }
					},
					dataType: 'text'
				});
			} else if (ext === "Json") {
				$.getJSON(params.model.uri, function(model) {
					callback(model);
				});
			}
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

		getModelFileExtension: function(modelFile) {
			var ext = GFX.getFileExtension(modelFile.uri);
			if (ext === "") {
				ext = GFX.getFileExtension(modelFile.name);
			}
			return ext;
		},

		exportModel: function(params, modelType) {
			var ext = GFX.getModelFileExtension(params.model);
			var filename = GFX.getFileNameWithoutExtension(params.model.name);
			var onExportSuccess = function(text) {
				saveAs(
					new Blob([text], {type: "text/plain;charset=" + document.characterSet}),
					filename + modelType
				);
			};
			GFX.modelFileToJson(params, function(model) {
				if (modelType === ".obj") {
					window.WavefrontUtils.exportObjModel(model, onExportSuccess);
				} else if (modelType === ".json") {
					var out = JSON.stringify(model, null, "  ");
					onExportSuccess(out);
				} else {
					console.error("Unsupported model type: "+modelType);
				}
			});
		}
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

	// export libs
	window.GFX = GFX;
	window.MATH = MATH;

})();
