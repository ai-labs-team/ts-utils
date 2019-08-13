import { expect } from 'chai';
import 'mocha';

import Decoder, { DecodeError, Index, TypedObject, ObjectKey } from './decoder';
import Result from './result';
import Maybe from './maybe';

const { number, string, array, oneOf, bool, object, nullable } = Decoder

describe('Decoder', () => {

  describe('primitives', () => {
    it('decodes strings', () => {
      expect(string.decode('Hello')).to.deep.equal(Result.ok('Hello'));
    });

    it('fail on invalid', () => {
      expect(string.decode(123)).to.deep.equal(Result.err(new DecodeError(String, 123)));
    });
  });

  describe('array', () => {
    it('decodes int arrays', () => {
      expect(array(number).decode([1, 2, 3])).to.deep.equal(Result.ok([1, 2, 3]));
    });

    it('fails if an individual element fails', () => {
      expect(array(number).decode([1, 2, '3'])).to.deep.equal(Result.err(new DecodeError(Number, '3', new Index(2))));
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

      expect(userDecoder.decode(user)).to.deep.equal(Result.err(new DecodeError(String, undefined, [
        new TypedObject('User'),
        new ObjectKey('email')
      ])));
    });

    it('fails on nested key failure', () => {
      const user2 = { email: 'foo@bar', person: { firstName: 'Foo', lastName: 'Bar', age: '30' } };
      expect(userDecoder.decode(user2)).to.deep.equal(
        Result.err(new DecodeError(Number, '30', [
          new TypedObject('User'),
          new ObjectKey('person'),
          new TypedObject('Person'),
          new ObjectKey('age')
        ]))
      );
    });
  });

  describe('nullability', () => {
    it('decodes to type or null', () => {
      expect(nullable(string).decode(null)).to.deep.equal(Result.ok(null));
      expect(nullable(string).decode('Hello')).to.deep.equal(Result.ok('Hello'));
    });

    it('treats undefined as null', () => {
      expect(nullable(string).decode(undefined)).to.deep.equal(Result.ok(null));
    });

    it('fails if underlying decoder fails', () => {
      expect(nullable(string).decode(123)).to.deep.equal(Result.err(new DecodeError(String, 123)));
    });

    describe('with default', () => {
      it('returns if value is null', () => {
        expect(nullable(string, 'default!').decode(null)).to.deep.equal(Result.ok('default!'));
      });

      it('fails on non-null value of incorrect type', () => {
        expect(nullable(string, 'default!').decode(123)).to.deep.equal(Result.err(
          new DecodeError(String, 123)
        ));
      });
    });

    describe('with mapping function', () => {
      const decoder = nullable(string, Maybe.emptyOf<string>(), Maybe.of);

      it('maps success values', () => {
        expect(decoder.decode('hello')).to.deep.equal(Result.ok(Maybe.of('hello')));
      });

      it('ignores failed decodes', () => {
        expect(decoder.decode(null)).to.deep.equal(Result.ok(Maybe.empty));
      });
    });
  });

  describe('oneOf', () => {
    it('decodes if any decoder matches', () => {
      expect(oneOf<string | number>([string, number]).decode(1138)).to.deep.equal(Result.ok(1138));
      expect(oneOf<string | number>([string, number]).decode('1138')).to.deep.equal(Result.ok('1138'));
    });

    it('fails if all decoders fail', () => {
      expect(oneOf<boolean | number>([bool, number]).decode('1138')).to.deep.equal(
        Result.err(new DecodeError(Number, '1138'))
      );
    });
  });

  describe('errors', () => {
    const thingDecoder = object('Things', { things: array(object('Thing', { id: number })) });

    it('nest failure paths', () => {
      expect(thingDecoder.decode({ things: [{ id: 123 }, { id: 456 }, { id: 'bad' }] })).to.deep.equal(
        Result.err(new DecodeError(Number, 'bad', [
          new TypedObject('Things'),
          new ObjectKey('things'),
          new Index(2),
          new TypedObject('Thing'),
          new ObjectKey('id'),
        ]))
      );
    });
  });
});

describe('DecodeError', () => {
  describe('toString', () => {
    it('handles nested paths', () => {
      const err = new DecodeError(Number, 'bad', [
        new TypedObject('Things'),
        new ObjectKey('things'),
        new Index(2),
        new TypedObject('Thing'),
        new ObjectKey('id'),
      ]);

      expect(err.toString()).to.equal(
        'Decode Error: Expected Number, got `"bad"` in path Decoder.object(Things).things[2] > Decoder.object(Thing).id'
      );
    });
  });
})