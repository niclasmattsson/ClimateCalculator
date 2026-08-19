// Cubic Hermite spline interpolation between emission breakpoints.
// Pure: the method and tension are passed in rather than read from application state.

/**
 * Interpolate the breakpoints (xbp, ybp), which must be sorted by x, and evaluate the
 * result at every point of xeval.
 */
export function interpolateCubicHermite(xeval, xbp, ybp, method, tension) {
    const n = xbp.length;
    const { m, delta } = calcTangents(xbp, ybp, method, tension);
    const c = new Array(n - 1);
    const d = new Array(n - 1);
    const lowerMethod = method.toLowerCase();
    const exponential = lowerMethod === "exponential";

    if (lowerMethod === "linear") {
        for (let k = 0; k < n - 1; k++) {
            m[k] = delta[k];
            c[k] = d[k] = 0;
        }
    } else if (exponential) {
        for (let k = 0; k < n - 1; k++) {
            m[k] = Math.pow(ybp[k + 1] / ybp[k], 1 / (xbp[k + 1] - xbp[k])) - 1;
            c[k] = d[k] = 0;
        }
    } else {
        for (let k = 0; k < n - 1; k++) {
            const xdiff = xbp[k + 1] - xbp[k];
            c[k] = (3 * delta[k] - 2 * m[k] - m[k + 1]) / xdiff;
            d[k] = (m[k] + m[k + 1] - 2 * delta[k]) / xdiff / xdiff;
        }
    }

    const f = new Array(xeval.length);
    let k = 0;
    for (let i = 0; i < xeval.length; i++) {
        const x = xeval[i];
        if (x < xbp[0] || x > xbp[n - 1]) {
            throw new Error("interpolateCubicHermite: x value " + x +
                " outside breakpoint range [" + xbp[0] + ", " + xbp[n - 1] + "]");
        }
        while (k < n - 1 && x > xbp[k + 1]) k++;
        if (exponential) {
            f[i] = ybp[k] * Math.pow(1 + m[k], x - xbp[k]);
        } else {
            const xdiff = x - xbp[k];
            f[i] = ybp[k] + m[k] * xdiff + c[k] * xdiff * xdiff + d[k] * xdiff * xdiff * xdiff;
        }
    }
    return f;
}

/** Tangents at every breakpoint, using the requested interpolation method. */
export function calcTangents(x, y, method = "fritschbutland", tension) {
    method = method.toLowerCase();
    const n = x.length;
    const delta = new Array(n - 1);
    const m = new Array(n);

    for (let k = 0; k < n - 1; k++) {
        const deltak = (y[k + 1] - y[k]) / (x[k + 1] - x[k]);
        delta[k] = deltak;
        if (k === 0) {              // left endpoint, same for all methods
            m[k] = deltak;
        } else if (method === "cardinal") {
            m[k] = (1 - tension) * (y[k + 1] - y[k - 1]) / (x[k + 1] - x[k - 1]);
        } else if (method === "fritschbutland") {
            const alpha = (1 + (x[k + 1] - x[k]) / (x[k + 1] - x[k - 1])) / 3;  // Not the same alpha as below.
            m[k] = delta[k - 1] * deltak <= 0 ? 0 : delta[k - 1] * deltak / (alpha * deltak + (1 - alpha) * delta[k - 1]);
        } else if (method === "fritschcarlson") {
            // If any consecutive secant lines change sign (i.e. curve changes direction), initialize the tangent to zero.
            // This is needed to make the interpolation monotonic. Otherwise set tangent to the average of the secants.
            m[k] = delta[k - 1] * deltak < 0 ? 0 : (delta[k - 1] + deltak) / 2;
        } else if (method === "steffen") {
            const p = ((x[k + 1] - x[k]) * delta[k - 1] + (x[k] - x[k - 1]) * deltak) / (x[k + 1] - x[k - 1]);
            m[k] = (Math.sign(delta[k - 1]) + Math.sign(deltak)) *
                Math.min(Math.abs(delta[k - 1]), Math.abs(deltak), 0.5 * Math.abs(p));
        } else {                    // FiniteDifference
            m[k] = (delta[k - 1] + deltak) / 2;
        }
    }
    m[n - 1] = delta[n - 2];

    if (method !== "fritschcarlson") {
        return { m, delta };
    }

    /*
    Fritsch & Carlson derived necessary and sufficient conditions for monotonicity in their 1980 paper. Splines will be
    monotonic if all tangents are in a certain region of the alpha-beta plane, with alpha and beta as defined below.
    A robust choice is to put alpha & beta within a circle around origo with radius 3. The FritschCarlson algorithm
    makes simple initial estimates of tangents and then does another pass over data points to move any outlier tangents
    into the monotonic region. FritschButland & Steffen algorithms make more elaborate first estimates of tangents that
    are guaranteed to lie in the monotonic region, so no second pass is necessary. */

    // Second pass of FritschCarlson: adjust any non-monotonic tangents.
    for (let k = 0; k < n - 1; k++) {
        const deltak = delta[k];
        if (deltak === 0) {
            m[k] = 0;
            m[k + 1] = 0;
            continue;
        }
        const alpha = m[k] / deltak;
        const beta = m[k + 1] / deltak;
        const tau = 3 / Math.sqrt(alpha ** 2 + beta ** 2);
        if (tau < 1) {              // if we're outside the circle with radius 3 then move onto the circle
            m[k] = tau * alpha * deltak;
            m[k + 1] = tau * beta * deltak;
        }
    }
    return { m, delta };
}
