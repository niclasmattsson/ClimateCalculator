// Hover on the CSS-enlarged figures.
//
// Clicking a carousel figure enlarges it with a CSS transform (`transform: scale(1.9)` on
// `#figuregroup input[type=checkbox]:checked ~ figure` in styles.css). That leaves the
// Plotly layout untouched: the plot still believes it is 571 x 430 px while the browser
// paints it 1.9 times bigger.
//
// Plotly 1.39 turns a mouse event into a position on the axes with
//
//     xpx = event.clientX - dragElement.getBoundingClientRect().left
//
// and then treats `xpx` as a layout pixel offset -- it is compared against the axis length
// and handed to `xaxis.p2c()`. The bounding rect is in screen pixels, so on an enlarged
// figure every offset comes out a factor `scale` too large: the hover labels run ahead of
// the mouse, and past 1/scale of the plot width they stop appearing altogether because the
// offset is rejected as being off-axis.
//
// Plotly only learned to read the CSS transform of its graph div in v2, so the fix here is
// to divide the offset by the current scale before Plotly gets to see the event. Nothing
// else needs to change: `pointerX`/`pointerY` and the hover labels are drawn inside the
// figure's own SVG, which the same CSS transform scales up for free.
//
// Delete this file when the bundle is upgraded rather than carrying it along: a Plotly that
// corrects for the transform itself would end up doing it twice.

/**
 * Mouse-event fields that Plotly reads while hovering, or forwards to `plotly_hover` and
 * `plotly_beforehover` handlers. Copied onto the substitute event below; anything not
 * listed here is dropped, so keep the list generous rather than minimal.
 */
const EVENT_FIELDS = [
    "target", "relatedTarget", "currentTarget", "type", "clientX", "clientY",
    "pageX", "pageY", "screenX", "screenY", "offsetX", "offsetY",
    "button", "buttons", "altKey", "ctrlKey", "metaKey", "shiftKey", "hovermode"
];

/**
 * The total CSS scale factor between `element` and the screen, i.e. the product of the
 * scale factors of every transform on the element and its ancestors. Assumes those
 * transforms are scales and translations (no rotation or skew), which is all the figures
 * and the carousel ever use.
 */
function cssScale(element) {
    let scaleX = 1, scaleY = 1;
    for (let node = element; node instanceof Element; node = node.parentElement) {
        const transform = getComputedStyle(node).transform;
        const matrix = /^matrix(3d)?\(([^)]*)\)$/.exec(transform);
        if (!matrix) continue;                      // "none", or something exotic
        const m = matrix[2].split(",").map(Number);
        scaleX *= m[0];                             // matrix(a, b, c, d, e, f), or
        scaleY *= matrix[1] ? m[5] : m[3];          // matrix3d(a, b, c, d, e, f, g, h, i, j, ...)
    }
    return { scaleX, scaleY };
}

/** Plotly accepts a graph div either as the element itself or as its id. */
function graphDivOf(gd) {
    return typeof gd === "string" ? document.getElementById(gd) : gd;
}

/**
 * A copy of a hover mouse event with its coordinates moved from screen pixels back into
 * the figure's own (unscaled) pixels, so that Plotly's `clientX - rect.left` comes out as
 * a layout offset. Anything that is not a mouse event on an enlarged figure -- a
 * programmatic `Plotly.Fx.hover()` call, or a figure at its normal size -- is passed
 * through untouched.
 */
function unscaledEvent(graphDiv, evt) {
    if (!graphDiv || !evt || Array.isArray(evt)) return evt;
    if (typeof evt.clientX !== "number" || !evt.target || !evt.target.getBoundingClientRect) return evt;

    const { scaleX, scaleY } = cssScale(graphDiv);
    if (Math.abs(scaleX - 1) < 1e-6 && Math.abs(scaleY - 1) < 1e-6) return evt;

    // Anchored on the same rect that Plotly is about to measure, so only the offset from
    // its top left corner is rescaled.
    const rect = evt.target.getBoundingClientRect();
    const unscaled = {};
    for (const field of EVENT_FIELDS) {
        if (field in evt) unscaled[field] = evt[field];
    }
    unscaled.clientX = rect.left + (evt.clientX - rect.left) / scaleX;
    unscaled.clientY = rect.top + (evt.clientY - rect.top) / scaleY;
    return unscaled;
}

/**
 * Make hovering work on the enlarged figures. Patches `Plotly.Fx.hover()`, which is the
 * single entry point every mousemove handler Plotly installs goes through.
 */
export function fixHoverOnEnlargedFigures() {
    const Fx = window.Plotly && window.Plotly.Fx;
    if (!Fx || !Fx.hover || Fx.hover.unscalesEvents) return;

    const hover = Fx.hover;
    Fx.hover = function (gd, evt, subplot, noHoverEvent) {
        return hover.call(this, gd, unscaledEvent(graphDivOf(gd), evt), subplot, noHoverEvent);
    };
    Fx.hover.unscalesEvents = true;
}
