precision mediump float;
uniform sampler2D texAccumulation;
uniform sampler2D texReveal;
varying vec2 vUV;
void main(void) {
	vec4 accum = texture2D(texAccumulation, vUV);
    float r = accum.a;
    accum.a = texture2D(texReveal, vUV).r;
    // Blend Func: GL_ONE_MINUS_SRC_ALPHA, GL_SRC_ALPHA
    gl_FragColor = vec4(accum.rgb / clamp(accum.a, 1e-4, 5e4), r);
    //gl_FragColor = accum;
    //gl_FragColor = vec4(vUV,0.,1.);
    //gl_FragColor = vec4(0.01*gl_FragCoord.xy, 0., 1.);
}

