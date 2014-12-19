Test WebGL
===========
* http://analyticalgraphicsinc.github.io/webglreport/


Learn WebGL
=============
* http://www.webglacademy.com/
* WebGL cheat sheet https://www.khronos.org/files/webgl/webgl-reference-card-1_0.pdf


Troubleshooting
================

No image
---------
    SecurityError: Failed to execute 'texImage2D' on 'WebGLRenderingContext': The cross-origin image at file:///E:/projects/webGL/tutorials/resources/snakeIcon.png may not be loaded.

This happens in Chrome. Load the page from a web server, or use Firefox.


Can't read local JSON file
---------------------------
Same problem as above, plus the function in webglacademy tutorial doesn't work even adding

    xmlHttp.overrideMimeType("application/json");

Better use jQuery.

	$.getJSON("myfile.json", callback);


