import Result from './result';
export declare function nullable<Val>(decoder: Decoder<Val>): Decoder<Val | null>;
export declare function nullable<Val>(decoder: Decoder<Val>, defaultVal: Val): Decoder<Val>;
export declare function nullable<Val, NewVal>(decoder: Decoder<NewVal>, defaultVal: Val, mapper: (a: NewVal) => Val): Decoder<Val>;
export declare type DecoderObject<Val, AltErr extends Error = never> = {
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
export declare class DecodeError {
    static nest<AltErr extends Error>(key: PathElement, val: any): (err: DecodeError | AltErr) => DecodeError;
    expected: Error | Function | string;
    val: any;
    key: PathElement[];
    constructor(expected: Error | Function | string, val: any, key?: PathElement | PathElement[] | null);
    /**
     * Allows 'nesting' of decode errors
     */
    nest(key: PathElement): DecodeError;
    private errMsg;
    toString(): string;
}
export declare type Decoder<Val, AltErr extends Error = never> = (json: any) => Result<DecodeError | AltErr, Val>;
export declare const string: Decoder<string>;
export declare const number: Decoder<number>;
export declare const bool: Decoder<boolean>;
export declare const array: <Val>(elementDecoder: Decoder<Val, never>) => (json: any) => Result<DecodeError, Val[]>;
export declare const oneOf: <Val>(decoders: Decoder<Val, never>[]) => Decoder<Val, never>;
export declare const object: <Val, AltErr extends Error>(name: string, decoders: DecoderObject<Val, AltErr>) => Decoder<Val, never>;
/**
 * Decodes an arbitrary collection of key/value pairs. This is useful when
 * the structure or keys aren't known, and they'll be handled or sanitized
 * by code that allows safely handles more permissive inputs.
 *
 * In the general case, `object` should be used instead.
 */
export declare const dict: <Val>(valueDecoder: Decoder<Val, never>) => (json: any) => Result<DecodeError, {
    [key: string]: Val;
}>;
export {};
//# sourceMappingURL=decoder.d.ts.map