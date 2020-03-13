import Maybe from './maybe';
export default class Result<Err, Val> {
    static chain: <Err_1, Val_1, NewErr, NewVal>(fn: (val: Val_1) => Result<Err_1 | NewErr, NewVal>) => (result: Result<Err_1, Val_1>) => Result<Err_1 | NewErr, NewVal>;
    /**
     * Wraps a function that could throw an error, and returns a `Result` that either contains
     * the return value of the function, or the error thrown.
     */
    static attempt: <In, Out>(fn: (x: In) => Out) => (x: In) => Result<Error, Out>;
    static map: <Err_1, Val_1, NewVal>(fn: (val: Val_1) => NewVal) => (result: Result<Err_1, Val_1>) => Result<Err_1, NewVal>;
    static mapError: <Err_1, Val_1, NewErr>(fn: (err: Err_1) => NewErr) => (result: Result<Err_1, Val_1>) => Result<NewErr, Val_1>;
    static fold: <Err_1, Val_1, NewVal>(errFn: (err: Err_1) => NewVal, fn: (val: Val_1) => NewVal) => (result: Result<Err_1, Val_1>) => NewVal;
    static defaultTo: <Err_1, Val_1>(val: Val_1) => (result: Result<Err_1, Val_1>) => Val_1;
    static isError: <Err_1, Val_1>(result: Result<Err_1, Val_1>) => boolean;
    static fromMaybe: <Err_1>(err: Err_1) => <Val_1>(maybe: Maybe<Val_1>) => Result<Err_1, Val_1>;
    static ok<E, T>(val: T): Result<E, T>;
    static err<Err, Val>(err: Err): Result<Err, Val>;
    static toMaybe<Err, Val>(result: Result<Err, Val>): Maybe<Val>;
    static toPromise<Err, Val>(result: Result<Err, Val>): Promise<Val>;
    private err;
    private val;
    private constructor();
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
    toPromise(): Promise<Val>;
}
//# sourceMappingURL=result.d.ts.map