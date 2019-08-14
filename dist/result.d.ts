import Maybe from './maybe';
export default class Result<Err, Val> {
    static chain: <Err_1, Val_1, NewVal>(fn: (val: Val_1) => Result<Err_1, NewVal>) => (result: Result<Err_1, Val_1>) => Result<Err_1, NewVal>;
    static map: <Err_1, Val_1, NewVal>(fn: (val: Val_1) => NewVal) => (result: Result<Err_1, Val_1>) => Result<Err_1, NewVal>;
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
    chain<NewVal>(fn: (val: Val) => Result<Err, NewVal>): Result<Err, NewVal>;
    or(alt: Result<Err, Val>): Result<Err, Val>;
    orLazy(fn: () => Result<Err, Val>): Result<Err, Val>;
    map<NewVal>(fn: (val: Val) => NewVal): Result<Err, NewVal>;
    mapError<NewErr>(fn: (err: Err) => NewErr): Result<NewErr, Val>;
    fold<NewVal>(errFn: (err: Err) => NewVal, fn: (val: Val) => NewVal): NewVal;
    defaultTo(val: Val): Val;
    toMaybe(): Maybe<Val>;
}
//# sourceMappingURL=result.d.ts.map