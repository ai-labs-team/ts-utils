"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var result_1 = __importDefault(require("./result"));
var maybe_1 = __importDefault(require("./maybe"));
var defTag = Symbol.for('@ts-utils/decoder/def');
var tag = function (ctor, val, fn) {
    var _a;
    return (Object.assign(fn, (_a = {}, _a[defTag] = [ctor, val], _a)));
};
var def = function (fn) { return (fn[defTag] || null); };
var isDefined = function (val) { return val !== null && val !== undefined; };
var toArray = function (val) { return Array.isArray(val) ? val : isDefined(val) ? [val] : []; };
/**
 * Wraps a function that accepts a value and returns a `Result`, so that it can be composed
 * with `Decoder` functions. Useful for functions that do type conversions that can fail, i.e.
 * string to `Date`.
 */
exports.parse = function (fn) { return result_1.default.chain(fn); };
function nullable(decoder, defaultVal, mapper) {
    return function (json) { return ((!isDefined(json) && isDefined(defaultVal))
        ? result_1.default.ok(defaultVal)
        : (isDefined(json) && isDefined(mapper))
            ? decoder(json).map(mapper)
            : isDefined(json)
                ? decoder(json)
                : result_1.default.ok(null)); };
}
exports.nullable = nullable;
var Index = /** @class */ (function () {
    function Index(index) {
        this.index = index;
        this.type = 'Index';
    }
    Index.prototype.toString = function () {
        return "[" + this.index + "]";
    };
    return Index;
}());
exports.Index = Index;
var ObjectKey = /** @class */ (function () {
    function ObjectKey(name) {
        this.name = name;
        this.type = 'ObjectKey';
    }
    ObjectKey.prototype.toString = function () {
        return "." + this.name;
    };
    return ObjectKey;
}());
exports.ObjectKey = ObjectKey;
var TypedObject = /** @class */ (function () {
    function TypedObject(name) {
        this.name = name;
        this.type = 'TypedObject';
    }
    TypedObject.prototype.toString = function () {
        return " > Decoder.object(" + this.name + ")";
    };
    return TypedObject;
}());
exports.TypedObject = TypedObject;
/**
 * Represents a failed decode operation.
 */
var DecodeError = /** @class */ (function () {
    function DecodeError(expected, val, key) {
        if (key === void 0) { key = null; }
        Object.freeze(Object.assign(this, { expected: expected, val: val, key: toArray(key) }));
    }
    DecodeError.nest = function (key, val) {
        return function (err) { return ((err instanceof DecodeError ? err : new DecodeError(err, val)).nest(key)); };
    };
    /**
     * Allows 'nesting' of decode errors
     */
    DecodeError.prototype.nest = function (key) {
        return new DecodeError(this.expected, this.val, toArray(key).concat(this.key));
    };
    DecodeError.prototype.errMsg = function () {
        return (this.expected instanceof Error)
            ? "[" + this.expected.name + "]: '" + this.expected.message + "'"
            : "Expected " + (this.expected.name || this.expected) + ", got `" + JSON.stringify(this.val) + "`";
    };
    DecodeError.prototype.toString = function () {
        return [
            'Decode Error: ',
            this.errMsg(),
            this.key.length
                ? " in path: " + this.key.map(function (k) { return k.toString(); }).join('').replace(/^\s*>\s+/, '')
                : ''
        ].join('');
    };
    return DecodeError;
}());
exports.DecodeError = DecodeError;
var toDecodeResult = function (worked, typeVal, val, key) {
    if (key === void 0) { key = null; }
    return (worked
        ? result_1.default.ok(val)
        : result_1.default.err(new DecodeError(typeVal, val, key)));
};
exports.string = function (json) { return toDecodeResult(typeof json === 'string', String, json); };
exports.number = function (json) { return toDecodeResult(typeof json === 'number', Number, json); };
exports.bool = function (json) { return toDecodeResult(typeof json === 'boolean', Boolean, json); };
exports.boolean = exports.bool;
exports.array = function (elementDecoder) { return function (json) { return (Array.isArray(json)
    ? json.reduce(function (prev, current, index) { return (elementDecoder(current)
        .mapError(DecodeError.nest(new Index(index), current))
        .chain(function (decoded) { return prev.map(function (list) { return list.concat([decoded]); }); })); }, result_1.default.ok([]))
    : result_1.default.err(new DecodeError(Array, json))); }; };
