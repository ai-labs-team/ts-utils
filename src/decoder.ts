import Result from './result';
import { Decoder } from '.';

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

const toArray = (val: any) => (
  Array.isArray(val)
    ? val
    : isDefined(val)
      ? [val]
      : []
);

/**
 * Generate a type definition from a decoder, i.e.:
 * ```
 * type MyType = Decoded<typeof myDecoder>;
 * ```
 */
export type Decoded<Model, AltErr extends Error = never> = Model extends Decoder<infer Type, AltErr>
  ? Type
  : never;


export function nullable<Val>(decoder: Decoder<Val, never>): Decoder<Val | null, never>;
export function nullable<Val>(decoder: Decoder<Val, never>, defaultVal: Val): Decoder<Val, never>;
export function nullable<Val, NewVal>(
  decoder: Decoder<NewVal, never>,
  defaultVal: Val,
  mapper: (a: NewVal) => Val
): Decoder<Val, never>;
export function nullable<Val>(
  decoder: Decoder<Val, never>,
  defaultVal?: Val,
  mapper?: (a: Val) => Val,
): Decoder<Val | null, never> {
  return (json: any) => (
    (!isDefined(json) && isDefined(defaultVal))
      ? Result.ok<DecodeError, Val>(defaultVal! as Val)
      : (isDefined(json) && isDefined(mapper))
        ? decoder(json).map(mapper!)
        : isDefined(json)
          ? decoder(json)
          : Result.ok<DecodeError, Val | null>(null)
  );
}

export type DecoderObject<Val, AltErr extends Error> = { [Key in keyof Val]: Decoder<Val[Key], AltErr> };

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

export class DecodeError extends Error {

  public static nest<AltErr extends Error>(key: PathElement, val: any) {
    return (err: DecodeError | AltErr) => (err instanceof DecodeError ? err : new DecodeError(err, val)).nest(key);
  }

  public expected!: Error | Function | string;
  public val!: any;
  public key!: PathElement[];

  constructor(expected: Error | Function | string, val: any, key: PathElement | PathElement[] | null = null) {
    super(expected.toString());
    Object.freeze(Object.assign(this, { expected, val, key: toArray(key) }));
  }

  /**
   * Allows 'nesting' of decode errors 
   */
  nest(key: PathElement): DecodeError {
    return new DecodeError(this.expected, this.val, [key].concat(this.key));
  }

  private errMsg(): string {
    return (this.expected instanceof Error)
      ? `[${this.expected.name}]: ${this.expected.message}`
      : `Expected ${((this.expected as Function).name || this.expected)}, got \`${JSON.stringify(this.val)}\``;
  }

  toString() {
    return [
      'Decode Error: ',
      this.errMsg(),
      this.key.length
        ? ` in path ${this.key.map(k => k.toString()).join('').replace(/^\s*>\s+/, '')}`
        : ''
    ].join('');
  }
}

const toDecodeResult = <Val>(worked: boolean, typeVal: Function | string, val: Val, key: PathElement | null = null) => (
  worked
    ? Result.ok<DecodeError, Val>(val)
    : Result.err<DecodeError, Val>(new DecodeError(typeVal, val, key))
);

export type Decoder<Val, AltErr extends Error> = (json: any) => Result<DecodeError | AltErr, Val>;

export const string: Decoder<string, never> = (json: any) => toDecodeResult<string>(typeof json === 'string', String, json);
export const number: Decoder<number, never> = (json: any) => toDecodeResult<number>(typeof json === 'number', Number, json);
export const bool: Decoder<boolean, never> = (json: any) => toDecodeResult<boolean>(typeof json === 'boolean', Boolean, json);

export const array = <Val>(elementDecoder: Decoder<Val, never>) => (json: any) => (
  Array.isArray(json)
    ? (json as any[]).reduce((prev: Result<DecodeError, Val[]>, current: any, index: number) => (
      elementDecoder(current)
        .mapError(DecodeError.nest(new Index(index), current))
        .chain((decoded: Val) => prev.map((list: Val[]) => list.concat([decoded])))
    ), Result.ok<DecodeError, Val[]>([]))
    : Result.err<DecodeError, Val[]>(new DecodeError(Array, json))
);

export const oneOf = <Val>(decoders: Array<Decoder<Val, never>>): Decoder<Val, never> => (json: any) => (
  decoders.reduce(
    (result, decoder) => (result.isError() ? decoder(json) : result),
    Result.err(new DecodeError(`[OneOf ${decoders.length}]`, json))
  ) as Result<DecodeError, Val>
);

export const object = <Val, AltErr extends Error>(
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
    ), Result.ok<DecodeError | AltErr, Val>({} as Val)).mapError(DecodeError.nest(new TypedObject(name), json))
);

/**
 * Decodes an arbitrary collection of key/value pairs. This is useful when
 * the structure or keys aren't known, and they'll be handled or sanitized
 * by code that allows safely handles more permissive inputs.
 *
 * In the general case, `object` should be used instead.
 */
export const dict = <Val>(valueDecoder: Decoder<Val, never>) => (json: any) => (
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
