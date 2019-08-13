import Maybe from './maybe';

const handleErr = <Err, Val>(errFn: (e: Err) => Val, fn: () => Val): Val => {
  try {
    return fn();
  } catch (e) {
    return errFn(e);
  }
};

export default class Result<Err, Val> {

  public static chain = <Err, Val, NewVal>(
    fn: (val: Val) => Result<Err, NewVal>
  ) => (result: Result<Err, Val>) => result.chain(fn);

  public static map = <Err, Val, NewVal>(fn: (val: Val) => NewVal) => (result: Result<Err, Val>) => result.map(fn);

  public static value = <Err, Val>(result: Result<Err, Val>) => result.value();

  public static defaultTo = <Err, Val>(val: Val) => (result: Result<Err, Val>) => result.defaultTo(val);

  public static isError = <Err, Val>(result: Result<Err, Val>) => result.isError();

  public static fromMaybe = <Err>(err: Err) => <Val>(maybe: Maybe<Val>): Result<Err, Val> => (
    maybe.isNothing()
      ? Result.err(err)
      : Result.ok(maybe.value()!)
  );

  public static ok<E, T>(val: T): Result<E, T> {
    return new Result<E, T>(null as any, val);
  }

  public static err<Err, Val>(err: Err): Result<Err, Val> {
    return new Result<Err, Val>(err, null as unknown as Val);
  }

  public static toMaybe<Err, Val>(result: Result<Err, Val>) {
    return result.toMaybe();
  }

  private err!: Err;
  private val!: Val;

  private constructor(err: Err, val: Val) {
    Object.freeze(Object.assign(this, { val, err }));
  }

  public value(): Val | null {
    return typeof this.val !== 'undefined' ? this.val : null;
  }

  public error(): Err | null {
    return typeof this.err !== 'undefined' ? this.err : null;
  }

  public isError(): boolean {
    return this.error() !== null;
  }

  public chain<NewVal>(fn: (val: Val) => Result<Err, NewVal>): Result<Err, NewVal> {
    return this.isError() ? this as Result<Err, any> : fn(this.val);
  }

  public or(alt: Result<Err, Val>): Result<Err, Val> {
    return this.isError() ? alt : this;
  }

  public orLazy(fn: () => Result<Err, Val>): Result<Err, Val> {
    return this.isError() ? fn() : this;
  }

  public map<NewVal>(fn: (val: Val) => NewVal): Result<Err | Error, NewVal> {
    return this.isError()
      ? this as unknown as Result<Err, NewVal>
      : handleErr(Result.err, () => Result.ok(fn(this.val))) as Result<Error, NewVal>;
  }

  public mapError<NewErr>(fn: (err: Err) => NewErr): Result<NewErr, Val> {
    return this.isError()
      ? Result.err(fn(this.error()!))
      : this as unknown as Result<NewErr, Val>;
  }

  public fold<NewVal>(errFn: (err: Err) => NewVal, fn: (val: Val) => NewVal): NewVal {
    return this.isError() ? errFn(this.err) : fn(this.val);
  }

  public defaultTo(val: Val): Val {
    return this.isError() ? val : this.val;
  }

  public toMaybe(): Maybe<Val> {
    return this.isError() ? Maybe.empty : Maybe.of(this.val);
  }
}
