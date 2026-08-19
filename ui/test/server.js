// Static server for the UI regression harness.
//
//   node ui/test/server.js <before-ui-dir> <after-ui-dir> [port]
//
// Serves the two trees side by side at /base and /live, the harness itself at /fp, and a
// deterministic stand-in for the Julia model at POST /runccc so that the RUN MODEL path
// can be exercised without starting Julia.

const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const roots = {
    "/base": path.resolve(process.argv[2] || "."),
    "/live": path.resolve(process.argv[3] || "."),
    "/fp": __dirname
};
const port = Number(process.argv[4]) || 8123;

const CONTENT_TYPES = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".json": "application/json"
};

/**
 * A stand-in for the Julia /runccc endpoint. The numbers are physically meaningless; they
 * only have to be a deterministic function of the request so that the two versions under
 * comparison receive identical responses.
 */
function mockModelRun(body) {
    const request = JSON.parse(body);
    const n = request.lastyear - request.firstyear + 1;
    const { climatesensitivity: cs, emissions } = request;
    const temperature = [], CO2 = [], CH4 = [], N2O = [];
    let cumulative = 0;
    for (let i = 0; i < n; i++) {
        cumulative += (emissions.FossilCO2[i] || 0) + (emissions.OtherCO2[i] || 0);
        temperature.push(0.8 + cs * cumulative / 20000);
        CO2.push(390 + cumulative / 7.8);
        CH4.push(1800 + (emissions.CH4[i] || 0) * 0.5);
        N2O.push(320 + (emissions.N2O[i] || 0) * 0.1);
    }
    return JSON.stringify({ temperature, concentrations: { CO2, CH4, N2O }, emissions });
}

http.createServer((req, res) => {
    const pathname = url.parse(req.url).pathname;

    if (req.method === "POST" && pathname.endsWith("/runccc")) {
        let body = "";
        req.on("data", (chunk) => { body += chunk; });
        req.on("end", () => {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(mockModelRun(body));
        });
        return;
    }

    const mount = Object.keys(roots).find((m) => pathname === m || pathname.startsWith(m + "/"));
    if (!mount) {
        res.writeHead(404);
        res.end("No mount point for " + pathname);
        return;
    }
    let relative = pathname.slice(mount.length) || "/";
    if (relative === "/") relative = "/ClimateCalculator.html";

    const file = path.join(roots[mount], decodeURIComponent(relative));
    fs.readFile(file, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end("404 " + file);
            return;
        }
        res.writeHead(200, {
            "Content-Type": CONTENT_TYPES[path.extname(file)] || "application/octet-stream",
            "Cache-Control": "no-store"
        });
        res.end(data);
    });
}).listen(port, () => {
    console.log("Comparing");
    console.log("  /base ->", roots["/base"]);
    console.log("  /live ->", roots["/live"]);
    console.log("Open http://localhost:" + port + "/fp/driver.html and run runBoth() in the console.");
});
