import Result from './result';
import Maybe from './maybe';

const identity = <A>(a: A) => a;

const defTag = Symbol.for('@ts-utils/decoder/def');

const spec = <T>(ctor: Function, args: any[], def: (val: any, args: any[], opts?: any) => T, opts = {}): (val: any) => T => (
  Object.assign((val: any) => (
    val === defTag
      ? ({ ctor, args, def } as unknown as T)
      : def(val, args, opts)
  ), { [defTag]: true })
);

type DecoderSpec<Val, Err, Args> = {
  ctor: Decoder<Val, Err> | typeof object;
  args: Args;
  def: any;
};

export function extract<Val, Err>(decoder: ReturnType<typeof object>): DecoderSpec<Val, Err, [string, DecoderObject<Val, Err>]>;
export function extract<Val, Err>(decoder: ReturnType<typeof dict>): DecoderSpec<Val, Err, [Decoder<Val, Err>]>;
export function extract<Val, Err>(decoder: unknown): DecoderSpec<unknown, unknown, unknown> {
  return (decoder as any)[defTag] ? (decoder as any)(defTag) : null;
}

const isDefined = (val: any) => val !== null && val !== undefined;
const toArray = (val: any) => Array.isArray(val) ? val : isDefined(val) ? [val] : [];
const assign = <A extends {}, B extends {}>(acc: A, val: B): A & B => Object.assign(acc, val);

export type Decoder<Val, AltErr = never> = (json: any) => Result<DecodeError<AltErr>, Val>;
export type ComposedDecoder<Val, AltErr = never> = (json: any) => Result<AltErr | DecodeError<AltErr>, Val>;

/**
 * Generate a type definition from a decoder, i.e.:
 * ```
 * type MyType = Decoded<typeof myDecoder>;
 * ```
 */
export type Decoded<Model, AltErr = never> = Model extends Decoder<infer Type, AltErr>
  ? Type
  : never;

export type DecoderObject<Val, AltErr extends any> = {
  [Key in keyof Val]: ComposedDecoder<Val[Key], AltErr>
};

export type NullableObject<Val> = {
  [Key in keyof Val]: Val[Key] | null | undefined;
};

export type NullablePartial<Val> = Partial<NullableObject<Val>>;

/**
 * Treats nullable fields as optional
 * https://github.com/Microsoft/TypeScript/issues/12400#issuecomment-758523767
 */
export type OptionalNullable<T> = Optional<T> & Required<T>;
type Optional<T> = Partial<Pick<T, KeysOfType<T, null | undefined>>>;
type Required<T> = Omit<T, KeysOfType<T, null | undefined>>;
type KeysOfType<T, SelectedType> = { [key in keyof T]: SelectedType extends T[key] ? key : never }[keyof T];

type PathElement = TypedObject | Index | ObjectKey | Array<any>;

export class Index {
  public type: string = 'Index';
  constructor(public index: number) { }

  toString() {
    return `[${this.index}]`;
  }
}

export class ObjectKey {
  public type: string = 'ObjectKey';
  constructor(public name: string) { }

  toString() {
    return `.${this.name}`;
  }
}

export class TypedObject {
  public type: string = 'TypedObject';
  constructor(public name: string) { }

  toString() {
    return ` > Decoder.object(${this.name})`;
  }
}

/**
 * Represents a failed decode operation.
 */
export class DecodeError<AltErr = never> {

  public static nest<AltErr = never>(key: PathElement, val: any) {
    return (err: DecodeError<AltErr> | AltErr): DecodeError<AltErr> => (
      (err instanceof DecodeError ? err : new DecodeError(err, val)).nest(key)
    );
  }

  public expected!: Error | Function | string;
  public val!: any;
  public key!: PathElement[];

  constructor(expected: AltErr | Function | string, val: any, key: PathElement | PathElement[] | null = null) {
    Object.freeze(assign(this, { expected, val, key: toArray(key) }));
  }

  /**
   * Allows 'nesting' of decode errors 
   */
  nest(key: PathElement): DecodeError<AltErr> {
    return new DecodeError(this.expected, this.val, toArray(key).concat(this.key));
  }

  get name(): string {
    return (this.expected instanceof Error)
      ? this.expected.name
      : ((this.expected as Function).name || this.expected).toString();
  }

