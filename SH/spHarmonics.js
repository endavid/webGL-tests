// requires math.js

// ===================================================================
function sphericalToVector(sph)
{
	theta = sph[0];
	phi = sph[1];
	return [math.sin(theta) * math.sin(phi), math.cos(theta), math.sin(theta) * math.cos(phi)];
}

function createPolarSamplerFromImage(imgData, numBands, faceWidth, faceHeight)
{
	// assume a horizontal cubemap
	var imgWidth = faceWidth * 4;
	var imgHeight = faceHeight * 3;
	// offsets for each face
	var offsets = {
		posx: faceHeight * imgWidth + faceWidth * 2,
		negx: faceHeight * imgWidth,
		posy: faceWidth,
		negy: 2 * faceHeight * imgWidth + faceWidth,
		posz: faceHeight * imgWidth + faceWidth,
		negz: faceHeight * imgWidth + faceWidth * 3
	};
	return function(theta, phi) {
		var vec = sphericalToVector([theta, phi]);
		// find major axis direction
		var d = {
			posx: vec[0],
			negx: -vec[0],
			posy: vec[1],
			negy: -vec[1],
			posz: vec[2],
			negz: -vec[2]
		};
		var maxAxis = "posx";
		var maxAxisValue = d[maxAxis];
		for (var key in d) {
			if (d[key] > maxAxisValue) {
				maxAxis = key;
				maxAxisValue = d[key];
			}
		}
		var sc = 0;
		var tc = 0;
		switch (maxAxis) {
		case "posx":
			sc = -vec[2]; tc = -vec[1];
			break;
		case "negx":
			sc = vec[2]; tc = -vec[1];
			break;
		case "posy":
			sc = vec[0]; tc = vec[2];
			break;
		case "negy":
			sc = vec[0]; tc = -vec[2];
			break;
		case "posz":
			sc = vec[0]; tc = -vec[1];
			break;
		case "negz":
			sc = -vec[0]; tc = -vec[1];
			break;
		}
		// texture coordinates for that face
		var s = ( sc / math.abs(maxAxisValue) + 1.0 ) * 0.5;
		var t = ( tc / math.abs(maxAxisValue) + 1.0 ) * 0.5;
		// sample face
		var faceOffset = offsets[maxAxis] * numBands;
		var i = parseInt(s * faceWidth) % faceWidth;
		var j = parseInt(t * faceHeight) % faceHeight;
		var k = faceOffset + i * numBands + numBands * imgWidth * j;
		var r = imgData[k];
		var g = imgData[k+1];
		var b = imgData[k+2];
		return [r, g, b, 1.0];
	};
}

/**
 * @param k: signed distance / radius of sphere (original distance to light)
 */
function createDistanceAngularScalingFn(k)
{
	return function(theta) {
		var cth = math.cot(theta);
		return 2.0 * math.atan((math.sqrt(cth*cth+1-k*k)-cth)/(1+k));
	};
}

// ===================================================================
/**
 * Class to compute Spherical Harmonics
 * Ref. "Spherical Harmonics Lighting: The Gritty Details", Robin Green
 */
function SphericalHarmonics(numBands, numSamples)
{
	this.numBands = numBands;
	this.numSamplesSqrt = parseInt(math.sqrt(numSamples));
	this.numSamples = this.numSamplesSqrt * this.numSamplesSqrt;
	this.numCoeffs = numBands * numBands;
	this.samples = [];
	this.coeffs = [];
	for (var i = 0; i < this.numCoeffs; ++i) {
		this.coeffs.push([0, 0, 0]);
	}
	this.scaleMatrix = []; // used to scale the coefficients
	// store (l,m) values, useful for looping
	this.lmPairs = [];
	for(var l=0; l<this.numBands; ++l) {
		for(var m=-l; m<=l; ++m) {
			var ci = l * (l+1) + m // coefficient index
			this.lmPairs[ci] = [l, m];
		}
	}
	this.setupSphericalSamples();
}

// @todo This could be parallelized in the GPU 
SphericalHarmonics.prototype.setupSphericalSamples = function()
{
	// fill an N*N*2 array with uniformly distributed
	// samples across the sphere using jittered stratification
	var oneoverN = 1.0 / this.numSamplesSqrt;
	for (a = 0; a < this.numSamplesSqrt; ++a) {
		for (b = 0; b < this.numSamplesSqrt; ++b) {
			x = (a + math.random()) * oneoverN;
			y = (b + math.random()) * oneoverN;
			theta = 2.0 * math.acos(math.sqrt(1.0 - x));
			phi = 2.0 * math.pi * y;
			var s = {}
			s.sph = [theta, phi];
			s.vec = sphericalToVector(s.sph);
			s.coeff = []
			// precompute all SH coefficients for this sample
			for(l=0; l<this.numBands; ++l) {
				for(m=-l; m<=l; ++m) {
					index = l*(l+1)+m;
					s.coeff[index] = this.SH(l,m,theta,phi);
				}
			}
			// add sample
			this.samples.push(s);
		}
	}
}

