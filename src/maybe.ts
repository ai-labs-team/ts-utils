import { any, complement, anyPass, curry, ifElse, isEmpty, isNil, map, pipe, all } from 'ramda';

export default class Maybe<Val> {

  public static map = curry(<T, U>(fn: (val: T) => U, maybe: Maybe<T>) => maybe.map(fn));

  public static empty = Maybe.of<any>(null);

  public static defaultToLazy = curry(<Val>(fn: () => Val, maybe: Maybe<Val>) => maybe.defaultToLazy(fn));

  public static defaultTo = curry(<Val>(val: Val, maybe: Maybe<Val>) => maybe.defaultTo(val));

  public static orLazy = curry(<Val>(fn: () => Maybe<Val>, maybe: Maybe<Val>) => maybe.orLazy(fn));

  public static or = curry(<Val>(val: Maybe<Val>, maybe: Maybe<Val>) => maybe.or(val));

  public static isNothing = <Val>(maybe: Maybe<Val>) => maybe.isNothing();

  public static value = <Val>(maybe: Maybe<Val>) => maybe.value();

  public static of<Val>(val: Val | null | undefined): Maybe<Val> {
    return new Maybe(val);
  }

  /**
   * Maps a `Array<Maybe<Val>>` into a `Maybe<Array<Val>>` _only_ if none of the array elements
   * is `Nothing`.
   */
  public static all = <Val>(list: Maybe<Val>[]): Maybe<Val[]> => {
    return all(complement(Maybe.isNothing), list)
      ? Maybe.of(list.map(Maybe.value))
      : Maybe.empty;
  }

  /**
   * Converts a list of `Maybe` to a `Maybe` list, which is `Nothing` unless _all_
   * items in the list have a value.
   */
  public static toList: <Val>(maybe: Array<Maybe<Val>>) => Maybe<Val[]> = ifElse(
    anyPass([isNil, isEmpty, any(Maybe.isNothing)]),
    () => Maybe.empty,
    pipe(map(Maybe.value), Maybe.of),
  );

  /**
   * Allows an empty `Maybe` value to be typed according to the nullable value it wraps, i.e.:
   *
   * ```
   * Maybe.empty: Maybe<any>
   * Maybe.emptyOf<string>(): Maybe<string>
   * ```
   */
  public static emptyOf = <Val>() => Maybe.empty as Maybe<Val>;

  private val!: Val;

  constructor(val: Val | null | undefined) {
    Object.freeze(Object.assign(this, { val }));
  }

  public map<NewVal>(fn: (val: Val) => NewVal): Maybe<NewVal> {
    return this.isNothing() ? Maybe.empty : Maybe.of(fn(this.val));
  }

  public isNothing(): boolean {
    return (this.val === null || this.val === undefined);
  }

  public value(): Val | null {
    return this.isNothing() ? null : this.val;
  }

  public chain<NewVal>(fn: (val: Val) => Maybe<NewVal>): Maybe<NewVal> {
    return this.isNothing() ? this as unknown as Maybe<NewVal> : fn(this.val);
  }

  public defaultTo(val: Val): Val {
    return this.isNothing() ? val : this.val;
  }

  public defaultToLazy(fn: () => Val): Val {
    return this.isNothing() ? fn() : this.val;
  }

  public or(alt: Maybe<Val>): Maybe<Val> {
    return this.isNothing() ? alt : this;
  }

  public orLazy(fn: () => Maybe<Val>): Maybe<Val> {
    return this.isNothing() ? fn() : this;
  }
}
