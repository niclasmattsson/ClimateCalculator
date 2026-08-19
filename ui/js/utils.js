// Small pure helpers. Nothing here reads or writes application state.

/**
 * Number formatter for noUiSlider: fixed number of decimals plus an optional unit suffix.
 * Returns `false` for undefined values, which is what noUiSlider expects.
 */
export function decimals(n, unit = "") {
    return {
        to: (value) => value !== undefined && value.toFixed(n) + unit,
        from: Number
    };
}

export function clamp(x, lower, upper) {
    return Math.max(lower, Math.min(x, upper));
}

/** Inclusive linearly spaced range, e.g. range(2010, 2100) -> [2010, 2011, ..., 2100]. */
export function range(start, end, delta = 1) {
    const n = Math.round((end - start) / delta + 1);
    if (n <= 0) return [];
    const arr = new Array(n);
    for (let i = 0; i < n; i++) {
        arr[i] = ((n - 1 - i) * start + i * end) / (n - 1);
    }
    return arr;
}

/** Deep copy of plain JSON-compatible data (plot options, emission series, ...). */
export function cloneObject(obj) {
    return JSON.parse(JSON.stringify(obj));
}
