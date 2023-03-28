import { Decoder } from './decoder';
export declare class SpecGenerator {
    readonly rng: {
        int32(): number;
        double(): number;
    };
    readonly specs: Map<any, any>;
    constructor(opts?: any);
    fromSpec(spec: any): any;
    fromList<Item>(list: Item[]): Item;
}
/**
 * Builds a generator that can produce random data from a spec.
 */
export declare const generator: (opts?: any) => SpecGenerator;
/**
 * Alias a scalar decoder in order to pair it with a custom generator, i.e.:
 *
 * ```
 * const firstName = alias(string);
 *
 * generator({ specs: [[firstName, gen => gen.fromList(['Alice', 'Bob'])]] })
 * ```
 */
export declare const alias: <Val, Err>(decoder: Decoder<Val, Err>) => Decoder<Val, Err>;
//# sourceMappingURL=generator.d.ts.map