  get message(): string {
    return (this.expected instanceof Error)
      ? this.expected.message
      : this.errMsg();
  }

  private errMsg(): string {
    return (this.expected instanceof Error)
      ? `[${this.expected.name}]: '${this.expected.message}'`
      : `Expected ${((this.expected as Function).name || this.expected)}, got \`${JSON.stringify(this.val)}\``;
  }

  toString() {
    return [
      'Decode Error: ',
      this.errMsg(),
      this.key.length
        ? ` in path: ${this.key.map(k => k.toString()).join('').replace(/^\s*>\s+/, '')}`
        : ''
    ].join('');
  }
}

const toDecodeResult = <Val, AltErr = never>(worked: boolean, typeVal: Function | string, val: Val, key: PathElement | null = null) => (
  worked
    ? Result.ok<DecodeError<AltErr>, Val>(val)
    : Result.err<DecodeError<AltErr>, Val>(new DecodeError(typeVal, val, key))
);

export const string: Decoder<string> = (json: any) => toDecodeResult<string>(typeof json === 'string', String, json);
export const number: Decoder<number> = (json: any) => toDecodeResult<number>(typeof json === 'number', Number, json);
export const bool: Decoder<boolean> = (json: any) => toDecodeResult<boolean>(typeof json === 'boolean', Boolean, json);
export const boolean: typeof bool = bool;

/**
 * Wraps a decoder to let it be `null` or `undefined`. Optionally, you can specify a default
 * value and/or a mapping function that will apply to values if they are specified. This makes
 * it possible to, for example, convert a nullable value to a `Maybe`:
 *
 * ```
 * nullable(string, Maybe.emptyOf<string>(), Maybe.of)
 * ```
 */
export function nullable<Val, AltErr = never>(decoder: ComposedDecoder<Val, AltErr>): Decoder<Val | null | undefined, AltErr>;
export function nullable<Val, AltErr = never>(decoder: ComposedDecoder<Val, AltErr>, defaultVal: Val): Decoder<Val, AltErr>;
export function nullable<Val, NewVal, AltErr = never>(
  decoder: Decoder<NewVal, AltErr>,
  defaultVal: Val,
  mapper: (a: NewVal) => Val
): Decoder<Val, AltErr>;
export function nullable<Val, AltErr = never>(
  decoder: ComposedDecoder<Val, AltErr>,
  defaultVal?: Val,
  mapper?: (a: Val) => Val,
): ComposedDecoder<Val | null | undefined, AltErr> {
  return spec(nullable, [decoder, defaultVal, mapper], (json: any) => (
    (!isDefined(json) && isDefined(defaultVal))
      ? Result.ok<DecodeError<AltErr> | AltErr, Val>(defaultVal! as Val)
      : (isDefined(json) && isDefined(mapper))
        ? decoder(json).map(mapper!)
        : isDefined(json)
          ? decoder(json)
          : Result.ok<DecodeError<AltErr> | AltErr, Val | null | undefined>(null)
  ));
}

export function array<Val, AltErr = never>(elementDecoder: ComposedDecoder<Val>): Decoder<Val[], AltErr> {
  return spec(array, [elementDecoder], (json: any, [ed], opts: any) => (
    Array.isArray(json)
      ? (json as any[]).reduce((prev: Result<DecodeError, Val[]>, current: any, index: number) => (
        (opts && opts.mapFn || identity)(ed(current).mapError(DecodeError.nest(new Index(index), current)))
          .chain((decoded: Val) => prev.map((list: Val[]) => list.concat([decoded])))
      ), Result.ok<DecodeError, Val[]>([]))
      : Result.err<DecodeError, Val[]>(new DecodeError(Array, json))
  ));
}

/**
 * Tries each one of a list of decoders in order to find one that works, otherwise fails.
 */
export function oneOf<Val, AltErr = never>(decoders: ReadonlyArray<ComposedDecoder<Val, AltErr>>): Decoder<Val, string> {
  return spec(oneOf, [decoders], (json: any) => (
    decoders.reduce(
      (result, decoder) => (result.isError() ? decoder(json) : result as Result<any, Val>),
      Result.err(new DecodeError(`[OneOf ${decoders.length}]`, json))
    ) as Result<DecodeError<AltErr>, Val>
  ));
}

