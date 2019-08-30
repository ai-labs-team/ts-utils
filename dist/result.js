"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var maybe_1 = __importDefault(require("./maybe"));
var handleErr = function (errFn, fn) {
    try {
        return fn();
    }
    catch (e) {
        return errFn(e);
    }
};
var Result = /** @class */ (function () {
    function Result(err, val) {
        Object.freeze(Object.assign(this, { val: val, err: err }));
    }
    Result.ok = function (val) {
        return new Result(null, val);
    };
    Result.err = function (err) {
        return new Result(err, null);
    };
    Result.toMaybe = function (result) {
        return result.toMaybe();
    };
    Result.prototype.value = function () {
        return typeof this.val !== 'undefined' && this.val !== null ? this.val : null;
    };
    Result.prototype.error = function () {
        return typeof this.err !== 'undefined' && this.err !== null ? this.err : null;
    };
    Result.prototype.isError = function () {
        return this.error() !== null;
    };
    Result.prototype.chain = function (fn) {
        return this.isError() ? this : fn(this.val);
    };
    Result.prototype.or = function (alt) {
        return this.isError() ? alt : this;
    };
    Result.prototype.orLazy = function (fn) {
        return this.isError() ? fn() : this;
    };
    Result.prototype.map = function (fn) {
        var _this = this;
        return this.isError()
            ? this
            : handleErr(Result.err, function () { return Result.ok(fn(_this.val)); });
    };
    Result.prototype.mapError = function (fn) {
        return this.isError()
            ? Result.err(fn(this.error()))
            : this;
    };
    Result.prototype.fold = function (errFn, fn) {
        return this.isError() ? errFn(this.err) : fn(this.val);
    };
    Result.prototype.defaultTo = function (val) {
        return this.isError() ? val : this.val;
    };
    Result.prototype.toMaybe = function () {
        return this.isError() ? maybe_1.default.empty : maybe_1.default.of(this.val);
    };
    Result.chain = function (fn) { return function (result) { return result.chain(fn); }; };
    Result.attempt = function (fn) { return function (x) { return handleErr(Result.err, function () { return Result.ok(fn(x)); }); }; };
    Result.map = function (fn) { return function (result) { return result.map(fn); }; };
    Result.fold = function (errFn, fn) {
        return function (result) { return result.fold(errFn, fn); };
    };
    Result.value = function (result) { return result.value(); };
    Result.defaultTo = function (val) { return function (result) { return result.defaultTo(val); }; };
    Result.isError = function (result) { return result.isError(); };
    Result.fromMaybe = function (err) { return function (maybe) { return (maybe.isNothing()
        ? Result.err(err)
        : Result.ok(maybe.value())); }; };
    return Result;
}());
exports.default = Result;
//# sourceMappingURL=result.js.map