"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mrt_method_1 = require("./mrt-method");
var ros34prw_method_1 = require("./ros34prw-method");
var ros3prw_method_1 = require("./ros3prw-method");
var methods = new Map([
    ['MRT', mrt_method_1.mrt],
    ['ROS3PRw', ros3prw_method_1.ros3prw],
    ['ROS34PRw', ros34prw_method_1.ros34prw],
]);
/** Robertson chemical reaction, updated version (see https://archimede.uniba.it/~testset/problems/rober.php) */
var robertson = {
    name: 'Robertson',
    arg: { name: 't', start: 0, finish: 10e11, step: 2.5e7 },
    initial: [1, 0, 0],
    func: function (t, y, output) {
        output[0] = -0.04 * y[0] + 1e4 * y[1] * y[2];
        output[1] = 0.04 * y[0] - 1e4 * y[1] * y[2] - 3e7 * Math.pow(y[1], 2);
        output[2] = 3e7 * Math.pow(y[1], 2);
    },
    tolerance: 1e-7,
    solutionColNames: ['A', 'B', 'C'],
};
/** High Irradiance Responses of photomorphogenesis (see https://archimede.uniba.it/~testset/problems/hires.php) */
var hires = {
    name: 'HIRES',
    arg: { name: 't', start: 0, finish: 321.8122, step: 0.01 },
    initial: [1, 0, 0, 0, 0, 0, 0, 0.0057],
    func: function (t, y, output) {
        // extract function values
        var y1 = y[0];
        var y2 = y[1];
        var y3 = y[2];
        var y4 = y[3];
        var y5 = y[4];
        var y6 = y[5];
        var y7 = y[6];
        var y8 = y[7];
        // compute output
        output[0] = -1.71 * y1 + 0.43 * y2 + 8.32 * y3 + 0.0007;
        output[1] = 1.71 * y1 - 8.75 * y2;
        output[2] = -10.03 * y3 + 0.43 * y4 + 0.035 * y5;
        output[3] = 8.32 * y2 + 1.71 * y3 - 1.12 * y4;
        output[4] = -1.745 * y5 + 0.43 * y6 + 0.43 * y7;
        output[5] = -280 * y6 * y8 + 0.69 * y4 + 1.71 * y5 - 0.43 * y6 + 0.69 * y7;
        output[6] = 280 * y6 * y8 - 1.81 * y7;
        output[7] = -280 * y6 * y8 + 1.81 * y7;
    },
    tolerance: 1e-10,
    solutionColNames: ['y1', 'y2', 'y3', 'y4', 'y5', 'y6', 'y7', 'y8'],
}; // hires
/** Van der Pol oscillator (see https://archimede.uniba.it/~testset/problems/vdpol.php) */
var vanDerPol = {
    name: 'van der Pol',
    arg: { name: 't', start: 0, finish: 2000, step: 0.1 },
    initial: [-1, 1],
    func: function (t, y, output) {
        output[0] = y[1];
        output[1] = -y[0] + 1000 * (1 - y[0] * y[0]) * y[1];
    },
    tolerance: 1e-12,
    solutionColNames: ['x1', 'x2'],
};
/** The OREGO model (see https://archimede.uniba.it/~testset/report/orego.pdf) */
var orego = {
    name: 'OREGO',
    arg: { name: 't', start: 0, finish: 360, step: 0.01 },
    initial: [1, 2, 3],
    func: function (t, y, output) {
        // extract function values
        var y1 = y[0];
        var y2 = y[1];
        var y3 = y[2];
        // compute output
        output[0] = 77.27 * (y2 - y1 * y2 + y1 - 0.000008375 * y1 * y1);
        output[1] = 1 / 77.27 * (-y2 - y1 * y2 + y3);
        output[2] = 0.161 * (y1 - y3);
    },
    tolerance: 1e-8,
    solutionColNames: ['y1', 'y2', 'y3'],
};
/** Kintetic constants for the E5 model */
var E5;
(function (E5) {
    E5[E5["K1"] = 7.89e-10] = "K1";
    E5[E5["K2"] = 1130000000] = "K2";
    E5[E5["K3"] = 11000000] = "K3";
    E5[E5["K4"] = 1130] = "K4";
})(E5 || (E5 = {}));
;
/** The E5 model (chemical pyrolysis: https://archimede.uniba.it/~testset/report/e5.pdf) */
var e5 = {
    name: 'E5',
    arg: { name: 't', start: 0, finish: 1e13, step: 2.5e8 },
    initial: [0.00176, 0, 0, 0],
    func: function (t, y, output) {
        // extract function values
        var y1 = y[0];
        var y2 = y[1];
        var y3 = y[2];
        var y4 = y[3];
        // compute output
        output[0] = -E5.K1 * y1 - E5.K3 * y1 * y3;
        output[1] = E5.K1 * y1 - E5.K2 * y2 * y3;
        output[2] = E5.K1 * y1 - E5.K2 * y2 * y3 - E5.K3 * y1 * y3 + E5.K4 * y4;
        output[3] = E5.K3 * y1 * y3 - E5.K4 * y4;
    },
    tolerance: 1e-6,
    solutionColNames: ['y1', 'y2', 'y3', 'y4'],
};
/** Kintetic constants for the Pollution model */
var POL;
(function (POL) {
    POL[POL["K1"] = 0.35] = "K1";
    POL[POL["K2"] = 26.6] = "K2";
    POL[POL["K3"] = 12300] = "K3";
    POL[POL["K4"] = 0.00086] = "K4";
    POL[POL["K5"] = 0.00082] = "K5";
    POL[POL["K6"] = 15000] = "K6";
    POL[POL["K7"] = 0.00013] = "K7";
    POL[POL["K8"] = 24000] = "K8";
    POL[POL["K9"] = 16500] = "K9";
    POL[POL["K10"] = 9000] = "K10";
    POL[POL["K11"] = 0.022] = "K11";
    POL[POL["K12"] = 12000] = "K12";
    POL[POL["K13"] = 1.88] = "K13";
    POL[POL["K14"] = 16300] = "K14";
    POL[POL["K15"] = 4800000] = "K15";
    POL[POL["K16"] = 0.00035] = "K16";
    POL[POL["K17"] = 0.0175] = "K17";
    POL[POL["K18"] = 100000000] = "K18";
    POL[POL["K19"] = 444000000000] = "K19";
    POL[POL["K20"] = 1240] = "K20";
    POL[POL["K21"] = 2.1] = "K21";
    POL[POL["K22"] = 5.78] = "K22";
    POL[POL["K23"] = 0.0474] = "K23";
    POL[POL["K24"] = 1780] = "K24";
    POL[POL["K25"] = 3.12] = "K25";
})(POL || (POL = {}));
; // POL
/** The chemical reaction part of the air pollution model (https://archimede.uniba.it/~testset/report/pollu.pdf) */
var pollution = {
    name: 'Pollution',
    arg: { name: 't', start: 0, finish: 60, step: 0.002 },
    initial: [0, 0.2, 0, 0.04, 0, 0, 0.1, 0.3, 0.01, 0, 0, 0, 0, 0, 0, 0, 0.007, 0, 0, 0],
    func: function (t, y, output) {
        // extract function values
        var y1 = y[0];
        var y2 = y[1];
        var y3 = y[2];
        var y4 = y[3];
        var y5 = y[4];
        var y6 = y[5];
        var y7 = y[6];
        var y8 = y[7];
        var y9 = y[8];
        var y10 = y[9];
        var y11 = y[10];
        var y12 = y[11];
        var y13 = y[12];
        var y14 = y[13];
        var y15 = y[14];
        var y16 = y[15];
        var y17 = y[16];
        var y18 = y[17];
        var y19 = y[18];
        var y20 = y[19];
        // evaluate expressions
        var r1 = POL.K1 * y1;
        var r2 = POL.K2 * y2 * y4;
        var r3 = POL.K3 * y5 * y2;
        var r4 = POL.K4 * y7;
        var r5 = POL.K5 * y7;
        var r6 = POL.K6 * y7 * y6;
        var r7 = POL.K7 * y9;
        var r8 = POL.K8 * y9 * y6;
        var r9 = POL.K9 * y11 * y2;
        var r10 = POL.K10 * y11 * y1;
        var r11 = POL.K11 * y13;
        var r12 = POL.K12 * y10 * y2;
        var r13 = POL.K13 * y14;
        var r14 = POL.K14 * y1 * y6;
        var r15 = POL.K15 * y3;
        var r16 = POL.K16 * y4;
        var r17 = POL.K17 * y4;
        var r18 = POL.K18 * y16;
        var r19 = POL.K19 * y16;
        var r20 = POL.K20 * y17 * y6;
        var r21 = POL.K21 * y19;
        var r22 = POL.K22 * y19;
        var r23 = POL.K23 * y1 * y4;
        var r24 = POL.K24 * y19 * y1;
        var r25 = POL.K25 * y20;
        // compute output
        output[0] = -(r1 + r10 + r14 + r23 + r24) + (r2 + r3 + r9 + r11 + r12 + r22 + r25);
        output[1] = -r2 - r3 - r9 - r12 + r1 + r21;
        output[2] = -r15 + r1 + r17 + r19 + r22;
        output[3] = -r2 - r16 - r17 - r23 + r15;
        output[4] = -r3 + 2 * r4 + r6 + r7 + r13 + r20;
        output[5] = -r6 - r8 - r14 - r20 + r3 + 2 * r18;
        output[6] = -r4 - r5 - r6 + r13;
        output[7] = r4 + r5 + r6 + r7;
        output[8] = -r7 - r8;
        output[9] = -r12 + r7 + r9;
        output[10] = -r9 - r10 + r8 + r11;
        output[11] = r9;
        output[12] = -r11 + r10;
        output[13] = -r13 + r12;
        output[14] = r14;
        output[15] = -r18 - r19 + r16;
        output[16] = -r20;
        output[17] = r20;
        output[18] = -r21 - r22 - r24 + r23 + r25;
        output[19] = -r25 + r24;
    },
    tolerance: 1e-6,
    solutionColNames: ['y1', 'y2', 'y3', 'y4', 'y5', 'y6', 'y7', 'y8', 'y9', 'y10', 'y11',
        'y12', 'y13', 'y14', 'y15', 'y16', 'y17', 'y18', 'y19', 'y20'],
}; // pollution
/** Problems for testing solvers' performance */
var performanceProblems = new Map([
    [robertson.name, robertson],
    [hires.name, hires],
    [vanDerPol.name, vanDerPol],
    [orego.name, orego],
    [e5.name, e5],
    [pollution.name, pollution],
]);
/** Non-stiff 1D test problem: equation (see [1], p. 736) */
var nonStiff1D = {
    name: 'non-stiff 1D',
    arg: { name: 't', start: 0, finish: 4, step: 0.01 },
    initial: [2],
    func: function (t, y, output) {
        output[0] = 4 * Math.exp(0.8 * t) - 0.5 * y[0];
    },
    tolerance: 0.00001,
    solutionColNames: ['y'],
};
/** Non-stiff 1D test problem: exact solution (see [1], p. 736) */
var exactNonStiff1D = function (t) {
    return new Float64Array([
        (Math.exp(0.8 * t) - Math.exp(-0.5 * t)) * 4 / 1.3 + 2 * Math.exp(-0.5 * t),
    ]);
};
/** Non-stiff 2D test problem: equation */
var nonStiff2D = {
    name: 'non-stiff 2D',
    arg: { name: 't', start: 0, finish: 4, step: 0.01 },
    initial: [1, 1],
    func: function (t, y, output) {
        output[0] = y[0] + y[1];
        output[1] = y[1] - y[0];
    },
    tolerance: 0.000000001,
    solutionColNames: ['x', 'y'],
};
/** Non-stiff 2D test problem: exact solution */
var exactNonStiff2D = function (t) {
    return new Float64Array([
        Math.exp(t) * (Math.cos(t) + Math.sin(t)),
        Math.exp(t) * (Math.cos(t) - Math.sin(t)),
    ]);
};
/** Non-stiff 3D test problem: equations */
var nonStiff3D = {
    name: 'non-stiff 3D',
    arg: { name: 't', start: 0, finish: 2, step: 0.001 },
    initial: [0.3, -0.8, 0],
    func: function (t, y, output) {
        output[0] = 5 * y[0] + 2 * y[1] + Math.sin(t);
        output[1] = -4 * y[0] - y[1] + Math.exp(2 * t);
        output[2] = 5 * Math.pow(t, 4) - 3 * Math.pow(t, 2) + 2 * t;
    },
    tolerance: 0.00000001,
    solutionColNames: ['x', 'y', 'z'],
};
/** Non-stiff 3D test problem: exact solution */
var exactNonStiff3D = function (t) {
    var e1 = Math.exp(t);
    var e2 = Math.exp(2 * t);
    var e3 = Math.exp(3 * t);
    var c = Math.cos(t);
    var s = Math.sin(t);
    return new Float64Array([
        e1 + e3 + 0.1 * (3 * c - s) - 2 * e2,
        -2 * e1 - e3 - 0.2 * (2 * s + 4 * c) + 3 * e2,
        Math.pow(t, 5) - Math.pow(t, 3) + Math.pow(t, 2),
    ]);
};
/** Stiff 1D test problem: equation (see [1], p. 767) */
var stiff1D = {
    name: 'stiff 1D',
    arg: { name: 't', start: 0, finish: 4, step: 0.01 },
    initial: [0],
    func: function (t, y, output) {
        output[0] = -1000 * y[0] + 3000 - 2000 * Math.exp(-t);
    },
    tolerance: 0.0000005,
    solutionColNames: ['y'],
};
/** Stiff 1D test problem: exact solution (see [1], p. 767) */
var exactStiff1D = function (t) {
    return new Float64Array([
        3 - 0.998 * Math.exp(-1000 * t) - 2.002 * Math.exp(-t),
    ]);
};
/** Stiff 2D test problem: equations (see [1], p. 770) */
var stiff2D = {
    name: 'stiff 2D',
    arg: { name: 't', start: 0, finish: 4, step: 0.01 },
    initial: [52.29, 83.82],
    func: function (t, y, output) {
        output[0] = -5 * y[0] + 3 * y[1];
        output[1] = 100 * y[0] - 301 * y[1];
    },
    tolerance: 0.0000005,
    solutionColNames: ['x', 'y'],
};
/** Stiff 2D test problem: exact solution (see [1], p. 770) */
var exactStiff2D = function (t) {
    return new Float64Array([
        52.96 * Math.exp(-3.9899 * t) - 0.67 * Math.exp(-302.0101 * t),
        17.83 * Math.exp(-3.9899 * t) + 65.99 * Math.exp(-302.0101 * t),
    ]);
};
/** Stiff 3D test problem: equations */
var stiff3D = {
    name: 'stiff 3D',
    arg: { name: 't', start: 0, finish: 4, step: 0.01 },
    initial: [2, 1, 0],
    func: function (t, y, output) {
        output[0] = -100 * y[0] + 100 * y[1] + y[2];
        output[1] = y[2];
        output[2] = -y[1];
    },
    tolerance: 0.00000001,
    solutionColNames: ['x', 'y', 'z'],
};
/** Stiff 3D test problem: exact solution */
var exactStiff3D = function (t) {
    return new Float64Array([
        Math.exp(-100 * t) + Math.cos(t),
        Math.cos(t),
        -Math.sin(t),
    ]);
};
var correctnessProblems = [
    { odes: nonStiff1D, exact: exactNonStiff1D },
    { odes: nonStiff2D, exact: exactNonStiff2D },
    { odes: nonStiff3D, exact: exactNonStiff3D },
    { odes: stiff1D, exact: exactStiff1D },
    { odes: stiff2D, exact: exactStiff2D },
    { odes: stiff3D, exact: exactStiff3D },
];
/** Return numerical solution error: maximum absolute deviation between approximate & exact solutions */
function getError(method, corProb) {
    var error = 0;
    // Get numerical solution
    var approxSolution = method(corProb.odes);
    var exact = corProb.exact;
    var arg = approxSolution[0];
    var pointsCount = arg.length;
    var funcsCount = approxSolution.length - 1;
    // Compute error
    for (var i = 0; i < pointsCount; ++i) {
        var exactSolution = exact(arg[i]);
        for (var j = 0; j < funcsCount; ++j)
            error = Math.max(error, Math.abs(exactSolution[j] - approxSolution[j + 1][i]));
    }
    return error;
}
console.log('Performance:\n');
methods.forEach(function (method, name) {
    console.log('  ', name);
    performanceProblems.forEach(function (odes, name) {
        var start = Date.now();
        method(odes);
        var finish = Date.now();
        console.log("     ".concat(name, ": ").concat(finish - start, " ms."));
    });
    console.log();
});
console.log('Correctness:\n');
methods.forEach(function (method, name) {
    console.log('  ', name);
    correctnessProblems.forEach(function (problem) {
        var error = getError(method, problem);
        console.log("     ".concat(problem.odes.name, ": ").concat(error));
    });
    console.log();
});
