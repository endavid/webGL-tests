attribute vec3 position;
varying vec2 vUV;
void main(void) {
	gl_Position = vec4(position, 1.);
	vUV = 0.5 * position.xy + 0.5;
}
