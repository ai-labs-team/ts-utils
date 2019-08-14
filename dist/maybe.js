"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ramda_1 = require("ramda");
var Maybe = /** @class */ (function () {
    function Maybe(val) {
        Object.freeze(Object.assign(this, { val: val }));
    }
    Maybe.of = function (val) {
        return new Maybe(val);
    };
    Maybe.prototype.map = function (fn) {
        return this.isNothing() ? Maybe.empty : Maybe.of(fn(this.val));
    };
    Maybe.prototype.isNothing = function () {
        return (this.val === null || this.val === undefined);
    };
    Maybe.prototype.value = function () {
        return this.isNothing() ? null : this.val;
    };
    Maybe.prototype.chain = function (fn) {
        return this.isNothing() ? this : fn(this.val);
    };
    Maybe.prototype.defaultTo = function (val) {
        return this.isNothing() ? val : this.val;
    };
    Maybe.prototype.defaultToLazy = function (fn) {
        return this.isNothing() ? fn() : this.val;
    };
    Maybe.prototype.or = function (alt) {
        return this.isNothing() ? alt : this;
    };
    Maybe.prototype.orLazy = function (fn) {
        return this.isNothing() ? fn() : this;
    };
    Maybe.map = ramda_1.curry(function (fn, maybe) { return maybe.map(fn); });
    Maybe.empty = Maybe.of(null);
    Maybe.defaultToLazy = ramda_1.curry(function (fn, maybe) { return maybe.defaultToLazy(fn); });
    Maybe.defaultTo = ramda_1.curry(function (val, maybe) { return maybe.defaultTo(val); });
    Maybe.orLazy = ramda_1.curry(function (fn, maybe) { return maybe.orLazy(fn); });
    Maybe.or = ramda_1.curry(function (val, maybe) { return maybe.or(val); });
    Maybe.isNothing = function (maybe) { return maybe.isNothing(); };
    Maybe.value = function (maybe) { return maybe.value(); };
    /**
     * Converts a list of `Maybe` to a `Maybe` list, which is `Nothing` unless _all_
     * items in the list have a value.
     */
    Maybe.toList = ramda_1.ifElse(ramda_1.anyPass([ramda_1.isNil, ramda_1.isEmpty, ramda_1.any(Maybe.isNothing)]), function () { return Maybe.empty; }, ramda_1.pipe(ramda_1.map(Maybe.value), Maybe.of));
    /**
     * Allows an empty `Maybe` value to be typed according to the nullable value it wraps, i.e.:
     *
     * ```
     * Maybe.empty: Maybe<any>
     * Maybe.emptyOf<string>(): Maybe<string>
     * ```
     */
    Maybe.emptyOf = function () { return Maybe.empty; };
    return Maybe;
}());
exports.default = Maybe;
//# sourceMappingURL=maybe.js.map