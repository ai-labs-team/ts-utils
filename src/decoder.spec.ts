import { expect } from 'chai';
import 'mocha';

import Decoder from './decoder';
import Result from './result';

const { number, string, array, oneOf, bool, object } = Decoder

describe('Decoder', () => {

  describe('primitives', () => {
    it('decodes strings', () => {
      expect(string.decode('Hello')).to.deep.equal(Result.ok('Hello'));
    });
  });

  describe('array', () => {
    it('decodes int arrays', () => {
      expect(array(number).decode([1, 2, 3])).to.deep.equal(Result.ok([1, 2, 3]));
    });

    it('fails if an individual element fails', () => {
      expect(array(number).decode([1, 2, '3'])).to.deep.equal(Result.err('number'));
    });
  });

  describe('object', () => {
    const userDecoder = object('User', {
      email: string,
      person: object('Person', {
        firstName: string,
        lastName: string,
        age: number,
      })
    });

    it('decodes by key', () => {
      const user = {
        email: 'foo@bar',
        person: { firstName: 'Foo', lastName: 'Bar', age: 30 },
      };

      expect(userDecoder.decode(user)).to.deep.equal(Result.ok(user));
    });

    it('fails if any key fails', () => {
      const user = { person: { firstName: 'Foo', lastName: 'Bar', age: 30 } };
      expect(userDecoder.decode(user)).to.deep.equal(Result.err('string'));

      const user2 = { email: 'foo@bar', person: { firstName: 'Foo', lastName: 'Bar', age: '30' } };
      expect(userDecoder.decode(user2)).to.deep.equal(Result.err('number'));
    });
  });

  describe('nullability', () => { });

  describe('oneOf', () => {
    it('decodes if any decoder matches', () => {
      expect(oneOf<string | number>([string, number]).decode(1138)).to.deep.equal(Result.ok(1138));
      expect(oneOf<string | number>([string, number]).decode('1138')).to.deep.equal(Result.ok('1138'));
    });

    it('fails if all decoders fail', () => {
      expect(oneOf<boolean | number>([bool, number]).decode('1138')).to.deep.equal(Result.err('number'));
    });
  });
});
