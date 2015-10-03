precision mediump float;
uniform sampler2D sampler;
varying vec2 vUV;
varying vec3 vNormal;
void main(void) {
	//gl_FragColor = vec4(vNormal, 1.0);
	float fakeShading = dot(vec3(0.21, 0.072, 0.71), vNormal);
	vec4 c = texture2D(sampler, vUV);
	gl_FragColor = c;
}
