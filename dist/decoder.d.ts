import Result from './result';
declare type DecoderSpec<Val, Err, Args> = {
    ctor: Decoder<Val, Err> | typeof object;
    args: Args;
    def: any;
};
export declare function extract<Val, Err>(decoder: ReturnType<typeof object>): DecoderSpec<Val, Err, [string, DecoderObject<Val, Err>]>;
export declare function extract<Val, Err>(decoder: ReturnType<typeof dict>): DecoderSpec<Val, Err, [Decoder<Val, Err>]>;
export declare type Decoder<Val, AltErr = never> = (json: any) => Result<DecodeError<AltErr>, Val>;
export declare type ComposedDecoder<Val, AltErr = never> = (json: any) => Result<AltErr | DecodeError<AltErr>, Val>;
/**
 * Generate a type definition from a decoder, i.e.:
 * ```
 * type MyType = Decoded<typeof myDecoder>;
 * ```
 */
export declare type Decoded<Model, AltErr = never> = Model extends Decoder<infer Type, AltErr> ? Type : never;
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
    static nest<AltErr = never>(key: PathElement, val: any): (err: DecodeError<AltErr> | AltErr) => DecodeError<AltErr>;
    expected: Error | Function | string;
    val: any;
    key: PathElement[];
    constructor(expected: AltErr | Function | string, val: any, key?: PathElement | PathElement[] | null);
    /**
     * Allows 'nesting' of decode errors
     */
    nest(key: PathElement): DecodeError<AltErr>;
    get name(): string;
    get message(): string;
    private errMsg;
    toString(): string;
}
export declare const string: Decoder<string>;
export declare const number: Decoder<number>;
export declare const bool: Decoder<boolean>;
export declare const boolean: typeof bool;
/**
 * Wraps a decoder to let it be `null` or `undefined`. Optionally, you can specify a default
 * value and/or a mapping function that will apply to values if they are specified. This makes
 * it possible to, for example, convert a nullable value to a `Maybe`:
 *
 * ```
 * nullable(string, Maybe.emptyOf<string>(), Maybe.of)
 * ```
 */
export declare function nullable<Val, AltErr = never>(decoder: ComposedDecoder<Val, AltErr>): Decoder<Val | null | undefined, AltErr>;
export declare function nullable<Val, AltErr = never>(decoder: ComposedDecoder<Val, AltErr>, defaultVal: Val): Decoder<Val, AltErr>;
export declare function nullable<Val, NewVal, AltErr = never>(decoder: Decoder<NewVal, AltErr>, defaultVal: Val, mapper: (a: NewVal) => Val): Decoder<Val, AltErr>;
export declare function array<Val, AltErr = never>(elementDecoder: ComposedDecoder<Val>): Decoder<Val[], AltErr>;
/**
 * Tries each one of a list of decoders in order to find one that works, otherwise fails.
 */
export declare function oneOf<Val, AltErr = never>(decoders: ReadonlyArray<ComposedDecoder<Val, AltErr>>): Decoder<Val, string>;
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
export declare function object<Val, AltErr>(name: string, decoders: DecoderObject<Val, AltErr>): Decoder<Val, AltErr>;
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
export declare function and<ValA, ErrA, ValB, ErrB>(a: ComposedDecoder<ValA, ErrA>, b: ComposedDecoder<ValB, ErrB>): Decoder<ValA & ValB, ErrA | ErrB>;
/**
 * Decodes an arbitrary collection of key/value pairs. This is useful when
 * the structure or keys aren't known, and they'll be consumed or sanitized
 * by code that safely handles more permissive inputs.
 *
 * In the general case, `object` should be used instead.
 */
export declare function dict<Val, AltErr extends any>(valueDecoder: ComposedDecoder<Val, AltErr>): (val: any) => Result<DecodeError<never>, {
    [key: string]: Val;
}>;
/**
 * Allows using a decoder wrapped in a function. Useful for recursive data
 * structures.
 */
export declare const lazy: <Val, AltErr = never>(wrapped: () => ComposedDecoder<Val, AltErr>) => (json: any) => Result<AltErr | DecodeError<AltErr>, Val>;
/**
 * Attempts to convert a raw JSON value to an enum type.
 */
export declare function toEnum<Enum>(name: string, enumVal: Enum): (val: any) => Result<DecodeError<never>, Enum[keyof Enum]>;
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
export declare function inList<Union>(list: readonly Union[]): (val: any) => Result<DecodeError<never>, Union>;
/**
 * Makes the child members of a composed decoder (i.e. `object()`) nullable.
 */
export declare function partial<Val extends object, AltErr>(decoder: Decoder<Val, AltErr>): Decoder<Partial<Val>, AltErr>;
/**
 * Takes a composed decoder and returns one that, if decoding fails,
 * collects all failures, rather than breaking on the first one.
 */
export declare function all<Val, AltErr>(decoder: Decoder<Val, AltErr>): (json: any) => Result<DecodeError<AltErr>[], Val>;
/**
 * Wraps a function that accepts a value and returns a `Result`, so that it can be composed
 * with `Decoder` functions. Useful for functions that do type conversions that can fail, i.e.
 * string to `Date`.
 */
export declare const parse: <AltErr, Val, NewVal>(fn: (val: Val) => Result<AltErr | DecodeError<AltErr>, NewVal>) => (result: Result<AltErr | DecodeError<AltErr>, Val>) => Result<AltErr | DecodeError<AltErr>, NewVal>;
export {};
//# sourceMappingURL=decoder.d.ts.map