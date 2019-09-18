import Maybe from './maybe';
export default class Result<Err, Val> {
    static chain: <Err_1, Val_1, NewErr, NewVal>(fn: (val: Val_1) => Result<NewErr, NewVal>) => (result: Result<Err_1, Val_1>) => Result<Err_1 | NewErr, NewVal>;
    /**
     * Wraps a function that could throw an error, and returns a `Result` that either contains
     * the return value of the function, or the error thrown.
     */
    static attempt: <In, Val_1>(fn: (x: In) => Val_1) => (x: In) => Result<Error, Val_1>;
    static map: <Err_1, Val_1, NewVal>(fn: (val: Val_1) => NewVal) => (result: Result<Err_1, Val_1>) => Result<Err_1, NewVal>;
    static fold: <Err_1, Val_1, NewVal>(errFn: (err: Err_1) => NewVal, fn: (val: Val_1) => NewVal) => (result: Result<Err_1, Val_1>) => NewVal;
    static value: <Err_1, Val_1>(result: Result<Err_1, Val_1>) => Val_1 | null;
    static defaultTo: <Err_1, Val_1>(val: Val_1) => (result: Result<Err_1, Val_1>) => Val_1;
    static isError: <Err_1, Val_1>(result: Result<Err_1, Val_1>) => boolean;
    static fromMaybe: <Err_1>(err: Err_1) => <Val_1>(maybe: Maybe<Val_1>) => Result<Err_1, Val_1>;
    static ok<E, T>(val: T): Result<E, T>;
    static err<Err, Val>(err: Err): Result<Err, Val>;
    static toMaybe<Err, Val>(result: Result<Err, Val>): Maybe<Val>;
    private err;
    private val;
    private constructor();
    value(): Val | null;
    error(): Err | null;
    isError(): boolean;
    chain<NewErr, NewVal>(fn: (val: Val) => Result<NewErr, NewVal>): Result<Err | NewErr, NewVal>;
    or(alt: Result<Err, Val>): Result<Err, Val>;
    orLazy(fn: () => Result<Err, Val>): Result<Err, Val>;
    map<NewVal>(fn: (val: Val) => NewVal): Result<Err, NewVal>;
    mapError<NewErr>(fn: (err: Err) => NewErr): Result<NewErr, Val>;
    fold<NewVal>(errFn: (err: Err) => NewVal, fn: (val: Val) => NewVal): NewVal;
    defaultTo(val: Val): Val;
    toMaybe(): Maybe<Val>;
}
//# sourceMappingURL=result.d.ts.map