/// evaluate an Associated Legendre Polynomial P(l,m,x) at x
SphericalHarmonics.prototype.P = function(l, m, x)
{
	pmm = 1.0;
	if(m>0) {
		somx2 = math.sqrt((1.0-x)*(1.0+x));
		fact = 1.0;
		for(i=1; i<=m; i++) {
			pmm *= (-fact) * somx2;
			fact += 2.0;
		}
	}
	if (l==m) 
		return pmm;
	pmmp1 = x * (2.0*m+1.0) * pmm;
	if (l==m+1)
		return pmmp1;
	pll = 0.0;
	for (ll=m+2; ll<=l; ++ll) {
		pll = ( (2.0*ll-1.0)*x*pmmp1-(ll+m-1.0)*pmm ) / (ll-m);
		pmm = pmmp1;
		pmmp1 = pll;
	}
	return pll;
}

// renormalisation constant for SH function
SphericalHarmonics.prototype.K = function(l, m)
{
	kk = ((2.0*l+1.0)*math.factorial(l-m)) / (4.0*math.pi*math.factorial(l+m));
	return math.sqrt(kk);
}

/** return a point sample of a Spherical Harmonic basis function
 *  l is the band, range [0..N]
 *  m in the range [-l..l]
 *  theta in the range [0..Pi]
 *  phi in the range [0..2*Pi]
 */
SphericalHarmonics.prototype.SH = function(l, m, theta, phi)
{
	sqrt2 = math.sqrt(2.0);
	if (m==0) 
		return this.K(l,0)*this.P(l,m,math.cos(theta));
	else if(m>0) 
		return sqrt2*this.K(l,m)*math.cos(m*phi)*this.P(l,m,math.cos(theta));
	else 
		return sqrt2*this.K(l,-m)*math.sin(-m*phi)*this.P(l,-m,math.cos(theta));
}

/**
 * Projects a polar function and computes the SH Coeffs
 * @param fn the Polar Function. If the polar function is an image, pass a function that retrieves (R,G,B) values from it given a spherical coordinate.
 */
SphericalHarmonics.prototype.projectPolarFn = function(fn) 
{
	weight = 4.0*math.pi
	// for each sample
	for (i = 0; i<this.numSamples; ++i) {
		theta = this.samples[i].sph[0];
		phi = this.samples[i].sph[1];
		for (n = 0; n < this.numCoeffs; ++n) {
			this.coeffs[n] = math.add(this.coeffs[n], math.multiply(fn(theta,phi).slice(0, 3),  this.samples[i].coeff[n]));
		}
	}
	// divide the result by weight and number of samples
	factor = weight / this.numSamples
	for (i = 0; i < this.numCoeffs; ++i) {
		this.coeffs[i] = math.multiply(this.coeffs[i], factor);
	}
	// compute matrices for later
	//computeIrradianceApproximationMatrices()
	return this.coeffs;
}

/**
 * Reconstruct the approximated function for the given input direction
 */
SphericalHarmonics.prototype.reconstruct = function(theta, phi)
{
	var o = [0, 0, 0];
	for(var l=0; l<this.numBands; ++l) {
		for(var m=-l; m<=l; ++m) {
			var ci = l * (l+1) + m // coefficient index
			var sh = this.SH(l,m,theta,phi);
			o = math.add(o, math.multiply(sh, this.coeffs[ci]));
		}
	}
	return o;
}

/**
 * Compute a scaling transformation matrix.
 * This function yields when the computation is taking too long.
 * @param scalingFn: angular scaling function
 * @param updateFn: callback to trigger after every chunk
 * @param finishFn: callback to trigger after all is done
 */
SphericalHarmonics.prototype.yieldComputeScaleMatrix = function(scalingFn, updateFn, finishedFn)
{
	var self = this;
	var c = 0, i = 0, j = 0, n = 0, yieldCounter = 0;
	var chunkSize = 25; // yield every "chunkSize" processed blocks
	// totalChunkSize = chunkSize * numCoeffs * numCoeffs = 2025
	// init the scale matrix
	this.scaleMatrix = [];
	var row = [];
	for (i = 0; i < this.numCoeffs; ++i) {
		row.push(0);
	}
	for (i = 0; i < this.numCoeffs; ++i) {
		this.scaleMatrix.push(row);
	}
	// create a function to do a chunk of work, and call it
	(function chunk() {
		var end = Math.min(n + chunkSize, self.numSamples);
		for (;n<end;++n) {
			var theta = self.samples[n].sph[0];
			var phi = self.samples[n].sph[1];
			var scaledTheta = scalingFn(theta);
			var nu = Math.sin(theta);
			for (i=0;i<self.numCoeffs;++i) {
				var lm0 = self.lmPairs[i];
				//var shi = self.samples[n].coeff[i]; // precomputed
				var shi = self.SH(lm0[0], lm0[1], theta, phi);
				for (j=0;j<self.numCoeffs;++j) {
					var lm = self.lmPairs[j];
					var shj = self.SH(lm[0], lm[1], scaledTheta, phi);
					self.scaleMatrix[i][j] += shj * shi; 
				}
			}
			updateFn.call(null, n / self.numSamples); // percentage completed
		}
		if (n < self.numSamples) {
			setTimeout(chunk, 0);
		} else {
			self.scaleMatrix = math.multiply(4.0*math.PI/self.numSamples, self.scaleMatrix);
			finishedFn.call(null);
		}
	})();	
}

 

