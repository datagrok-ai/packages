"use strict";
// Solver definitions
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_OPTIONS = exports.CallbackAction = exports.ERROR_MSG = exports.jacobian = exports.tDerivative = exports.EPS = exports.TINY = exports.ERR_CONTR = exports.GROW_COEF = exports.REDUCE_COEF = exports.PSGROW = exports.PSHRNK = exports.SAFETY = exports.min = exports.max = exports.abs = void 0;
/** The abs function */
var abs = function (x) { return (x > 0) ? x : -x; };
exports.abs = abs;
/** The max function */
var max = function (x, y) { return (x > y) ? x : y; };
exports.max = max;
/** The max function */
var min = function (x, y) { return (x < y) ? x : y; };
exports.min = min;
/** Routine constants of adaptive step method */
exports.SAFETY = 0.9;
exports.PSHRNK = -0.25;
exports.PSGROW = -0.2;
exports.REDUCE_COEF = 0.25;
exports.GROW_COEF = 4.0;
exports.ERR_CONTR = 1.89e-4;
/** Misc */
exports.TINY = 1e-20;
exports.EPS = 1.0e-10;
/** Returns derivative with respect to t. */
function tDerivative(t, y, f, eps, f0Buf, f1Buf, output) {
    var size = y.length;
    f(t, y, f0Buf);
    f(t + eps, y, f1Buf);
    for (var i = 0; i < size; ++i)
        output[i] = (f1Buf[i] - f0Buf[i]) / eps;
}
exports.tDerivative = tDerivative;
/** Returns Jacobian. */
function jacobian(t, y, f, eps, f0Buf, f1Buf, output) {
    var size = y.length;
    f(t, y, f0Buf);
    for (var j = 0; j < size; ++j) {
        y[j] += eps;
        f(t, y, f1Buf);
        for (var i = 0; i < size; ++i)
            output[j + i * size] = (f1Buf[i] - f0Buf[i]) / eps;
        y[j] -= eps;
    }
}
exports.jacobian = jacobian;
/** Error messeges */
var ERROR_MSG;
(function (ERROR_MSG) {
    ERROR_MSG["MRT_FAILS"] = "The modified Rosenbrock triple method fails";
    ERROR_MSG["ROS3PRW_FAILS"] = "The ROS3PRw method fails";
    ERROR_MSG["ROS34PRW_FAILS"] = "The ROS34PRw method fails";
})(ERROR_MSG = exports.ERROR_MSG || (exports.ERROR_MSG = {}));
;
/** Callback action */
var CallbackAction = /** @class */ (function (_super) {
    __extends(CallbackAction, _super);
    function CallbackAction(msg) {
        return _super.call(this, msg) || this;
    }
    return CallbackAction;
}(Error));
exports.CallbackAction = CallbackAction;
/** Default options of the solver */
var DEFAULT_OPTIONS;
(function (DEFAULT_OPTIONS) {
    DEFAULT_OPTIONS["SCRIPTING"] = "{maxIterations: 1}";
    DEFAULT_OPTIONS["NO_CHECKS"] = "{ }";
})(DEFAULT_OPTIONS = exports.DEFAULT_OPTIONS || (exports.DEFAULT_OPTIONS = {}));
