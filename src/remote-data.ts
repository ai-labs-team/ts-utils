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

import { always, cond, curry, propEq, zipObj } from 'ramda';

import Maybe from './maybe';

const valueTag = Symbol.for('@ts-utils/remote-data/value');
const errorTag = Symbol.for('@ts-utils/remote-data/error');

abstract class RemoteDataAbstract<Val> {

  public defaultTo(val: Val) {
    return val;
  }

  public map<NewVal>(_: (val: Val) => NewVal) {
    return this as unknown as RemoteDataAbstract<NewVal>;
  }

  public toMaybe(): Maybe<Val> {
    return Maybe.empty;
  }
}

class DataNotLoaded<Val = unknown> extends RemoteDataAbstract<Val> {
  private toJSON() {
    return { state: 'notLoaded' };
  }
}
class DataLoading<Val = unknown> extends RemoteDataAbstract<Val> {
  private toJSON() {
    return { state: 'loading' };
  }
}
class DataLoaded<Val> extends RemoteDataAbstract<Val> {

  private [valueTag]!: Val;

  constructor(data: Val) {
    super();
    this[valueTag] = data;
    Object.freeze(this);
  }

  public defaultTo<Val>(_: Val) {
    return this[valueTag];
  }

  public map<NewVal>(fn: (val: Val) => NewVal): DataLoaded<NewVal> {
    return new DataLoaded(fn(this[valueTag]));
  }

  public toMaybe(): Maybe<Val> {
    return Maybe.of(this[valueTag]);
  }

  private toJSON() {
    return { state: 'loaded', data: this[valueTag] };
  }
}
class DataFailed<Err> extends RemoteDataAbstract<unknown> {

  private [errorTag]!: Err;

  constructor(error: Err) {
    super();
    this[errorTag] = error;
    Object.freeze(this);
  }

  private toJSON() {
    return { state: 'failed', error: this[errorTag] };
  }
}

/**
 * The primary `RemoteData` union type. Accepts a type parameter for the actual value that you're wrapping,
 * as well as an optional type parameter for the `Error` type.
 */
export type RemoteData<Val, Err = any>
  = DataNotLoaded<Val>
  | DataLoading<Val>
  | DataLoaded<Val>
  | DataFailed<Err>

/**
 * Value type to assign when setting data to an initial state, i.e.:
 *
 * @example
 * ```
 * init: () => ({ accounts: RemoteData.NotLoaded })
 * ```
 */
export const NotLoaded = new DataNotLoaded();

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
export const Loading = new DataLoading();

/**
 * @example
 * ```
 * [AccountsLoaded, (model, { data }) => ({
 *   accounts: RemoteData.Loaded(data)
 * })],
 * ```
 */
export const Loaded = <Val>(data: Val) => new DataLoaded(data);

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
export const Failed = <Err>(error: Err): DataFailed<Err> => new DataFailed(error);

/**
 * Transforms a `RemoteData` value in a `LOADED` or `RELOADING` state to a new value in
 * the same state. Returns values in other states unmodified.
 *
 * @typeparam Val The underlying value that `RemoteData` is wrapping
 * @typeparam NewVal The value that `fn` will map to
 * @typeparam E The `Error` value of the passed `RemoteData` instance
 */
export const map = <Val, NewVal, Err>(fn: (d: Val) => NewVal) => (rd: RemoteData<Val, Err>): RemoteData<Val, Err> => (
  (rd as any).map(fn)
);

export const defaultTo: {
  <Val>(val: Val, rd: RemoteData<Val, any>): Val;
  <Val>(val: Val): (rd: RemoteData<Val, any>) => Val;
} = curry(<Val>(val: Val, rd: RemoteData<Val, any>) => (rd.defaultTo(val)));

export const toMaybe = <Val>(rd: RemoteData<Val>): Maybe<Val> => (
  rd instanceof DataLoaded ? Maybe.of(rd[valueTag]) : Maybe.empty
);

/**
 * Represents a set of key/value pairs where the values are `RemoteData`-wrapped.
 *
 * @typeparam Err The `Error` type
 * @typeparam Val The underlying object type, i.e.
 *   `Keyed<{ foo: boolean }, any> === { foo: RemoteData<boolean, any> }`
 */
export type Keyed<Val, Err> = { [K in keyof Val]: RemoteData<Val[K], Err> };

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
export const mapKeys: {
  <Val, NewVal, Err>(fn: (data: Val) => NewVal, data: Keyed<Val, Err>): Maybe<NewVal>;
  <Val, NewVal, Err>(fn: (data: Val) => NewVal): (data: Keyed<Val, Err>) => Maybe<NewVal>;
} = curry(<Val, NewVal, Err>(fn: (data: Val) => NewVal, data: Keyed<Val, Err>) => (
  Maybe.all(Object.keys(data).map(key => data[key as keyof Val].toMaybe()))
    .map(zipObj(Object.keys(data)))
    .map(fn as any)
)) as any;

export const fromJSON: (val: any) => RemoteData<unknown> = cond([
  [propEq('state', 'loading'), always(Loading)],
  [propEq('state', 'loaded'), ({ data }) => Loaded(data)],
  [propEq('state', 'failed'), ({ error }) => Failed(error)],
  [always(true), always(NotLoaded)],
]);
