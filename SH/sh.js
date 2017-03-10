
// ============================================
/// Class to init resources
function Resources(gl, width, height)
{
  this.gl = gl;
  this.width = width;
  this.height = height;
  // state
  this.oldFBO = 0;
  this.oldRBO = 0;
  this.oldViewport = [0,0,1,1];
  // shaders & attributes & uniforms
  this.shader = {};
  this.attrib = {};
  this.uniform = {};
  // buffers
  this.buffer = {};
  // WebGL extensions
  this.extFloat = null;
  this.initExtensions();
}

Resources.prototype.initExtensions = function()
{
  // @todo compute Spherical Harmonics in the GPU using float textures
  this.extFloat = this.gl.getExtension('OES_texture_float');
  if (!this.extFloat) {
    alert("Missing OES_texture_float extension!");
    return false;
  }
};

Resources.prototype.setDefaultTextureParameters = function()
{
  var gl = this.gl;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); // can't use LINEAR with FLOAT textures :(
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S,     gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T,     gl.CLAMP_TO_EDGE);
};

// ----------------------------------------------
// State
// ----------------------------------------------
Resources.prototype.pushFramebuffer = function()
{
  this.oldFBO = this.gl.getParameter(this.gl.FRAMEBUFFER_BINDING);
};
Resources.prototype.pushRenderbuffer = function()
{
  this.oldRBO = this.gl.getParameter(this.gl.RENDERBUFFER_BINDING);
};
Resources.prototype.pushViewport = function()
{
  this.oldViewport = this.gl.getParameter(this.gl.VIEWPORT);
};
Resources.prototype.popFramebuffer = function()
{
  this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.oldFBO);
};
Resources.prototype.popRenderbuffer = function()
{
  this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.oldRBO);
};
Resources.prototype.popViewport = function()
{
  var v = this.oldViewport;
  this.gl.viewport(v[0], v[1], v[2], v[3]);
};


