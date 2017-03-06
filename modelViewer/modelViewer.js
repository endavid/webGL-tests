(function() {
  "use strict";

  var ViewParameters = {
    model: {
        name: "pear.json",
        uri: "resources/pear.json",
    },
    imageUris: {
      "banana.png": "resources/banana.png",
      "orange.png": "resources/orange.png",
      "pear.png": "resources/pear.png",
      "white": "resources/white.png",
      "missing": "resources/UVTextureChecker4096.png"
    },
    materialUris: {
    },
    isZAxisUp: false,
    isLockRotationY: false,
    isLockRotationX: false,
    modelRotationTheta: 0,
    modelRotationPhi: 0,
    cameraDistance: -6,
    cameraHeight: -0.7,
    lightDirection: [0.21, 0.072, 0.71],
    needsReload: false,
    onRotation: function() {},
  };

  // ============================================
  /// Class to init resources
  function Resources(gl, width, height)
  {
    this.gl = gl;
    this.width = width;
    this.height = height;
    // shaders
    this.shaderLit = null;
    this.uniforms = null;
    this.attribs = null;
    this.initShaders();
  }

  Resources.prototype.initShaders = function()
  {
    var gl = this.gl;
    var self = this;
    this.shaderLit = window.GFX.useShader(gl, "shaders/geometry.vs", "shaders/lighting.fs", function(shaderProgram) {
      self.shaderLit = shaderProgram;
      // vertex attributes
      self.attribs = {
        uv:       gl.getAttribLocation(self.shaderLit, "uv"),
        position: gl.getAttribLocation(self.shaderLit, "position"),
        normal:   gl.getAttribLocation(self.shaderLit, "normal")
      };
      // uniforms
      self.uniforms = {
        matrixP: gl.getUniformLocation(self.shaderLit, "Pmatrix"),
        matrixV: gl.getUniformLocation(self.shaderLit, "Vmatrix"),
        matrixM: gl.getUniformLocation(self.shaderLit, "Mmatrix"),
        lightDirection: gl.getUniformLocation(self.shaderLit, "lightDirection"),
        sampler: gl.getUniformLocation(self.shaderLit, "sampler")
      };
      var attribKeys = Object.keys(self.attribs);
      for (var i = 0; i < attribKeys.length; i++ ) {
        gl.enableVertexAttribArray(self.attribs[attribKeys[i]]);
      }
    });
  };

  Resources.prototype.setDefaultTextureParameters = function()
  {
    var gl = this.gl;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); // can't use LINEAR with FLOAT textures :(
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S,     gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T,     gl.CLAMP_TO_EDGE);
  };

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
    };

    var mouseDown=function(e) {
      drag=true;
      old_x=e.pageX;
      old_y=e.pageY;
      e.preventDefault();
      return false;
    };

    var mouseUp=function(e){
      drag=false;
    };

    var mouseMove=function(e) {
      if (!drag) return false;
      dX=(e.pageX-old_x)*Math.PI/canvas.width;
      dY=(e.pageY-old_y)*Math.PI/canvas.height;
      updateViewRotation(dX, dY);
      old_x=e.pageX;
      old_y=e.pageY;
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
    var whiteTexture = window.GFX.loadTexture(gl, ViewParameters.imageUris.white);
    // ------------------------------------
    // model data
    // ------------------------------------
    var modelData = {
      modelURL: "",
      vertexBuffer: false,
      meshes: false
    };
    window.GFX.loadModel(gl, ViewParameters, modelData, function() {animate(0);});

    // ------------------------------------
    // matrices
    // ------------------------------------
    var projectionMatrix = window.MATH.getProjection(40, canvas.width/canvas.height, 0.1, 50);
    var modelMatrix = window.MATH.getI4();
    var viewMatrix = window.MATH.getI4();

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

      if (ViewParameters.model.uri !== modelData.modelURL || ViewParameters.needsReload) {
        ViewParameters.needsReload = false;
        window.GFX.loadModel(gl, ViewParameters, modelData, function() {
          console.log("Loaded: "+modelData.modelURL);
        });
      }

      if (!drag) {
        dX*=amortization;
        dY*=amortization;
        updateViewRotation(dX, dY);
      }
      window.MATH.setI4(modelMatrix);
      window.MATH.rotateY(modelMatrix, ViewParameters.modelRotationTheta);
      window.MATH.rotateX(modelMatrix, ViewParameters.modelRotationPhi);
      window.MATH.setI4(viewMatrix);
      window.MATH.translateZ(viewMatrix, ViewParameters.cameraDistance);
      window.MATH.translateY(viewMatrix, ViewParameters.cameraHeight);

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      if (modelData.vertexBuffer && res.shaderLit) {
        gl.useProgram(res.shaderLit);
        gl.uniform1i(res.uniforms.sampler, 0);
        gl.uniformMatrix4fv(res.uniforms.matrixP, false, projectionMatrix);
        gl.uniformMatrix4fv(res.uniforms.matrixV, false, viewMatrix);
        gl.uniformMatrix4fv(res.uniforms.matrixM, false, modelMatrix);
        gl.uniform3f(res.uniforms.lightDirection, ViewParameters.lightDirection[0], ViewParameters.lightDirection[1], ViewParameters.lightDirection[2]);
        gl.bindBuffer(gl.ARRAY_BUFFER, modelData.vertexBuffer);
        gl.vertexAttribPointer(res.attribs.position, 3, gl.FLOAT, false, 4*(3+3+2), 0);
        gl.vertexAttribPointer(res.attribs.normal, 3, gl.FLOAT, false, 4*(3+3+2), 4*3);
        gl.vertexAttribPointer(res.attribs.uv, 2, gl.FLOAT, false, 4*(3+3+2), 4*(3+3));

        // draw all submeshes
        modelData.meshes.forEach(function (mesh) {
          gl.activeTexture(gl.TEXTURE0);
          var albedoMap = mesh.albedoMap || whiteTexture;
          if (albedoMap.webglTexture) {
            gl.bindTexture(gl.TEXTURE_2D, mesh.albedoMap.webglTexture);
          }
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
          gl.drawElements(gl.TRIANGLES, mesh.numPoints, gl.UNSIGNED_SHORT, 0);
        });
      }

      gl.flush();
      window.requestAnimationFrame(animate); // redraw the scene
    };
  };

  $( document ).ready(function() {
  //window.addEventListener('load', function() {
    main();
  });

  // Exposed globals (needed in controls.js)
  window.ViewParameters = ViewParameters;

})();
