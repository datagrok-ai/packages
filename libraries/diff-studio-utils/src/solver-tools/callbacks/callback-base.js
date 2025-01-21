"use strict";
// Solver's callback base
Object.defineProperty(exports, "__esModule", { value: true });
exports.Callback = void 0;
/** Solver callback */
var Callback = /** @class */ (function () {
    function Callback() {
    }
    ;
    Callback.prototype.onIterationStart = function () { };
    Callback.prototype.onComputationsCompleted = function () { };
    return Callback;
}());
exports.Callback = Callback;
;
