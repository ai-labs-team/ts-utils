export default class Maybe<T> {
    static map: import("ts-toolbelt/out/types/src/Function/Curry").Curry<(<T_1, U>(fn: (val: T_1) => U, maybe: Maybe<T_1>) => Maybe<U>)>;
    static empty: Maybe<any>;
    static defaultToLazy: import("ts-toolbelt/out/types/src/Function/Curry").Curry<(<T_1>(fn: () => T_1, maybe: Maybe<T_1>) => T_1)>;
    static defaultTo: import("ts-toolbelt/out/types/src/Function/Curry").Curry<(<T_1>(val: T_1, maybe: Maybe<T_1>) => T_1)>;
    static orLazy: import("ts-toolbelt/out/types/src/Function/Curry").Curry<(<T_1>(fn: () => Maybe<T_1>, maybe: Maybe<T_1>) => Maybe<T_1>)>;
    static or: import("ts-toolbelt/out/types/src/Function/Curry").Curry<(<T_1>(val: Maybe<T_1>, maybe: Maybe<T_1>) => Maybe<T_1>)>;
    static isNothing: <T_1>(maybe: Maybe<T_1>) => boolean;
    static value: <T_1>(maybe: Maybe<T_1>) => T_1 | null;
    static of<T>(val: T): Maybe<T>;
    /**
     * Converts a list of `Maybe` to a `Maybe` list, which is `Nothing` unless _all_
     * items in the list have a value.
     */
    static toList: <T>(maybe: Array<Maybe<T>>) => Maybe<T[]>;
    /**
     * Allows an empty `Maybe` value to be typed according to the nullable value it wraps, i.e.:
     *
     * ```
     * Maybe.empty: Maybe<any>
     * Maybe.emptyOf<string>(): Maybe<string>
     * ```
     */
    static emptyOf: <T_1>() => Maybe<T_1>;
    private val;
    constructor(val: T | null | undefined);
    map<U>(fn: (val: T) => U): Maybe<U>;
    isNothing(): boolean;
    value(): T | null;
    chain<U>(fn: (val: T) => Maybe<U>): Maybe<U>;
    defaultTo(val: T): T;
    defaultToLazy(fn: () => T): T;
    or(alt: Maybe<T>): Maybe<T>;
    orLazy(fn: () => Maybe<T>): Maybe<T>;
}
//# sourceMappingURL=maybe.d.ts.map