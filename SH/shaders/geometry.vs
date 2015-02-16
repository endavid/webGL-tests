attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
uniform mat4 Pmatrix;
uniform mat4 Vmatrix;
uniform mat4 Mmatrix;
varying vec2 vUV;
varying vec3 vNormal;
varying float fWeight; ///< Weight for the OIT function
void main(void) { // pre-built function
	gl_Position = Pmatrix * Vmatrix * Mmatrix * vec4(position, 1.);
	vNormal = vec3(Mmatrix * vec4(normal, 0.));
	vUV = uv;
	// distance from camera
    float w = gl_Position.z / gl_Position.w;
    // Gaussian
    fWeight = 100.0 * exp(-0.001 * w * w);
}
