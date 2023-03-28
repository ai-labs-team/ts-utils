"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.alias = exports.generator = exports.SpecGenerator = void 0;
var ramda_1 = require("ramda");
var seedrandom_1 = __importDefault(require("seedrandom"));
var decoder_1 = require("./decoder");
var defaults = [
    [decoder_1.string, function (gen) { return ((new Array(Math.round(gen.rng.double() * 100))).fill('').map(function () { return String.fromCharCode(Math.round(gen.rng.double() * 250) + 32); }).join('')); }],
    [decoder_1.number, function (gen) { return gen.rng.int32(); }],
    [decoder_1.boolean, function (gen) { return gen.rng.double() >= 0.5; }],
    [decoder_1.nullable, function (gen, _a) {
            var spec = _a[0];
            return gen.rng.double() >= 0.5 ? null : gen.fromSpec(spec);
        }],
    [decoder_1.array, function (gen, _a) {
            var spec = _a[0];
            return new Array(Math.floor(gen.rng.double() * 10)).fill(null).map(function () { return gen.fromSpec(spec); });
        }],
    [decoder_1.object, function (gen, _a) {
            var _ = _a[0], keys = _a[1];
            return Object.keys(keys).map(function (key) {
                var _a;
                return (_a = {}, _a[key] = gen.fromSpec(keys[key]), _a);
            }).reduce(ramda_1.merge);
        }],
    [decoder_1.inList, function (gen, _a) {
            var list = _a[0];
            return list[Math.floor(gen.rng.double() * list.length)];
        }],
];
var SpecGenerator = /** @class */ (function () {
    function SpecGenerator(opts) {
        if (opts === void 0) { opts = {}; }
        this.rng = new seedrandom_1.default(opts.seed);
        this.specs = new Map(opts.specs);
    }
    SpecGenerator.prototype.fromSpec = function (spec) {
        var def = decoder_1.extract(spec);
        var gen = this.specs.get(def && def.ctor || spec);
        if (!gen) {
            throw new Error('No generator for spec ' + spec);
        }
        return gen(this, def && def.args || []);
    };
    SpecGenerator.prototype.fromList = function (list) {
        return list[Math.floor(this.rng.double() * (list.length - 1))];
    };
    return SpecGenerator;
}());
exports.SpecGenerator = SpecGenerator;
/**
 * Builds a generator that can produce random data from a spec.
 */
var generator = function (opts) {
    if (opts === void 0) { opts = { specs: [], seed: seedrandom_1.default().int32() }; }
    return (new SpecGenerator(ramda_1.merge(opts, { specs: defaults.concat(opts.specs || []) })));
};
exports.generator = generator;
/**
 * Alias a scalar decoder in order to pair it with a custom generator, i.e.:
 *
 * ```
 * const firstName = alias(string);
 *
 * generator({ specs: [[firstName, gen => gen.fromList(['Alice', 'Bob'])]] })
 * ```
 */
var alias = function (decoder) { return (function (json) { return decoder(json); }); };
exports.alias = alias;
//# sourceMappingURL=generator.js.map