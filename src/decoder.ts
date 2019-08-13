import Result from './result';

const isDefined = (val: any) => val !== null && val !== undefined;

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
        ? decoder.decode(json).map(mapper!) as Result<DecodeError, Val>
        : isDefined(json)
          ? decoder.decode(json) as Result<DecodeError, Val>
          : Result.ok<DecodeError, Val>(null as unknown as Val)
  ));
}

export type DecoderObject<Val> = { [Key in keyof Val]: Decoder<Val[Key]> };

export class DecodeError {

  public expected!: Function | string;
  public val!: any;
  public key!: string | number | null;

  constructor(expected: Function | string, val: any, key: (string | number)[] | string | number | null = null) {
    Object.freeze(Object.assign(this, { expected, val, key }));
  }
}

const toDecodeResult = <Val>(worked: boolean, typeVal: Function | string, val: Val, key: string | number | null = null) => (
  worked
    ? Result.ok<DecodeError, Val>(val)
    : Result.err<DecodeError, Val>(new DecodeError(typeVal, val, key))
)

export default class Decoder<Val> {

  static string = new Decoder((json: any) => toDecodeResult<string>(typeof json === 'string', String, json));

  static number = new Decoder((json: any) => toDecodeResult<number>(typeof json === 'number', Number, json));

  static bool = new Decoder((json: any) => toDecodeResult<boolean>(typeof json === 'boolean', Boolean, json));

  static nullable = nullable;

  static array = <Val>(elementDecoder: Decoder<Val>) => new Decoder((json: any) => (
    Array.isArray(json)
      ? (json as any[]).reduce((prev: Result<DecodeError, Val[]>, current: any) => (
        elementDecoder
          .decode(current)
          .chain((decoded: Val) => prev.map((list: Val[]) => list.concat([decoded])) as Result<DecodeError, Val[]>)
      ), Result.ok<DecodeError, Val[]>([]))
      : Result.err<DecodeError, Val[]>(new DecodeError('array', json))
  ));

  static oneOf = <Val>(decoders: Decoder<Val>[]) => new Decoder<Val>((json: any) => (
    decoders.reduce((result, decoder) => (
      result.isError()
        ? decoder.decode(json)
        : result
    ), Result.err(new DecodeError(`OneOf[${decoders.length}]`, json))) as Result<DecodeError, Val>
  ));

  static object = <Val>(
    name: string,
    decoders: DecoderObject<Val>,
  ) => new Decoder<Val>((json: any) => (
    (json === null || typeof json !== 'object')
      ? Result.err(new DecodeError(Object, json, name))
      : (Object.keys(decoders) as Array<keyof Val>).reduce((acc, key) => {
        return acc.chain(obj => {
          return decoders[key].decode(json[key]).map(val => Object.assign(obj, { [key]: val }))
        });
      }, Result.ok({} as Val)) as Result<DecodeError, Val>
  ));

  constructor(private decodeFn: (json: any) => Result<DecodeError, Val>) { }

  public decode(val: any): Result<DecodeError, Val> {
    return this.decodeFn(val);
  }
}
