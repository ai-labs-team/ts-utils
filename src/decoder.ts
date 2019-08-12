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
      ? Result.ok(defaultVal! as Val)
      : (isDefined(json) && isDefined(mapper))
        ? decoder.decode(json).map(mapper!)
        : isDefined(json)
          ? decoder.decode(json)
          : Result.ok(null)
  ));
}

export type DecoderObject<Val> = { [Key in keyof Val]: Decoder<Val[Key]> };

export class DecodeError { }

export default class Decoder<Val> {

  static string = new Decoder((json: any) => (
    typeof json === 'string' ? Result.ok<DecodeError, string>(json) : Result.err<DecodeError, string>('string')
  ));

  static number = new Decoder((json: any) => (
    typeof json === 'number' ? Result.ok<DecodeError, number>(json) : Result.err<DecodeError, number>('number')
  ));

  static bool = new Decoder((json: any) => (
    typeof json === 'boolean' ? Result.ok<DecodeError, boolean>(json) : Result.err<DecodeError, boolean>('boolean')
  ));

  static nullable = nullable;

  static array = <Val>(elementDecoder: Decoder<Val>) => new Decoder((json: any) => (
    Array.isArray(json)
      ? (json as any[]).reduce((prev: Result<DecodeError, Val[]>, current) => (
        elementDecoder
          .decode(current)
          .chain(decoded => prev.map(list => list.concat([decoded])))
      ), Result.ok<DecodeError, Val[]>([]))
      : Result.err<DecodeError, Val[]>('array')
  ));

  static oneOf = <Val>(decoders: Decoder<Val>[]) => new Decoder<Val>((json: any) => (
    decoders.reduce((result, decoder) => (
      result.isError()
        ? decoder.decode(json)
        : result
    ), Result.err(new DecodeError(/* 'All decoders failed' */))) as Result<DecodeError, Val>
  ));

  static object = <Val>(
    name: string,
    decoders: DecoderObject<Val>,
  ) => new Decoder<Val>((json: any) => (
    (json === null || typeof json !== 'object')
      ? Result.err(`object of type ${name}`)
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
