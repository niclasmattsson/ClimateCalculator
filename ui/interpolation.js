// Interpolate using cubic Hermite splines. The breakpoints in arrays xbp and ybp are assumed to be sorted.
// Evaluate the function in all points of the array xeval.
function interpolateCubicHermite(xeval, xbp, ybp) {
    // first we need to determine tangents (m)
    var n = xbp.length;
    var obj = calcTangents(xbp, ybp, interpolationmethod, cardinaltension);
    m = obj.m;          // length n
    delta = obj.delta;  // length n-1
    var c = new Array(n-1);
    var d = new Array(n-1);
    if (interpolationmethod.toLowerCase() == 'linear') {
        for (var k=0; k < n-1; k++) {
            m[k] = delta[k];
            c[k] = d[k] = 0;
        }
    } else if (interpolationmethod.toLowerCase() == 'exponential') {
        for (var k=0; k < n-1; k++) {
            m[k] = Math.pow(ybp[k+1]/ybp[k], 1/(xbp[k+1] - xbp[k])) - 1;
            c[k] = d[k] = 0;
        }
    } else {
        for (var k=0; k < n-1; k++) {
            var xdiff = xbp[k+1] - xbp[k];
            c[k] = (3*delta[k] - 2*m[k] - m[k+1]) / xdiff;
            d[k] = (m[k] + m[k+1] - 2*delta[k]) / xdiff / xdiff;
        }
    }

    var len = xeval.length;
    var f = new Array(len);
    var k = 0;
    if (interpolationmethod.toLowerCase() == 'exponential') {
        for (var i=0; i < len; i++) {
            var x = xeval[i];
            if (x < xbp[0] || x > xbp[n-1]) {
                throw "interpolateCubicHermite: x value " + x + " outside breakpoint range [" + xbp[0] + ", " + xbp[n-1] + "]";
            }
            while (k < n-1 && x > xbp[k+1]) {
                k++;
            }
            f[i] = ybp[k] * Math.pow(1 + m[k], x - xbp[k]); 
        }
    } else {
        for (var i=0; i < len; i++) {
            var x = xeval[i];
            if (x < xbp[0] || x > xbp[n-1]) {
                throw "interpolateCubicHermite: x value " + x + " outside breakpoint range [" + xbp[0] + ", " + xbp[n-1] + "]";
            }
            while (k < n-1 && x > xbp[k+1]) {
                k++;
            }
            var xdiff = x - xbp[k];
            f[i] = ybp[k] + m[k]*xdiff + c[k]*xdiff*xdiff + d[k]*xdiff*xdiff*xdiff; 
        }
    }
    return f;
}

// Calculate tangents in all breakpoints
function calcTangents(x, y, method, tension) {
    method = typeof method === 'undefined' ? 'fritschbutland' : method.toLowerCase();
    var n = x.length;
    var delta = new Array(n-1);
    var m = new Array(n);
    for (var k=0; k < n-1; k++) {
        var deltak = (y[k+1] - y[k]) / (x[k+1] - x[k]);
        delta[k] = deltak;
        if (k == 0) {   // left endpoint, same for all methods
            m[k] = deltak;
        } else if (method == 'cardinal') {
            m[k] = (1 - tension) * (y[k+1] - y[k-1]) / (x[k+1] - x[k-1]);
        } else if (method == 'fritschbutland') {
            var alpha = (1 + (x[k+1] - x[k]) / (x[k+1] - x[k-1])) / 3;  // Not the same alpha as below.
            m[k] = delta[k-1] * deltak <= 0  ?  0 : delta[k-1] * deltak / (alpha*deltak + (1-alpha)*delta[k-1]);
        } else if (method == 'fritschcarlson') {
            // If any consecutive secant lines change sign (i.e. curve changes direction), initialize the tangent to zero.
            // This is needed to make the interpolation monotonic. Otherwise set tangent to the average of the secants.
            m[k] = delta[k-1] * deltak < 0  ?  0 : (delta[k-1] + deltak) / 2;
        } else if (method == 'steffen') {
            var p = ((x[k+1] - x[k]) * delta[k-1] + (x[k] - x[k-1]) * deltak) / (x[k+1] - x[k-1]);
            m[k] = (Math.sign(delta[k-1]) + Math.sign(deltak)) * 
                                Math.min(Math.abs(delta[k-1]), Math.abs(deltak), 0.5*Math.abs(p));
        } else {    // FiniteDifference
            m[k] = (delta[k-1] + deltak) / 2;
        }
    }
    m[n-1] = delta[n-2];
    if (method != 'fritschcarlson') {
        return {m: m, delta: delta};
    }

    /*
    Fritsch & Carlson derived necessary and sufficient conditions for monotonicity in their 1980 paper. Splines will be
    monotonic if all tangents are in a certain region of the alpha-beta plane, with alpha and beta as defined below.
    A robust choice is to put alpha & beta within a circle around origo with radius 3. The FritschCarlson algorithm
    makes simple initial estimates of tangents and then does another pass over data points to move any outlier tangents
    into the monotonic region. FritschButland & Steffen algorithms make more elaborate first estimates of tangents that
    are guaranteed to lie in the monotonic region, so no second pass is necessary. */
    
    // Second pass of FritschCarlson: adjust any non-monotonic tangents.
    for (var k=0; k < n-1; k++) {
        var deltak = delta[k];
        if (deltak == 0) {
            m[k] = 0;
            m[k+1] = 0;
            continue;
        }
        var alpha = m[k] / deltak;
        var beta = m[k+1] / deltak;
        var tau = 3 / Math.sqrt(Math.pow(alpha,2) + Math.pow(beta,2));
        if (tau < 1) {      // if we're outside the circle with radius 3 then move onto the circle
            m[k] = tau * alpha * deltak;
            m[k+1] = tau * beta * deltak;
        }
    }
    return {m: m, delta: delta};
}

// Calculate tangents in all breakpoints using the FritschButland algorithm (1984, doi:10.1137/0905021).
function calcTangents_old(x, y) {
    var n = x.length;
    var delta = new Array(n-1);
    var m = new Array(n);
    for (var k=0; k < n-1; k++) {
        var deltak = (y[k+1] - y[k]) / (x[k+1] - x[k]);
        delta[k] = deltak;
        if (k == 0) {   // left endpoint
            m[k] = deltak;
        } else {
            var alpha = (1 + (x[k+1] - x[k]) / (x[k+1] - x[k-1])) / 3;
            m[k] = delta[k-1] * deltak <= 0  ?  0 : delta[k-1] * deltak / (alpha*deltak + (1-alpha)*delta[k-1]);
        }
    }
    m[n-1] = delta[n-2];
    return {m: m, delta: delta};
}