precision mediump float;
uniform sampler2D sampler;
uniform vec3 lightDirection;
varying vec2 vUV;
varying vec3 vNormal;
void main(void) {
	vec4 albedo = texture2D(sampler, vUV);
	float incidentCos = dot(lightDirection, vNormal);
	vec4 color = vec4(albedo.rgb * incidentCos, albedo.a);
	gl_FragColor = color;
	//gl_FragColor = vec4(vNormal, 1.0);
}
