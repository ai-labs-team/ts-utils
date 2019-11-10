import Result from './result';
import Maybe from './maybe';

const defTag = Symbol.for('@ts-utils/decoder/def');

const tag = <Fn extends (...args: any[]) => any>(ctor: any, val: any, fn: Fn): typeof fn => (
  Object.assign(fn, { [defTag]: [ctor, val] })
);

const def = <Val>(
  fn: Decoder<any, never> & { [defTag]: Decoder<Val, never> }
): Decoder<Val, never> | null => (
  fn[defTag] || null
);

const isDefined = (val: any) => val !== null && val !== undefined;
const toArray = (val: any) => Array.isArray(val) ? val : isDefined(val) ? [val] : [];

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

/**
 * Wraps a function that accepts a value and returns a `Result`, so that it can be composed
 * with `Decoder` functions. Useful for functions that do type conversions that can fail, i.e.
 * string to `Date`.
 */
export const parse = <AltErr, Val, NewVal>(
  fn: (val: Val) => Result<DecodeError<AltErr> | AltErr, NewVal>
) => Result.chain(fn);

/**
 * Wraps a decoder to let it be `null` or unspecified. Optionally, you can specify a default
 * value and/or a mapping function that will apply to values if they are specified. This makes
 * it possible to, for example, convert a nullable value to a `Maybe`:
 *
 * ```
 * nullable(string, Maybe.emptyOf<string>(), Maybe.of)
 * ```
 */
export function nullable<Val, AltErr = never>(decoder: ComposedDecoder<Val, AltErr>): Decoder<Val | null, AltErr>;
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
): ComposedDecoder<Val | null, AltErr> {
  return (json: any) => (
    (!isDefined(json) && isDefined(defaultVal))
      ? Result.ok<DecodeError<AltErr> | AltErr, Val>(defaultVal! as Val)
      : (isDefined(json) && isDefined(mapper))
        ? decoder(json).map(mapper!)
        : isDefined(json)
          ? decoder(json)
          : Result.ok<DecodeError<AltErr> | AltErr, Val | null>(null)
  );
}

export type DecoderObject<Val, AltErr extends any> = {
  [Key in keyof Val]: ComposedDecoder<Val[Key], AltErr>
};

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
    Object.freeze(Object.assign(this, { expected, val, key: toArray(key) }));
  }

  /**
   * Allows 'nesting' of decode errors 
   */
  nest(key: PathElement): DecodeError<AltErr> {
    return new DecodeError(this.expected, this.val, toArray(key).concat(this.key));
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

export const array = <Val>(elementDecoder: ComposedDecoder<Val>) => (json: any) => (
  Array.isArray(json)
    ? (json as any[]).reduce((prev: Result<DecodeError, Val[]>, current: any, index: number) => (
      elementDecoder(current)
        .mapError(DecodeError.nest(new Index(index), current))
        .chain((decoded: Val) => prev.map((list: Val[]) => list.concat([decoded])))
    ), Result.ok<DecodeError, Val[]>([]))
    : Result.err<DecodeError, Val[]>(new DecodeError(Array, json))
);

/**
 * Tries each one of a list of decoders in order to find one that works, otherwise fails.
 */
export const oneOf = <Val, AltErr = never>(decoders: Array<ComposedDecoder<Val, AltErr>>): Decoder<Val, string> => (json: any) => (
  decoders.reduce(
    (result, decoder) => (result.isError() ? decoder(json) : result as Result<any, Val>),
    Result.err(new DecodeError(`[OneOf ${decoders.length}]`, json))
  ) as Result<DecodeError<AltErr>, Val>
);

export const object = <Val, AltErr>(
  name: string,
  decoders: DecoderObject<Val, AltErr>,
): Decoder<Val, AltErr> => (json: any) => (
  (json === null || typeof json !== 'object')
    ? Result.err(new DecodeError(Object, json, new TypedObject(name)))
    : (Object.keys(decoders) as Array<keyof Val>).reduce((acc, key) => (
      acc.chain(obj => (
        decoders[key](json[key])
          .mapError(DecodeError.nest(new ObjectKey(key as string), json[key]))
          .map((val: any) => Object.assign(obj, { [key]: val }) as Val)
      ))
    ),
    Result.ok<DecodeError | AltErr, Val>({} as Val)).mapError(
      DecodeError.nest<AltErr>(new TypedObject(name), json)
    )
);

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
export const and = <ValA, ErrA, ValB, ErrB>(
  a: ComposedDecoder<ValA, ErrA>,
  b: ComposedDecoder<ValB, ErrB>,
) => (json: any): Result<DecodeError<ErrA | ErrB>, ValA & ValB> => (
  a(json)
    .chain(valA => b(json).map(valB => Object.assign(valA, valB)))
    .mapError(DecodeError.nest<ErrA | ErrB>([], json))
);

/**
 * Decodes an arbitrary collection of key/value pairs. This is useful when
 * the structure or keys aren't known, and they'll be consumed or sanitized
 * by code that safely handles more permissive inputs.
 *
 * In the general case, `object` should be used instead.
 */
export const dict = <Val, AltErr extends any>(valueDecoder: ComposedDecoder<Val, AltErr>) => (json: any) => (
  isDefined(json) && isDefined(json.constructor) && json.constructor === Object
    ? Object.keys(json).reduce((acc, key: string) => (
      acc.chain(obj => (
        valueDecoder(json[key])
          .mapError(DecodeError.nest(new ObjectKey(key as string), json[key]))
          .map((val: Val) => Object.assign(obj, { [key]: val }))
      ))
    ), Result.ok<DecodeError, { [key: string]: Val }>({}))
    : Result.err<DecodeError, { [key: string]: Val }>(new DecodeError(Object, json))
);

/**
 * Attempts to convert a raw JSON value to an enum type.
 */
export const toEnum = <Enum>(name: string, enumVal: Enum) => (
  (val: any): Result<DecodeError, Enum[keyof Enum]> => {
    const key = Object.keys(enumVal)
        .find(key => enumVal[key as keyof Enum] === val) as keyof Enum | undefined;

    return Result.fromMaybe(
      new DecodeError(`Expected a value in enum \`${name}\``, val)
    )(
      key
        ? Maybe.of<Enum>(enumVal[key] as any)
        : Maybe.emptyOf<Enum>()
    ) as unknown as Result<DecodeError, Enum[keyof Enum]>;
  }
);

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
export const inList = <Union>(list: readonly Union[]) => (val: string | number): Result<DecodeError, Union> => (
  list.includes(val as any)
    ? Result.ok(val as unknown as Union)
    : Result.err(new DecodeError(`Expected one of [${list.join(', ')}]`, val))
);
