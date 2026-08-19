// Interaction helpers injected into the application window by driver.html.
// Everything here goes through the DOM, so the same code drives any version of the app.

window.__toggleEnlarge = function (what) {
    if (what === "open") {
        document.getElementById("emissionsfigure").click();
    } else {
        document.getElementById("editemissions").click();
    }
};

window.__fireMouse = function (type, x, y, target) {
    target.dispatchEvent(new MouseEvent(type, {
        bubbles: true, cancelable: true, clientX: x, clientY: y, view: window
    }));
};

/** The breakpoint marker <path> elements of the enlarged emissions figure. */
window.__handlePaths = function () {
    return [...document.querySelectorAll("#editemissions .scatterlayer .trace:nth-of-type(3) g path")];
};

/**
 * Drag breakpoint marker number `idx` to the data coordinates (year, value), using real
 * mouse events so that the d3 drag behaviour runs exactly as it does for a user.
 */
window.__dragHandleTo = function (idx, year, value) {
    const path = window.__handlePaths()[idx];
    if (!path) return "no path " + idx;

    const edit = document.getElementById("editemissions");
    const xaxis = edit._fullLayout.xaxis;
    const yaxis = edit._fullLayout.yaxis;
    const box = edit.getBoundingClientRect();

    // The marker's current position comes from its transform, in figure pixel space.
    const [tx, ty] = path.getAttribute("transform").match(/-?[\d.]+/g).map(Number);
    const fromX = box.left + tx;
    const fromY = box.top + ty;
    const toX = box.left + xaxis.l2p(year) + xaxis._offset;
    const toY = box.top + yaxis.l2p(value) + yaxis._offset;

    window.__fireMouse("mousedown", fromX, fromY, path);
    window.__fireMouse("mousemove", toX, toY, document);
    window.__fireMouse("mouseup", toX, toY, document);
    return "ok";
};

/** Drag the spawn handle out of the trash can to create a new breakpoint. */
window.__dragSpawnTo = function (year, value) {
    return window.__dragHandleTo(window.__handlePaths().length - 1, year, value);
};
