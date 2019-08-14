import Result from './result';
export declare function nullable<Val>(decoder: Decoder<Val>): Decoder<Val | null>;
export declare function nullable<Val>(decoder: Decoder<Val>, defaultVal: Val): Decoder<Val>;
export declare function nullable<Val, NewVal>(decoder: Decoder<NewVal>, defaultVal: Val, mapper: (a: NewVal) => Val): Decoder<Val>;
export declare type DecoderObject<Val> = {
    [Key in keyof Val]: Decoder<Val[Key]>;
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
    static nest(key: PathElement): (err: DecodeError) => DecodeError;
    expected: Function | string;
    val: any;
    key: PathElement[];
    constructor(expected: Function | string, val: any, key?: PathElement | PathElement[] | null);
    nest(key: PathElement): DecodeError;
    toString(): string;
}
export default class Decoder<Val> {
    private decodeFn;
    static string: Decoder<string>;
    static number: Decoder<number>;
    static bool: Decoder<boolean>;
    static nullable: typeof nullable;
    static array: <Val_1>(elementDecoder: Decoder<Val_1>) => Decoder<Val_1[]>;
    static oneOf: <Val_1>(decoders: Decoder<Val_1>[]) => Decoder<Val_1>;
    static object: <Val_1>(name: string, decoders: DecoderObject<Val_1>) => Decoder<Val_1>;
    constructor(decodeFn: (json: any) => Result<DecodeError, Val>);
    decode(val: any): Result<DecodeError, Val>;
}
export {};
//# sourceMappingURL=decoder.d.ts.map