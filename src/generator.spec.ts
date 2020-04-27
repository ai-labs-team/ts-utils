import { expect } from 'chai';
import 'mocha';

import { object, string, array, number, inList } from "./decoder";
import { alias, generator, SpecGenerator } from './generator';

describe('Generator', () => {

  describe('fromSpec', () => {

    describe('scalars', () => {

      it('generates integer values', () => {
        expect(generator().fromSpec(number)).to.be.a('number');
      });

      it('generates string values', () => {
        expect(generator().fromSpec(string)).to.be.a('string');
      });
    });
  });
});

// const names = ['Jim', 'Bob', 'Dave', 'Mike', 'Scott'];
// const firstName = alias(string);

// const test = object('Test', {
//   foo: firstName,
//   bar: array(number),
//   item: inList(['foo', 'bar', 'baz'])
// });

// console.log(generator({
//   specs: [
//     [firstName, (gen: SpecGenerator) => gen.fromList(names)]
//   ]
// }).fromSpec(test));
