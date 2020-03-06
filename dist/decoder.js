"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var result_1 = __importDefault(require("./result"));
var maybe_1 = __importDefault(require("./maybe"));
var log = function (msg) { return function (val) {
    console.log(msg, val);
    return val;
}; };
var identity = function (a) { return a; };
var defTag = Symbol.for('@ts-utils/decoder/def');
var spec = function (ctor, args, def, opts) {
    var _a;
    if (opts === void 0) { opts = {}; }
    return (Object.assign(function (val) { return (val === defTag
        ? { ctor: ctor, args: args, def: def }
        : def(val, args, opts)); }, (_a = {}, _a[defTag] = true, _a)));
};
function extract(decoder) {
    return decoder[defTag] ? decoder(defTag) : null;
}
exports.extract = extract;
var isDefined = function (val) { return val !== null && val !== undefined; };
var toArray = function (val) { return Array.isArray(val) ? val : isDefined(val) ? [val] : []; };
var assign = function (acc, val) { return Object.assign(acc, val); };
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
        Object.freeze(assign(this, { expected: expected, val: val, key: toArray(key) }));
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
    Object.defineProperty(DecodeError.prototype, "name", {
        get: function () {
            return (this.expected instanceof Error)
                ? this.expected.name
                : (this.expected.name || this.expected).toString();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DecodeError.prototype, "message", {
        get: function () {
            return (this.expected instanceof Error)
                ? this.expected.message
                : this.errMsg();
        },
        enumerable: true,
        configurable: true
    });
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
function nullable(decoder, defaultVal, mapper) {
    return spec(nullable, [decoder, defaultVal, mapper], function (json) { return ((!isDefined(json) && isDefined(defaultVal))
        ? result_1.default.ok(defaultVal)
        : (isDefined(json) && isDefined(mapper))
            ? decoder(json).map(mapper)
            : isDefined(json)
                ? decoder(json)
                : result_1.default.ok(null)); });
}
exports.nullable = nullable;
function array(elementDecoder) {
    return spec(array, [elementDecoder], function (json, _a, opts) {
        var ed = _a[0];
        return (Array.isArray(json)
            ? json.reduce(function (prev, current, index) { return ((opts && opts.mapFn || identity)(ed(current).mapError(DecodeError.nest(new Index(index), current)))
                .chain(function (decoded) { return prev.map(function (list) { return list.concat([decoded]); }); })); }, result_1.default.ok([]))
            : result_1.default.err(new DecodeError(Array, json)));
    });
}
exports.array = array;
/**
 * Tries each one of a list of decoders in order to find one that works, otherwise fails.
 */
function oneOf(decoders) {
    return spec(oneOf, [decoders], function (json) { return decoders.reduce(function (result, decoder) { return (result.isError() ? decoder(json) : result); }, result_1.default.err(new DecodeError("[OneOf " + decoders.length + "]", json))); });
}
exports.oneOf = oneOf;
/**
 * Decodes an object:
 *
 * ```
 * const test = object('Test Object', {
 *   name: nullable(string),
 *   email: string,
 *   subscribed: boolean
 * });
 * ```
 */
function object(name, decoders) {
    return spec(object, [name, decoders], function (json, _a, opts) {
        var n = _a[0], de = _a[1];
        return ((json === null || typeof json !== 'object')
            ? result_1.default.err(new DecodeError(Object, json, new TypedObject(n)))
            : Object.keys(de).reduce(function (acc, key) { return ((opts && opts.mapFn || identity)(acc.chain(function (obj) { return (de[key](json[key])
                .mapError(DecodeError.nest(new ObjectKey(key), json[key])))
                .map(function (val) {
                var _a;
                return assign(log('obj')(obj), (_a = {}, _a[key] = val, _a));
            }); }))); }, result_1.default.ok({})).mapError(DecodeError.nest(new TypedObject(n), json)));
    });
}
exports.object = object;
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
function and(a, b) {
    return spec(and, [a, b], function (json) { return (a(json)
        .chain(function (valA) { return b(json).map(function (valB) { return assign(valA, valB); }); })
        .mapError(DecodeError.nest([], json))); });
}
exports.and = and;
/**
 * Decodes an arbitrary collection of key/value pairs. This is useful when
 * the structure or keys aren't known, and they'll be consumed or sanitized
 * by code that safely handles more permissive inputs.
 *
 * In the general case, `object` should be used instead.
 */
function dict(valueDecoder) {
    return spec(dict, [valueDecoder], function (json, _a, opts) {
        var vd = _a[0];
        return (isDefined(json) && isDefined(json.constructor) && json.constructor === Object
            ? Object.keys(json).reduce(function (acc, key) { return (acc.chain(function (obj) { return ((opts && opts.mapFn || identity)(vd(json[key]).mapError(DecodeError.nest(new ObjectKey(key), json[key])))
                .map(function (val) {
                var _a;
                return assign(obj, (_a = {}, _a[key] = val, _a));
            })); })); }, result_1.default.ok({}))
            : result_1.default.err(new DecodeError(Object, json)));
    });
}
exports.dict = dict;
/**
 * Allows using a decoder wrapped in a function. Useful for recursive data
 * structures.
 */
exports.lazy = function (wrapped) { return function (json) { return (wrapped()(json)); }; };
/**
 * Attempts to convert a raw JSON value to an enum type.
 */
function toEnum(name, enumVal) {
    return spec(toEnum, [name, enumVal], function (val) {
        var key = Object.keys(enumVal)
            .find(function (key) { return enumVal[key] === val; });
        return result_1.default.fromMaybe(new DecodeError("Expected a value in enum `" + name + "`", val))(key
            ? maybe_1.default.of(enumVal[key])
            : maybe_1.default.emptyOf());
    });
}
exports.toEnum = toEnum;
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
function inList(list) {
    return spec(inList, [list], function (val) { return (list.includes(val)
        ? result_1.default.ok(val)
        : result_1.default.err(new DecodeError("Expected one of [" + list.join(', ') + "]", val))); });
}
exports.inList = inList;
/**
 * Makes the child members of a composed decoder (i.e. `object()`) nullable.
 */
function partial(decoder) {
    var _a = extract(decoder), ctor = _a.ctor, args = _a.args;
    switch (ctor) {
        case object:
            return object(args[0], Object.keys(args[1]).map(function (key) {
                var _a;
                return (_a = {}, _a[key] = nullable(args[1][key]), _a);
            }).reduce(assign));
        case dict:
            return dict(nullable(args[0]));
        case array:
            return array(nullable(args[0]));
        case and:
            return and(partial(args[0]), partial(args[1]));
        default:
            return decoder;
    }
}
exports.partial = partial;
/**
 * Takes a composed decoder and returns one that, if decoding fails,
 * collects all failures, rather than breaking on the first one.
 */
function all(decoder) {
    var wrap = function (hasParent, path, errorFn, decoder) {
        var extracted = extract(decoder);
        var mapFn = function (res) { return (res.isError()
            ? errorFn(res.error()) && result_1.default.ok(null)
            : res); };
        switch ((extracted && extracted.ctor || decoder)) {
            case object:
                var _a = extracted.args, name_1 = _a[0], keys_1 = _a[1];
                var newKeys = Object.keys(keys_1)
                    .map(function (key) {
                    var _a;
                    return (_a = {}, _a[key] = wrap(true, [], errorFn, keys_1[key]), _a);
                })
                    .reduce(assign);
                return spec(object, [name_1, newKeys], extracted.def, {
                    mapFn: function (res) { return (res.isError()
                        ? errorFn(res.error()) && result_1.default.ok({})
                        : res); }
                });
            case dict:
                return spec(dict, [wrap(true, [], errorFn, extracted.args[0])], extracted.def, { mapFn: mapFn });
            case array:
                return spec(array, [wrap(true, [], errorFn, extracted.args[0])], extracted.def, { mapFn: mapFn });
            default:
                return function (json) {
                    var decoded = decoder(json);
                    return (!hasParent && decoded.isError())
                        ? decoded.mapError(function (err) { return errorFn(new DecodeError(err.expected, err.val, err.key ? path : path.concat(err.key))); }) && result_1.default.ok(null)
                        : decoded;
                };
        }
    };
    return function (json) {
        var errors = [];
        var res = wrap(false, [], errors.push.bind(errors), decoder)(json);
        return errors.length ? result_1.default.err(errors) : res;
    };
}
exports.all = all;
/**
 * Wraps a function that accepts a value and returns a `Result`, so that it can be composed
 * with `Decoder` functions. Useful for functions that do type conversions that can fail, i.e.
 * string to `Date`.
 */
exports.parse = function (fn) { return result_1.default.chain(fn); };
//# sourceMappingURL=decoder.js.map