// ============================================
function CanvasRenderer(canvasId)
{
  var self = this;
  this.canvas = document.getElementById(canvasId);
  this.mouseState = {
    amortization: 0.95,
    drag: false,
    old_x: 0,
    old_y: 0,
    dX: 0,
    dY: 0,
    theta: 0,
    phi: 0,
  };
  this.mouseDown = function(e) {
    self.mouseState.drag=true;
    self.mouseState.old_x=e.pageX;
    self.mouseState.old_y=e.pageY;
    e.preventDefault();
    return false;
  };
  this.mouseUp = function(e) {
    self.mouseState.drag=false;
  };
  this.mouseMove = function(e) {
    if (!self.mouseState.drag)
      return false;
    self.mouseState.dX=(e.pageX-self.mouseState.old_x)*Math.PI/self.canvas.width;
    self.mouseState.dY=(e.pageY-self.mouseState.old_y)*Math.PI/self.canvas.height;
    self.mouseState.theta += self.mouseState.dX;
    self.mouseState.phi += self.mouseState.dY;
    self.mouseState.old_x=e.pageX;
    self.mouseState.old_y=e.pageY;
    e.preventDefault();
  };
  // matrices
  this.projectionMatrix = MATH.getProjection(40, this.canvas.width/this.canvas.height, 1, 100);
  this.modelMatrix = MATH.getI4();
  this.viewMatrix = MATH.getI4();


  // Overwrite this function with your custom stuff
  this.drawModel = function() {
  };

  this.resources = {};

  if (this.init())
  {
    this.start = function() {
      var gl = self.resources.gl;
      var res = self.resources;
      MATH.translateZ(self.viewMatrix, -2);

      // Drawing
      gl.clearColor(0,0,0,1);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.clearDepth(1.0);
      var time_old=0;
      var animate = function(time)
      {
        var dt=time-time_old;
        if (!self.mouseState.drag) {
          self.mouseState.dX*=self.mouseState.amortization;
          self.mouseState.dY*=self.mouseState.amortization;
          self.mouseState.theta+=self.mouseState.dX;
          self.mouseState.phi+=self.mouseState.dY;
        }
        MATH.setI4(self.modelMatrix);
        MATH.rotateY(self.modelMatrix, self.mouseState.theta);
        MATH.rotateX(self.modelMatrix, self.mouseState.phi);
        time_old=time;

        gl.viewport(0, 0, self.canvas.width, self.canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // should be overwritten
        self.drawModel();

        gl.flush();
        window.requestAnimationFrame(animate); // redraw the scene
      };

      animate(0); // first lunch

    };
  } else {
    this.start = function() {
      console.log("Failed to initialize canvas.");
    };
  }
}

CanvasRenderer.prototype.init = function()
{
  // Register mouse event listeners
  this.canvas.addEventListener("mousedown", this.mouseDown, false);
  this.canvas.addEventListener("mouseup", this.mouseUp, false);
  this.canvas.addEventListener("mouseout", this.mouseUp, false);
  this.canvas.addEventListener("mousemove", this.mouseMove, false);
  // Get WebGL context
  var gl;
  try {
    gl = this.canvas.getContext("experimental-webgl", {antialias: true});
  } catch (e) {
    alert("Your browser is not WebGL compatible :(");
    return false;
  }
  // Resources
  this.resources = new Resources(gl, this.canvas.width, this.canvas.height);
  return true;
};

// ============================================
/// To draw colored points
function DotRenderer(canvasId)
{
  var self = this;
  this.renderer = new CanvasRenderer(canvasId);
  var res = self.renderer.resources;
  var gl = res.gl;
  // create shaders & attributes
  this.initShaders();
  // create vertex buffers
  res.buffer.dots = gl.createBuffer();
  res.buffer.dotsColor = gl.createBuffer();
    // overwrite draw function
  this.renderer.drawModel = function() {
    gl.useProgram(res.shader.color);
    gl.uniformMatrix4fv(res.uniform.color.Pmatrix, false, self.renderer.projectionMatrix);
    gl.uniformMatrix4fv(res.uniform.color.Vmatrix, false, self.renderer.viewMatrix);
    gl.uniformMatrix4fv(res.uniform.color.Mmatrix, false, self.renderer.modelMatrix);
    gl.bindBuffer(gl.ARRAY_BUFFER, res.buffer.dots);
    gl.vertexAttribPointer(res.attrib.color.position, res.buffer.dots.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, res.buffer.dotsColor);
    gl.vertexAttribPointer(res.attrib.color.color, res.buffer.dotsColor.itemSize, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.POINTS, 0, res.buffer.dots.numItems);
  };
}

// dots for debugging samples
DotRenderer.prototype.setDots = function(vertices, colors)
{
  var res = this.renderer.resources;
  var gl = res.gl;
  gl.bindBuffer(gl.ARRAY_BUFFER, res.buffer.dots);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  res.buffer.dots.itemSize = 3;
  res.buffer.dots.numItems = vertices.length / 3;
  gl.bindBuffer(gl.ARRAY_BUFFER, res.buffer.dotsColor);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
  res.buffer.dotsColor.itemSize = 4;
  res.buffer.dotsColor.numItems = colors.length / 4;
};

DotRenderer.prototype.initShaders = function()
{
  var res = this.renderer.resources;
  var gl = res.gl;
  res.shader.color = GFX.useShader(gl, "shaders/geometryColor.vs", "shaders/color.fs");
  // vertex attributes
  res.attrib.color = {};
  res.attrib.color.color = gl.getAttribLocation(res.shader.color, "color");
  res.attrib.color.position = gl.getAttribLocation(res.shader.color, "position");
  // uniforms
  res.uniform.color = {};
  res.uniform.color.Pmatrix = gl.getUniformLocation(res.shader.color, "Pmatrix");
  res.uniform.color.Vmatrix = gl.getUniformLocation(res.shader.color, "Vmatrix");
  res.uniform.color.Mmatrix = gl.getUniformLocation(res.shader.color, "Mmatrix");
  gl.enableVertexAttribArray(res.attrib.color.color);
  gl.enableVertexAttribArray(res.attrib.color.position);
};
