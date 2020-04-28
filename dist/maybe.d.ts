export default class Maybe<Val> {
    static map: <T, U>(fn: (val: T) => U) => (maybe: Maybe<T>) => Maybe<U>;
    static empty: Maybe<any>;
    static defaultToLazy: <Val_1>(fn: () => Val_1) => (maybe: Maybe<Val_1>) => Val_1;
    static defaultTo: <Val_1>(val: Val_1) => (maybe: Maybe<Val_1>) => Val_1;
    static orLazy: <Val_1>(fn: () => Maybe<Val_1>) => (maybe: Maybe<Val_1>) => Maybe<Val_1>;
    static or: <Val_1>(val: Maybe<Val_1>) => (maybe: Maybe<Val_1>) => Maybe<Val_1>;
    static isNothing: <Val_1>(maybe: Maybe<Val_1>) => boolean;
    static value: <Val_1>(maybe: Maybe<Val_1>) => Val_1 | null;
    static of<Val>(val: Val | null | undefined): Maybe<Val>;
    /**
     * Maps a `Array<Maybe<Val>>` into a `Maybe<Array<Val>>` _only_ if none of the array elements
     * is `Nothing`.
     */
    static all: <Val_1>(list: Maybe<Val_1>[]) => Maybe<Val_1[]>;
    /**
     * Converts a list of `Maybe` to a `Maybe` list, which is `Nothing` unless _all_
     * items in the list have a value.
     */
    static toList: <Val>(maybe: Array<Maybe<Val>>) => Maybe<Val[]>;
    /**
     * Allows an empty `Maybe` value to be typed according to the nullable value it wraps, i.e.:
     *
     * ```
     * Maybe.empty: Maybe<any>
     * Maybe.emptyOf<string>(): Maybe<string>
     * ```
     */
    static emptyOf: <Val_1>() => Maybe<Val_1>;
    private val;
    constructor(val: Val | null | undefined);
    map<NewVal>(fn: (val: Val) => NewVal): Maybe<NewVal>;
    isNothing(): boolean;
    value(): Val | null;
    chain<NewVal>(fn: (val: Val) => Maybe<NewVal>): Maybe<NewVal>;
    defaultTo(val: Val): Val;
    defaultToLazy(fn: () => Val): Val;
    or(alt: Maybe<Val>): Maybe<Val>;
    orLazy(fn: () => Maybe<Val>): Maybe<Val>;
}
//# sourceMappingURL=maybe.d.ts.map