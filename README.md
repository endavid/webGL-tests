Test WebGL
===========
* http://analyticalgraphicsinc.github.io/webglreport/


Learn WebGL
=============
* http://www.webglacademy.com/
* WebGL cheat sheet https://www.khronos.org/files/webgl/webgl-reference-card-1_0.pdf
* For the MRT demos, you'll need these extensions, 
 * WEBGL\_draw\_buffers, and
 * OES\_texture\_float.
 * To use WEBGL\_draw\_buffers in Firefox, browse to about:config and turn on webgl.enable-draft-extensions.
 * Check https://hacks.mozilla.org/2014/01/webgl-deferred-shading/


Troubleshooting
================

Debugging
----------
* WebGL debugging tools: http://www.realtimerendering.com/blog/webgl-debugging-and-profiling-tools/
* For Chrome, http://www.html5rocks.com/en/tutorials/canvas/inspection/

No image
---------
    SecurityError: Failed to execute 'texImage2D' on 'WebGLRenderingContext': The cross-origin image at file:///E:/projects/webGL/tutorials/resources/snakeIcon.png may not be loaded.

This happens in Chrome. Either, 
 * Load the page from a web server, or 
 * use Firefox, or
 * Start Chrome with these arguments:
    --allow-file-access-from-files --allow-file-access --allow-cross-origin-auth-prompt



Can't read local JSON file
---------------------------
Same problem as above, plus the function in webglacademy tutorial doesn't work even adding

    xmlHttp.overrideMimeType("application/json");

Better use jQuery.

	$.getJSON("myfile.json", callback);


