import { any, anyPass, curry, ifElse, isEmpty, isNil, map, pipe } from 'ramda';

export default class Maybe<T> {

  public static map = curry(<T, U>(fn: (val: T) => U, maybe: Maybe<T>) => maybe.map(fn));

  public static empty = Maybe.of<any>(null);

  public static defaultToLazy = curry(<T>(fn: () => T, maybe: Maybe<T>) => maybe.defaultToLazy(fn));

  public static defaultTo = curry(<T>(val: T, maybe: Maybe<T>) => maybe.defaultTo(val));

  public static orLazy = curry(<T>(fn: () => Maybe<T>, maybe: Maybe<T>) => maybe.orLazy(fn));

  public static or = curry(<T>(val: Maybe<T>, maybe: Maybe<T>) => maybe.or(val));

  public static isNothing = <T>(maybe: Maybe<T>) => maybe.isNothing();

  public static value = <T>(maybe: Maybe<T>) => maybe.value();

  public static of<T>(val: T | null | undefined): Maybe<T> {
    return new Maybe(val);
  }

  /**
   * Converts a list of `Maybe` to a `Maybe` list, which is `Nothing` unless _all_
   * items in the list have a value.
   */
  public static toList: <T>(maybe: Array<Maybe<T>>) => Maybe<T[]> = ifElse(
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
  public static emptyOf = <T>() => Maybe.empty as Maybe<T>;

  private val!: T;

  constructor(val: T | null | undefined) {
    Object.freeze(Object.assign(this, { val }));
  }

  public map<U>(fn: (val: T) => U): Maybe<U> {
    return this.isNothing() ? Maybe.empty : Maybe.of(fn(this.val));
  }

  public isNothing(): boolean {
    return (this.val === null || this.val === undefined);
  }

  public value(): T | null {
    return this.isNothing() ? null : this.val;
  }

  public chain<U>(fn: (val: T) => Maybe<U>): Maybe<U> {
    return this.isNothing() ? this as any as Maybe<U> : fn(this.val);
  }

  public defaultTo(val: T): T {
    return this.isNothing() ? val : this.val;
  }

  public defaultToLazy(fn: () => T): T {
    return this.isNothing() ? fn() : this.val;
  }

  public or(alt: Maybe<T>): Maybe<T> {
    return this.isNothing() ? alt : this;
  }

  public orLazy(fn: () => Maybe<T>): Maybe<T> {
    return this.isNothing() ? fn() : this;
  }
}
