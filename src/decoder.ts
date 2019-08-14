import Result from './result';

const isDefined = (val: any) => val !== null && val !== undefined;

const toArray = (val: any) => (
  Array.isArray(val)
    ? val
    : isDefined(val)
      ? [val]
      : []
);

export function nullable<Val>(decoder: Decoder<Val>): Decoder<Val | null>;
export function nullable<Val>(decoder: Decoder<Val>, defaultVal: Val): Decoder<Val>;
export function nullable<Val, NewVal>(
  decoder: Decoder<NewVal>,
  defaultVal: Val,
  mapper: (a: NewVal) => Val
): Decoder<Val>;
export function nullable<Val>(
  decoder: Decoder<Val>,
  defaultVal?: Val,
  mapper?: (a: Val) => Val,
): Decoder<Val | null> {
  return new Decoder((json: any) => (
    (!isDefined(json) && isDefined(defaultVal))
      ? Result.ok<DecodeError, Val>(defaultVal! as Val)
      : (isDefined(json) && isDefined(mapper))
        ? decoder.decode(json).map(mapper!)
        : isDefined(json)
          ? decoder.decode(json)
          : Result.ok<DecodeError, Val | null>(null)
  ));
}

export type DecoderObject<Val> = { [Key in keyof Val]: Decoder<Val[Key]> };

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

export class DecodeError {

  public static nest(key: PathElement) {
    return (err: DecodeError) => err.nest(key);
  }

  public expected!: Function | string;
  public val!: any;
  public key!: PathElement[];

  constructor(expected: Function | string, val: any, key: PathElement | PathElement[] | null = null) {
    Object.freeze(Object.assign(this, { expected, val, key: toArray(key) }));
  }

  nest(key: PathElement): DecodeError {
    return new DecodeError(this.expected, this.val, [key].concat(this.key));
  }

  toString() {
    return [
      'Decode Error: Expected ',
      ((this.expected as Function).name || this.expected),
      ', got',
      (' `' + JSON.stringify(this.val) + '` '),
      this.key.length
        ? `in path ${this.key.map(k => k.toString()).join('').replace(/^\s*>\s+/, '')}`
        : ''
    ].join('');
  }
}

const toDecodeResult = <Val>(worked: boolean, typeVal: Function | string, val: Val, key: PathElement | null = null) => (
  worked
    ? Result.ok<DecodeError, Val>(val)
    : Result.err<DecodeError, Val>(new DecodeError(typeVal, val, key))
);

export default class Decoder<Val> {

  public static string = new Decoder((json: any) => toDecodeResult<string>(typeof json === 'string', String, json));
  public static number = new Decoder((json: any) => toDecodeResult<number>(typeof json === 'number', Number, json));
  public static bool = new Decoder((json: any) => toDecodeResult<boolean>(typeof json === 'boolean', Boolean, json));
  public static nullable = nullable;

  public static array = <Val>(elementDecoder: Decoder<Val>) => new Decoder((json: any) => (
    Array.isArray(json)
      ? (json as any[]).reduce((prev: Result<DecodeError, Val[]>, current: any, index: number) => (
        elementDecoder
          .decode(current)
          .mapError(DecodeError.nest(new Index(index)))
          .chain((decoded: Val) => prev.map((list: Val[]) => list.concat([decoded])))
      ), Result.ok<DecodeError, Val[]>([]))
      : Result.err<DecodeError, Val[]>(new DecodeError(Array, json))
  ));

  public static oneOf = <Val>(decoders: Decoder<Val>[]) => new Decoder<Val>((json: any) => (
    decoders.reduce((result, decoder) => (
      result.isError()
        ? decoder.decode(json)
        : result
    ), Result.err(new DecodeError(`[OneOf ${decoders.length}]`, json))) as Result<DecodeError, Val>
  ));

  public static object = <Val>(
    name: string,
    decoders: DecoderObject<Val>,
  ) => new Decoder<Val>((json: any) => (
    (json === null || typeof json !== 'object')
      ? Result.err(new DecodeError(Object, json, new TypedObject(name)))
      : (Object.keys(decoders) as Array<keyof Val>).reduce((acc, key) => (
        acc.chain(obj => (
          decoders[key]
            .decode(json[key])
            .mapError(DecodeError.nest(new ObjectKey(key as string)))
            .map(val => Object.assign(obj, { [key]: val }) as Val)
        ))
      ), Result.ok<DecodeError, Val>({} as Val)).mapError(DecodeError.nest(new TypedObject(name)))
  ));

  public static decode<Val>(decoder: Decoder<Val>): (val: any) => Result<DecodeError, Val> {
    return (val: any) => decoder.decode(val);
  }

  constructor(private decodeFn: (json: any) => Result<DecodeError, Val>) { }

  public decode(val: any): Result<DecodeError, Val> {
    return this.decodeFn(val);
  }
}