/**
 * Tries each one of a list of decoders in order to find one that works, otherwise fails.
 */
exports.oneOf = function (decoders) { return function (json) { return decoders.reduce(function (result, decoder) { return (result.isError() ? decoder(json) : result); }, result_1.default.err(new DecodeError("[OneOf " + decoders.length + "]", json))); }; };
exports.object = function (name, decoders) { return function (json) { return ((json === null || typeof json !== 'object')
    ? result_1.default.err(new DecodeError(Object, json, new TypedObject(name)))
    : Object.keys(decoders).reduce(function (acc, key) { return (acc.chain(function (obj) { return (decoders[key](json[key])
        .mapError(DecodeError.nest(new ObjectKey(key), json[key]))
        .map(function (val) {
        var _a;
        return Object.assign(obj, (_a = {}, _a[key] = val, _a));
    })); })); }, result_1.default.ok({})).mapError(DecodeError.nest(new TypedObject(name), json))); }; };
/**
 * Creates an intersection between two decoders. Equivalent to TypeScript's `&` operator.
 *
 * Example:
 * ```
 * and(
 *   object({ foo: string }),
 *   object({ bar: string })
 * ) ==> object({ foo: string, bar: string })
 * ```
 */
exports.and = function (a, b) { return function (json) { return (a(json)
    .chain(function (valA) { return b(json).map(function (valB) { return Object.assign(valA, valB); }); })
    .mapError(DecodeError.nest([], json))); }; };
/**
 * Decodes an arbitrary collection of key/value pairs. This is useful when
 * the structure or keys aren't known, and they'll be consumed or sanitized
 * by code that safely handles more permissive inputs.
 *
 * In the general case, `object` should be used instead.
 */
exports.dict = function (valueDecoder) { return function (json) { return (isDefined(json) && isDefined(json.constructor) && json.constructor === Object
    ? Object.keys(json).reduce(function (acc, key) { return (acc.chain(function (obj) { return (valueDecoder(json[key])
        .mapError(DecodeError.nest(new ObjectKey(key), json[key]))
        .map(function (val) {
        var _a;
        return Object.assign(obj, (_a = {}, _a[key] = val, _a));
    })); })); }, result_1.default.ok({}))
    : result_1.default.err(new DecodeError(Object, json))); }; };
/**
 * Attempts to convert a raw JSON value to an enum type.
 */
exports.toEnum = function (name, enumVal) { return (function (val) {
    var key = Object.keys(enumVal)
        .find(function (key) { return enumVal[key] === val; });
    return result_1.default.fromMaybe(new DecodeError("Expected a value in enum `" + name + "`", val))(key
        ? maybe_1.default.of(enumVal[key])
        : maybe_1.default.emptyOf());
}); };
/**
 * Asserts that a string or number is in a list. The list should be declared `as const`.
 * Useful for converting an arbitrary value to a union type.
 *
 * Example:
 *
 * ```
 * const union = ['one', 'two', 'three'] as const;
 * const toUnion = inList(union);
 *
 * // The union type can then be declared as follows:
 * type Union = typeof union[number];
 * // Equivalent to `type Union = 'one' | 'two' | 'three';`
 * ```
 */
exports.inList = function (list) { return function (val) { return (list.includes(val)
    ? result_1.default.ok(val)
    : result_1.default.err(new DecodeError("Expected one of [" + list.join(', ') + "]", val))); }; };
//# sourceMappingURL=decoder.js.map