/**
 * Decodes an object:
 *
 * ```
 * const test = object('Test Object', {
 *   name: nullable(string),
 *   email: string,
 *   subscribed: boolean
 * });
 * ```
 */
export function object<Val, AltErr>(
  name: string,
  decoders: DecoderObject<Val, AltErr>,
): Decoder<OptionalNullable<Val>, AltErr> {
  return spec(object, [name, decoders], (json: any, [n, de], opts: any) => (
    (json === null || typeof json !== 'object')
      ? Result.err(new DecodeError(Object, json, new TypedObject(n)))
      : (Object.keys(de) as Array<keyof Val>).reduce((acc, key) => (
        (opts && opts.mapFn || identity)(acc.chain(obj => (
          de[key](json[key])
            .mapError(DecodeError.nest(new ObjectKey(key as string), json[key])))
          .map((val: any) => assign(obj, { [key]: val }) as Val)
        ))
      ),
        Result.ok<DecodeError<AltErr>, Val>({} as Val)).mapError(
          DecodeError.nest<AltErr>(new TypedObject(n), json)
        )
  ));
}

/**
 * Creates an intersection between two decoders. Equivalent to TypeScript's `&` operator.
 *
 * Example:
 * ```
 * and(
 *   object({ foo: string }),
 *   object({ bar: string })
 * ) ==> object({ foo: string, bar: string })
 * ```
 */
export function and<ValA, ErrA, ValB, ErrB>(
  a: ComposedDecoder<ValA, ErrA>,
  b: ComposedDecoder<ValB, ErrB>,
): Decoder<ValA & ValB, ErrA | ErrB> {
  return spec(and, [a, b], (json: any): Result<DecodeError<ErrA | ErrB>, ValA & ValB> => (
    a(json)
      .chain(valA => b(json).map(valB => assign(valA, valB)))
      .mapError(DecodeError.nest<ErrA | ErrB>([], json))
  ));
}

/**
 * Decodes an arbitrary collection of key/value pairs. This is useful when
 * the structure or keys aren't known, and they'll be consumed or sanitized
 * by code that safely handles more permissive inputs.
 *
 * In the general case, `object` should be used instead.
 */
export function dict<Val, AltErr extends any>(valueDecoder: ComposedDecoder<Val, AltErr>) {
  return spec(dict, [valueDecoder], (json: any, [vd], opts: any) => (
    isDefined(json) && isDefined(json.constructor) && json.constructor === Object
      ? Object.keys(json).reduce((acc, key: string) => (
        acc.chain(obj => (
          (opts && opts.mapFn || identity)(vd(json[key]).mapError(DecodeError.nest(new ObjectKey(key), json[key])))
            .map((val: Val) => assign(obj, { [key]: val }))
        ))
      ), Result.ok<DecodeError, { [key: string]: Val }>({}))
      : Result.err<DecodeError, { [key: string]: Val }>(new DecodeError(Object, json))
  ));
}

/**
 * Allows using a decoder wrapped in a function. Useful for recursive data
 * structures.
 */
export const lazy = <Val, AltErr = never>(wrapped: () => ComposedDecoder<Val, AltErr>) => (json: any) => (
  wrapped()(json)
);

/**
 * Attempts to convert a raw JSON value to an enum type.
 */
export function toEnum<Enum>(name: string, enumVal: Enum) {
  return spec(toEnum, [name, enumVal], (val: any): Result<DecodeError, Enum[keyof Enum]> => {
    const key = Object.keys(enumVal)
      .find(key => enumVal[key as keyof Enum] === val) as keyof Enum | undefined;

    return Result.fromMaybe(new DecodeError(`Expected a value in enum \`${name}\``, val))(
      key
        ? Maybe.of<Enum>(enumVal[key] as any)
        : Maybe.emptyOf<Enum>()
    ) as unknown as Result<DecodeError, Enum[keyof Enum]>;
  });
}

