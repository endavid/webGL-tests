precision mediump float;
uniform sampler2D sampler;
varying vec2 vUV;
void main(void) {
  vec4 vColor = texture2D(sampler, vUV);
	gl_FragColor = vColor;
  //gl_FragColor = vec4(vUV.xy, 0.0, 1.0);
}
