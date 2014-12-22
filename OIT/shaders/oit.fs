#extension GL_EXT_draw_buffers : require
precision mediump float;
uniform sampler2D sampler;
varying vec2 vUV;
varying vec3 vNormal;
varying float fWeight;
void main(void) {
	//gl_FragColor = vec4(vNormal, 1.0);
	float fakeShading = dot(vec3(0.21, 0.072, 0.71), vNormal);
	float globalAlpha = 0.6; // for testing
	vec4 c = globalAlpha * texture2D(sampler, vUV);
	// texture has no premultiplied alpha, so apply this,
	c.rgb *= c.a;
	
	// Blend Func: GL_ONE, GL_ONE
    gl_FragData[0] = vec4(c.rgb * fWeight, c.a);
    // Blend Func: GL_ZERO, GL_ONE_MINUS_SRC_ALPHA
    gl_FragData[1] = c.a * fWeight * vec4(1.,1.,1.,1.);
}

