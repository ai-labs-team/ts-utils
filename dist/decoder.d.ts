import Result from './result';
/**
 * Generate a type definition from a decoder, i.e.:
 * ```
 * type MyType = Decoded<typeof myDecoder>;
 * ```
 */
export declare type Decoded<Model, AltErr = never> = Model extends Decoder<infer Type, AltErr> ? Type : never;
export declare function nullable<Val>(decoder: Decoder<Val, never>): Decoder<Val | null, never>;
export declare function nullable<Val>(decoder: Decoder<Val, never>, defaultVal: Val): Decoder<Val, never>;
export declare function nullable<Val, NewVal>(decoder: Decoder<NewVal, never>, defaultVal: Val, mapper: (a: NewVal) => Val): Decoder<Val, never>;
export declare type DecoderObject<Val, AltErr extends any> = {
    [Key in keyof Val]: Decoder<Val[Key], AltErr>;
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
export declare type Decoder<Val, AltErr = never> = (json: any) => Result<DecodeError<AltErr>, Val>;
export declare const string: Decoder<string>;
export declare const number: Decoder<number>;
export declare const bool: Decoder<boolean>;
export declare const array: <Val>(elementDecoder: Decoder<Val, never>) => (json: any) => Result<DecodeError<never>, Val[]>;
export declare const oneOf: <Val>(decoders: Decoder<Val, never>[]) => Decoder<Val, never>;
export declare const object: <Val, AltErr>(name: string, decoders: DecoderObject<Val, AltErr>) => Decoder<Val, AltErr>;
/**
 * Decodes an arbitrary collection of key/value pairs. This is useful when
 * the structure or keys aren't known, and they'll be handled or sanitized
 * by code that allows safely handles more permissive inputs.
 *
 * In the general case, `object` should be used instead.
 */
export declare const dict: <Val>(valueDecoder: Decoder<Val, never>) => (json: any) => Result<DecodeError<never>, {
    [key: string]: Val;
}>;
export {};
//# sourceMappingURL=decoder.d.ts.map