(function() {
  "use strict";

  var ViewParameters = {
    imageUri: "../modelViewer/resources/UVTextureChecker4096.png"
  };

  /// Class to init resources
  function Resources(gl, callback) {
    this.gl = gl;
    this.shaderEac = null;
    this.uniforms = null;
    this.attribs = null;
    this.initGeometry();
    this.initShaders(callback);
  }
  Resources.prototype.initShaders = function(callback)
  {
    var gl = this.gl;
    var self = this;
    window.GFX.useShader(gl, "shaders/fullscreen.vs", "shaders/identity.fs", function(shaderProgram) {
      self.shaderEac = shaderProgram;
      // vertex attributes
      self.attribs = {
        position: gl.getAttribLocation(self.shaderEac, "position")
      };
      // uniforms
      self.uniforms = {
        sampler: gl.getUniformLocation(self.shaderEac, "sampler")
      };
      var attribKeys = Object.keys(self.attribs);
      for (var i = 0; i < attribKeys.length; i++ ) {
        gl.enableVertexAttribArray(self.attribs[attribKeys[i]]);
      }
      if (callback) {
        callback();
      }
    });
  };
  Resources.prototype.initGeometry = function()
  {
  	var gl = this.gl;
  	// geometry
  	this.quad = [ // xyz
  		-1, -1, 0,
  		-1,  1, 0,
  		 1, -1, 0,
  		 1,  1, 0,
  	];
  	this.quadFaces = [0, 2, 1, 3];
  	this.quadVB = gl.createBuffer();
  	gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVB);
  	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.quad), gl.STATIC_DRAW);
  	this.quadIB = gl.createBuffer();
  	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.quadIB);
  	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.quadFaces), gl.STATIC_DRAW);
  };
  Resources.prototype.setDefaultTextureParameters = function()
  {
    var gl = this.gl;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S,     gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T,     gl.CLAMP_TO_EDGE);
  };
  Resources.prototype.drawFullScreenQuad = function()
  {
  	var gl = this.gl;
  	gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVB);
  	gl.vertexAttribPointer(this.attribPosition, 3, gl.FLOAT, false, 4*3, 0);
  	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.quadIB);
  	gl.drawElements(gl.TRIANGLE_STRIP, this.quadFaces.length, gl.UNSIGNED_SHORT, 0);
  };

  function main() {
    var canvas = document.getElementById("glCanvas");
    // Get WebGL context
    var gl;
    try {
      // preserveDrawingBuffer: so we can save a screenshot
      gl = canvas.getContext("experimental-webgl", {antialias: true, preserveDrawingBuffer: true});
    } catch (e) {
      alert("Your browser is not WebGL compatible :(");
      return false;
    }
    var texture;
    // global load texture function
    window.loadTexture = function(url, callback) {
      window.GFX.destroyBuffers(gl, {}); // clear texture cache
      window.GFX.loadTexture(gl, url, false, function(img) {
        texture = img;
        animate(0);
        if (callback) {
          callback();
        }
      });
    };
    // init Resources
    var res = new Resources(gl, function() {
      window.loadTexture(ViewParameters.imageUri);
    });

    // Drawing
    gl.clearColor(0,0,0,1);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false); // disable zwrite
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    var animate = function(time) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(res.shaderEac);
      gl.uniform1i(res.uniforms.sampler, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture.webglTexture);
      res.drawFullScreenQuad();
      gl.flush();
      //window.requestAnimationFrame(animate); // redraw the scene
    };
  }

  $( document ).ready(function() {
    main();
  });

})();
