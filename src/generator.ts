import { merge } from 'ramda';
import seedrandom from 'seedrandom';
import { string, array, number, object, extract, boolean, nullable, inList, Decoder } from './decoder';

const defaults: [any, (gen: SpecGenerator, ...args: any[]) => any][] = [
  [string, (gen) => (
    (new Array(Math.round(gen.rng.double() * 100))).fill('').map(
      () => String.fromCharCode(Math.round(gen.rng.double() * 250) + 32)
    ).join('')
  )],
  [number, (gen) => gen.rng.int32()],
  [boolean, (gen) => gen.rng.double() >= 0.5],
  [nullable, (gen, [spec]) => gen.rng.double() >= 0.5 ? null : gen.fromSpec(spec)],
  [array, (gen, [spec]) => new Array(Math.floor(gen.rng.double() * 10)).fill(null).map(() => gen.fromSpec(spec))],
  [object, (gen, [_, keys]) => Object.keys(keys).map(key => ({ [key]: gen.fromSpec(keys[key]) })).reduce(merge)],
  [inList, (gen, [list]) => list[Math.floor(gen.rng.double() * list.length)]],
];

export class SpecGenerator {

  public readonly rng!: { int32(): number, double(): number };
  public readonly specs!: Map<any, any>;

  constructor(opts: any = {}) {
    this.rng = new (seedrandom as any)(opts.seed);
    this.specs = new Map(opts.specs);
  }

  fromSpec(spec: any) {
    const def = extract(spec) as any;
    const gen = this.specs.get(def && def.ctor || spec);

    if (!gen) {
      throw new Error('No generator for spec ' + spec);
    }
    return gen(this, def && def.args || []);
  }

  fromList<Item>(list: Item[]): Item {
    return list[Math.floor(this.rng.double() * (list.length - 1))];
  }
}

/**
 * Builds a generator that can produce random data from a spec.
 */
export const generator = (opts: any = { specs: [], seed: seedrandom().int32() }) => (
  new SpecGenerator(merge(opts, { specs: defaults.concat(opts.specs || []) }))
);

/**
 * Alias a scalar decoder in order to pair it with a custom generator, i.e.:
 *
 * ```
 * const firstName = alias(string);
 *
 * generator({ specs: [[firstName, gen => gen.fromList(['Alice', 'Bob'])]] })
 * ```
 */
export const alias = <Val, Err>(decoder: Decoder<Val, Err>): Decoder<Val, Err> => (
  (json: any) => decoder(json)
);
