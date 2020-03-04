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
import Maybe from './maybe';
declare const valueTag: unique symbol;
declare const errorTag: unique symbol;
declare abstract class RemoteDataAbstract<Val> {
    defaultTo(val: Val): Val;
    map<NewVal>(_: (val: Val) => NewVal): RemoteDataAbstract<NewVal>;
    toMaybe(): Maybe<Val>;
}
declare class DataNotLoaded<Val = unknown> extends RemoteDataAbstract<Val> {
    private toJSON;
}
declare class DataLoading<Val = unknown> extends RemoteDataAbstract<Val> {
    private toJSON;
}
declare class DataLoaded<Val> extends RemoteDataAbstract<Val> {
    private [valueTag];
    constructor(data: Val);
    defaultTo<Val>(_: Val): Val;
    map<NewVal>(fn: (val: Val) => NewVal): DataLoaded<NewVal>;
    toMaybe(): Maybe<Val>;
    private toJSON;
}
declare class DataFailed<Err> extends RemoteDataAbstract<unknown> {
    private [errorTag];
    constructor(error: Err);
    private toJSON;
}
/**
 * The primary `RemoteData` union type. Accepts a type parameter for the actual value that you're wrapping,
 * as well as an optional type parameter for the `Error` type.
 */
export declare type RemoteData<Val, Err = any> = DataNotLoaded<Val> | DataLoading<Val> | DataLoaded<Val> | DataFailed<Err>;
/**
 * Value type to assign when setting data to an initial state, i.e.:
 *
 * @example
 * ```
 * init: () => ({ accounts: RemoteData.NotLoaded })
 * ```
 */
export declare const NotLoaded: DataNotLoaded<unknown>;
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
export declare const Loading: DataLoading<unknown>;
/**
 * @example
 * ```
 * [AccountsLoaded, (model, { data }) => ({
 *   accounts: RemoteData.Loaded(data)
 * })],
 * ```
 */
export declare const Loaded: <Val>(data: Val) => DataLoaded<Val>;
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
export declare const Failed: <Err>(error: Err) => DataFailed<Err>;
/**
 * Transforms a `RemoteData` value in a `LOADED` or `RELOADING` state to a new value in
 * the same state. Returns values in other states unmodified.
 *
 * @typeparam Val The underlying value that `RemoteData` is wrapping
 * @typeparam NewVal The value that `fn` will map to
 * @typeparam E The `Error` value of the passed `RemoteData` instance
 */
export declare const map: <Val, NewVal, Err>(fn: (d: Val) => NewVal) => (rd: RemoteData<Val, Err>) => RemoteData<Val, Err>;
export declare const defaultTo: {
    <Val>(val: Val, rd: RemoteData<Val, any>): Val;
    <Val>(val: Val): (rd: RemoteData<Val, any>) => Val;
};
export declare const toMaybe: <Val>(rd: RemoteData<Val, any>) => Maybe<Val>;
/**
 * Represents a set of key/value pairs where the values are `RemoteData`-wrapped.
 *
 * @typeparam Err The `Error` type
 * @typeparam Val The underlying object type, i.e.
 *   `Keyed<{ foo: boolean }, any> === { foo: RemoteData<boolean, any> }`
 */
export declare type Keyed<Val, Err> = {
    [K in keyof Val]: RemoteData<Val[K], Err>;
};
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
export declare const mapKeys: {
    <Val, NewVal, Err>(fn: (data: Val) => NewVal, data: Keyed<Val, Err>): Maybe<NewVal>;
    <Val, NewVal, Err>(fn: (data: Val) => NewVal): (data: Keyed<Val, Err>) => Maybe<NewVal>;
};
export declare const fromJSON: (val: any) => RemoteData<unknown>;
export {};
//# sourceMappingURL=remote-data.d.ts.map