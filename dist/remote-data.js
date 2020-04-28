"use strict";
/**
 * # RemoteData
 *
 * ### A principled, type-safe abstraction for managing asynchronous data
 *
 * Data loaded from remote systems can be in many different states, and ensuring correct
 * UI behavior across all states is tricky, especially when we start interacting with multiple
 * pieces of asynchronous data in-tandem.
 *
 * `RemoteData` is a data type that precisely represents all possible states, and its module
 * API acts as an intermediary that provides strong guarantees around how you access your data.
 *
 * For more information, see [Slaying a UI Antipattern](https://www.youtube.com/watch?v=NLcRzOyrH08).
 */ /** */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var ramda_1 = require("ramda");
var maybe_1 = __importDefault(require("./maybe"));
var valueTag = Symbol.for('@ts-utils/remote-data/value');
var errorTag = Symbol.for('@ts-utils/remote-data/error');
var RemoteDataAbstract = /** @class */ (function () {
    function RemoteDataAbstract() {
    }
    RemoteDataAbstract.prototype.defaultTo = function (val) {
        return val;
    };
    RemoteDataAbstract.prototype.map = function (_) {
        return this;
    };
    RemoteDataAbstract.prototype.toMaybe = function () {
        return maybe_1.default.empty;
    };
    return RemoteDataAbstract;
}());
var DataNotLoaded = /** @class */ (function (_super) {
    __extends(DataNotLoaded, _super);
    function DataNotLoaded() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    DataNotLoaded.prototype.toJSON = function () {
        return { state: 'notLoaded' };
    };
    return DataNotLoaded;
}(RemoteDataAbstract));
var DataLoading = /** @class */ (function (_super) {
    __extends(DataLoading, _super);
    function DataLoading() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    DataLoading.prototype.toJSON = function () {
        return { state: 'loading' };
    };
    return DataLoading;
}(RemoteDataAbstract));
var DataLoaded = /** @class */ (function (_super) {
    __extends(DataLoaded, _super);
    function DataLoaded(data) {
        var _this = _super.call(this) || this;
        _this[valueTag] = data;
        Object.freeze(_this);
        return _this;
    }
    DataLoaded.prototype.defaultTo = function (_) {
        return this[valueTag];
    };
    DataLoaded.prototype.map = function (fn) {
        return new DataLoaded(fn(this[valueTag]));
    };
    DataLoaded.prototype.toMaybe = function () {
        return maybe_1.default.of(this[valueTag]);
    };
    DataLoaded.prototype.toJSON = function () {
        return { state: 'loaded', data: this[valueTag] };
    };
    return DataLoaded;
}(RemoteDataAbstract));
var DataFailed = /** @class */ (function (_super) {
    __extends(DataFailed, _super);
    function DataFailed(error) {
        var _this = _super.call(this) || this;
        _this[errorTag] = error;
        Object.freeze(_this);
        return _this;
    }
    DataFailed.prototype.toJSON = function () {
        return { state: 'failed', error: this[errorTag] };
    };
    return DataFailed;
}(RemoteDataAbstract));
/**
 * Value type to assign when setting data to an initial state, i.e.:
 *
 * @example
 * ```
 * init: () => ({ accounts: RemoteData.NotLoaded })
 * ```
 */
exports.NotLoaded = new DataNotLoaded();
/**
 * Value type to assign when you start loading the data.
 *
 * @example
 * ```
 *
 * init: () => [
 *   { accounts: RemoteData.Loading },
 *   new Http.Get({ url: '/accounts', result: AccountsLoaded, error: AccountsError })
 * ],
 * ```
 */
exports.Loading = new DataLoading();
/**
 * @example
 * ```
 * [AccountsLoaded, (model, { data }) => ({
 *   accounts: RemoteData.Loaded(data)
 * })],
 * ```
 */
exports.Loaded = function (data) { return new DataLoaded(data); };
/**
 * Marks data that has failed to load.
 *
 * @example
 * ```
 *
 * [AccountsError, (model, { data }) => ({
 *   accounts: RemoteData.Failed(data)
 * })],
 * ```
 */
exports.Failed = function (error) { return new DataFailed(error); };
/**
 * Transforms a `RemoteData` value in a `LOADED` or `RELOADING` state to a new value in
 * the same state. Returns values in other states unmodified.
 *
 * @typeparam Val The underlying value that `RemoteData` is wrapping
 * @typeparam NewVal The value that `fn` will map to
 * @typeparam E The `Error` value of the passed `RemoteData` instance
 */
exports.map = function (fn) { return function (rd) { return (rd.map(fn)); }; };
exports.defaultTo = function (val) { return function (rd) { return (rd.defaultTo(val)); }; };
exports.toMaybe = function (rd) { return (rd instanceof DataLoaded ? maybe_1.default.of(rd[valueTag]) : maybe_1.default.empty); };
/**
 * Accepts a mapping function, and an object where all values are `RemoteData`.
 * Executes the mapping function if all values have data, and returns the result as
 * a `Maybe`, otherwise returns `Nothing`.
 *
 * @typeparam Val An object where the values are the unwrapped data
 * @typeparam NewVal The return value of the mapping function
 * @typeparam Err The `RemoteData` `Error` type
 *
 * @param fn The mapping function—accepts a keyed object where the values are unwrapped data
 * @param rd An object of key/value pairs, where the values are `RemoteData`-wrapped values
 */
exports.mapKeys = function (fn) { return function (data) { return (maybe_1.default.all(Object.keys(data).map(function (key) { return data[key].toMaybe(); }))
    .map(ramda_1.zipObj(Object.keys(data)))
    .map(fn)); }; };
exports.fromJSON = ramda_1.cond([
    [ramda_1.propEq('state', 'loading'), ramda_1.always(exports.Loading)],
    [ramda_1.propEq('state', 'loaded'), function (_a) {
            var data = _a.data;
            return exports.Loaded(data);
        }],
    [ramda_1.propEq('state', 'failed'), function (_a) {
            var error = _a.error;
            return exports.Failed(error);
        }],
    [ramda_1.always(true), ramda_1.always(exports.NotLoaded)],
]);
//# sourceMappingURL=remote-data.js.map