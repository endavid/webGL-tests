attribute vec3 position;
attribute vec2 uv;
varying vec2 vUV;
void main(void) {
	gl_Position = vec4(position, 1.);
	//vUV = uv; // errr... not sure why uv is 0 atm
	vUV = 0.5 * position.xy + 0.5;
}
