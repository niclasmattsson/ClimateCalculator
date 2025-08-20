function decimals(n, unit) {
    unit = typeof unit === "undefined" ? "" : unit;
    return {
        to: function (value) {
            return value !== undefined && value.toFixed(n) + unit;
        },
        from: Number
    }
}

function round(num, decimals) {
    var mult = Math.pow(10, decimals);
    return Math.round(num * mult) / mult;
}

function clamp(x, lower, upper) {
    return Math.max(lower, Math.min(x, upper));
}

function range(start, end, delta) {
    delta = typeof delta === "undefined" ? 1 : delta;
    var n = Math.round((end - start) / delta + 1);
    if (n <= 0) return [];
    var arr = Array(n - 1);
    for (var i = 0; i <= n - 1; i++) {
        arr[i] = ((n - 1 - i) * start + i * end) / (n - 1);
    }
    return arr;
}

function cloneObject(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function getSSP(reg, gas, firstYear, lastYear) {
    return interpolateSSP(SSPscenarios[gas][currentModel][currentSSP][reg]).slice(firstYear - 2005, lastYear - 2005 + 1);
}

function interpolateSSP(SSPvect) {
    var SSPyears = range(2000, 2100, 10);
    SSPyears[0] = 2005;
    var annualSSP = new Array(96);
    var iSSP = 0;
    for (var k = 0; k < 96; k++) {
        var year = 2005 + k;
        annualSSP[k] = SSPvect[iSSP] + (year - SSPyears[iSSP]) / (SSPyears[iSSP + 1] - SSPyears[iSSP]) * (SSPvect[iSSP + 1] - SSPvect[iSSP]);
        year / 10 == Math.floor(year / 10) && iSSP++;
    }
    return annualSSP;
}