/**
 * Asserts that a string or number is in a list. The list should be declared `as const`.
 * Useful for converting an arbitrary value to a union type.
 *
 * Example:
 *
 * ```
 * const union = ['one', 'two', 'three'] as const;
 * const toUnion = inList(union);
 *
 * // The union type can then be declared as follows:
 * type Union = typeof union[number];
 * // Equivalent to `type Union = 'one' | 'two' | 'three';`
 * ```
 */
export function inList<Union>(list: readonly Union[]) {
  return spec(inList, [list], (val: string | number): Result<DecodeError, Union> => (
    list.includes(val as any)
      ? Result.ok(val as unknown as Union)
      : Result.err(new DecodeError(`Expected one of [${list.join(', ')}]`, val))
  ));
}

/**
 * Makes the child members of a composed decoder (i.e. `object()`) nullable.
 */
export function partial<Val, AltErr>(decoder: Decoder<Val, AltErr>): Decoder<NullablePartial<Val> | null, AltErr> {
  const { ctor, args } = extract(decoder);

  switch (ctor as any) {
    case object:
      return object(
        args[0],
        Object.keys(args[1]).map(key => ({ [key]: nullable((args[1] as any)[key]) })).reduce(assign)
      ) as unknown as Decoder<NullablePartial<Val> | null, AltErr>;

    case dict:
      return dict(nullable(args[0] as any as ComposedDecoder<Val>)) as unknown as Decoder<NullablePartial<Val> | null, AltErr>;

    case array:
      return array(nullable(args[0] as any as ComposedDecoder<Val>)) as unknown as Decoder<NullablePartial<Val> | null, AltErr>;

    case and:
      return and(
        partial(args[0] as any as ComposedDecoder<Val>),
        partial(args[1] as any as ComposedDecoder<Val>)
      );

    default:
      return decoder;
  }
}

/**
 * Takes a composed decoder and returns one that, if decoding fails,
 * collects all failures, rather than breaking on the first one.
 */
export function all<Val, AltErr>(decoder: Decoder<Val, AltErr>): (json: any) => Result<DecodeError<AltErr>[], Val> {

  const wrap = <ValInner, AltErr>(hasParent: boolean, path: any[], errorFn: any, decoder: Decoder<ValInner, AltErr>): any => {
    const extracted = extract(decoder);
    const mapFn = (res: Result<DecodeError<AltErr>[], Val>) => (
      res.isError()
        ? errorFn(res.error()) && Result.ok(null as any)
        : res
    );

    switch ((extracted && extracted.ctor || decoder) as any) {
      case object:
        const [name, keys] = extracted.args;
        const newKeys = Object.keys(keys)
          .map((key: any) => ({ [key]: wrap(true, [], errorFn, (keys as any)[key]) as ComposedDecoder<Val, AltErr> }))
          .reduce(assign);

        return spec(object, [name, newKeys], extracted.def, {
          mapFn: (res: Result<DecodeError<AltErr>[], Val>) => (
            res.isError()
              ? errorFn(res.error()) && Result.ok({} as any)
              : res
          )
        }) as unknown as Decoder<ValInner, AltErr>;

      case dict:
        return spec(dict, [wrap(true, [], errorFn, extracted.args[0] as any)], extracted.def, { mapFn });

      case array:
        return spec(array, [wrap(true, [], errorFn, extracted.args[0] as any)], extracted.def, { mapFn });

      default:
        return (json: any) => {
          const decoded = decoder(json);

          return (!hasParent && decoded.isError())
            ? decoded.mapError(err => errorFn(new DecodeError(
              err.expected,
              err.val,
              err.key ? path : path.concat(err.key)
            ))) && Result.ok(null as any)
            : decoded;
        };
    }
  };

  return (json: any): Result<DecodeError<AltErr>[], Val> => {
    const errors: DecodeError<AltErr>[] = [];
    const res = wrap(false, [], errors.push.bind(errors), decoder)(json);
    return errors.length ? Result.err(errors) : res;
  };
}

/**
 * Wraps a function that accepts a value and returns a `Result`, so that it can be composed
 * with `Decoder` functions. Useful for functions that do type conversions that can fail, i.e.
 * string to `Date`.
 */
export const parse = <AltErr, Val, NewVal>(
  fn: (val: Val) => Result<DecodeError<AltErr> | AltErr, NewVal>
) => Result.chain(fn);
