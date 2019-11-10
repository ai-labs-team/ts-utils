import Result from './result';
export declare type Decoder<Val, AltErr = never> = (json: any) => Result<DecodeError<AltErr>, Val>;
export declare type ComposedDecoder<Val, AltErr = never> = (json: any) => Result<AltErr | DecodeError<AltErr>, Val>;
/**
 * Generate a type definition from a decoder, i.e.:
 * ```
 * type MyType = Decoded<typeof myDecoder>;
 * ```
 */
export declare type Decoded<Model, AltErr = never> = Model extends Decoder<infer Type, AltErr> ? Type : never;
/**
 * Wraps a function that accepts a value and returns a `Result`, so that it can be composed
 * with `Decoder` functions. Useful for functions that do type conversions that can fail, i.e.
 * string to `Date`.
 */
export declare const parse: <AltErr, Val, NewVal>(fn: (val: Val) => Result<AltErr | DecodeError<AltErr>, NewVal>) => (result: Result<AltErr | DecodeError<AltErr>, Val>) => Result<AltErr | DecodeError<AltErr>, NewVal>;
/**
 * Wraps a decoder to let it be `null` or unspecified. Optionally, you can specify a default
 * value and/or a mapping function that will apply to values if they are specified. This makes
 * it possible to, for example, convert a nullable value to a `Maybe`:
 *
 * ```
 * nullable(string, Maybe.emptyOf<string>(), Maybe.of)
 * ```
 */
export declare function nullable<Val, AltErr = never>(decoder: ComposedDecoder<Val, AltErr>): Decoder<Val | null, AltErr>;
export declare function nullable<Val, AltErr = never>(decoder: ComposedDecoder<Val, AltErr>, defaultVal: Val): Decoder<Val, AltErr>;
export declare function nullable<Val, NewVal, AltErr = never>(decoder: Decoder<NewVal, AltErr>, defaultVal: Val, mapper: (a: NewVal) => Val): Decoder<Val, AltErr>;
export declare type DecoderObject<Val, AltErr extends any> = {
    [Key in keyof Val]: ComposedDecoder<Val[Key], AltErr>;
};
declare type PathElement = TypedObject | Index | ObjectKey | Array<any>;
export declare class Index {
    index: number;
    type: string;
    constructor(index: number);
    toString(): string;
}
export declare class ObjectKey {
    name: string;
    type: string;
    constructor(name: string);
    toString(): string;
}
export declare class TypedObject {
    name: string;
    type: string;
    constructor(name: string);
    toString(): string;
}
/**
 * Represents a failed decode operation.
 */
export declare class DecodeError<AltErr = never> {
    static nest<AltErr = never>(key: PathElement, val: any): (err: AltErr | DecodeError<AltErr>) => DecodeError<AltErr>;
    expected: Error | Function | string;
    val: any;
    key: PathElement[];
    constructor(expected: AltErr | Function | string, val: any, key?: PathElement | PathElement[] | null);
    /**
     * Allows 'nesting' of decode errors
     */
    nest(key: PathElement): DecodeError<AltErr>;
    private errMsg;
    toString(): string;
}
export declare const string: Decoder<string>;
export declare const number: Decoder<number>;
export declare const bool: Decoder<boolean>;
export declare const boolean: typeof bool;
export declare const array: <Val>(elementDecoder: ComposedDecoder<Val, never>) => (json: any) => Result<DecodeError<never>, Val[]>;
/**
 * Tries each one of a list of decoders in order to find one that works, otherwise fails.
 */
export declare const oneOf: <Val, AltErr = never>(decoders: ComposedDecoder<Val, AltErr>[]) => Decoder<Val, string>;
export declare const object: <Val, AltErr>(name: string, decoders: DecoderObject<Val, AltErr>) => Decoder<Val, AltErr>;
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
export declare const and: <ValA, ErrA, ValB, ErrB>(a: ComposedDecoder<ValA, ErrA>, b: ComposedDecoder<ValB, ErrB>) => (json: any) => Result<DecodeError<ErrA | ErrB>, ValA & ValB>;
/**
 * Decodes an arbitrary collection of key/value pairs. This is useful when
 * the structure or keys aren't known, and they'll be consumed or sanitized
 * by code that safely handles more permissive inputs.
 *
 * In the general case, `object` should be used instead.
 */
export declare const dict: <Val, AltErr extends any>(valueDecoder: ComposedDecoder<Val, AltErr>) => (json: any) => Result<DecodeError<never>, {
    [key: string]: Val;
}>;
/**
 * Attempts to convert a raw JSON value to an enum type.
 */
export declare const toEnum: <Enum>(name: string, enumVal: Enum) => (val: any) => Result<DecodeError<never>, Enum[keyof Enum]>;
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
export declare const inList: <Union>(list: readonly Union[]) => (val: string | number) => Result<DecodeError<never>, Union>;
export {};
//# sourceMappingURL=decoder.d.ts.map