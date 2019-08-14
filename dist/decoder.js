"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var result_1 = __importDefault(require("./result"));
var isDefined = function (val) { return val !== null && val !== undefined; };
var toArray = function (val) { return (Array.isArray(val)
    ? val
    : isDefined(val)
        ? [val]
        : []); };
function nullable(decoder, defaultVal, mapper) {
    return new Decoder(function (json) { return ((!isDefined(json) && isDefined(defaultVal))
        ? result_1.default.ok(defaultVal)
        : (isDefined(json) && isDefined(mapper))
            ? decoder.decode(json).map(mapper)
            : isDefined(json)
                ? decoder.decode(json)
                : result_1.default.ok(null)); });
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
var DecodeError = /** @class */ (function () {
    function DecodeError(expected, val, key) {
        if (key === void 0) { key = null; }
        Object.freeze(Object.assign(this, { expected: expected, val: val, key: toArray(key) }));
    }
    DecodeError.nest = function (key) {
        return function (err) { return err.nest(key); };
    };
    DecodeError.prototype.nest = function (key) {
        return new DecodeError(this.expected, this.val, [key].concat(this.key));
    };
    DecodeError.prototype.toString = function () {
        return [
            'Decode Error: Expected ',
            (this.expected.name || this.expected),
            ', got',
            (' `' + JSON.stringify(this.val) + '` '),
            this.key.length
                ? "in path " + this.key.map(function (k) { return k.toString(); }).join('').replace(/^\s*>\s+/, '')
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
var Decoder = /** @class */ (function () {
    function Decoder(decodeFn) {
        this.decodeFn = decodeFn;
    }
    Decoder.decode = function (decoder) {
        return function (val) { return decoder.decode(val); };
    };
    Decoder.prototype.decode = function (val) {
        return this.decodeFn(val);
    };
    Decoder.string = new Decoder(function (json) { return toDecodeResult(typeof json === 'string', String, json); });
    Decoder.number = new Decoder(function (json) { return toDecodeResult(typeof json === 'number', Number, json); });
    Decoder.bool = new Decoder(function (json) { return toDecodeResult(typeof json === 'boolean', Boolean, json); });
    Decoder.nullable = nullable;
    Decoder.array = function (elementDecoder) { return new Decoder(function (json) { return (Array.isArray(json)
        ? json.reduce(function (prev, current, index) { return (elementDecoder
            .decode(current)
            .mapError(DecodeError.nest(new Index(index)))
            .chain(function (decoded) { return prev.map(function (list) { return list.concat([decoded]); }); })); }, result_1.default.ok([]))
        : result_1.default.err(new DecodeError(Array, json))); }); };
    Decoder.oneOf = function (decoders) { return new Decoder(function (json) { return decoders.reduce(function (result, decoder) { return (result.isError()
        ? decoder.decode(json)
        : result); }, result_1.default.err(new DecodeError("[OneOf " + decoders.length + "]", json))); }); };
    Decoder.object = function (name, decoders) { return new Decoder(function (json) { return ((json === null || typeof json !== 'object')
        ? result_1.default.err(new DecodeError(Object, json, new TypedObject(name)))
        : Object.keys(decoders).reduce(function (acc, key) { return (acc.chain(function (obj) { return (decoders[key]
            .decode(json[key])
            .mapError(DecodeError.nest(new ObjectKey(key)))
            .map(function (val) {
            var _a;
            return Object.assign(obj, (_a = {}, _a[key] = val, _a));
        })); })); }, result_1.default.ok({})).mapError(DecodeError.nest(new TypedObject(name)))); }); };
    return Decoder;
}());
exports.default = Decoder;
//# sourceMappingURL=decoder.js.map