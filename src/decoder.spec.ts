import { expect } from 'chai';
import 'mocha';

import {
  Decoder, DecodeError, Index, TypedObject, ObjectKey, number, string, array, oneOf, bool, object, nullable, dict, DecoderObject
} from './decoder';
import Result from './result';
import Maybe from './maybe';
import { pipe } from 'ramda';

describe('Decoder', () => {

  describe('primitives', () => {
    it('decodes strings', () => {
      expect(string('Hello')).to.deep.equal(Result.ok('Hello'));
    });

    it('fail on invalid', () => {
      expect(string(123)).to.deep.equal(Result.err(new DecodeError(String, 123)));
    });
  });

  describe('array', () => {
    it('decodes int arrays', () => {
      expect(array(number)([1, 2, 3])).to.deep.equal(Result.ok([1, 2, 3]));
    });

    it('fails if an individual element fails', () => {
      expect(array(number)([1, 2, '3'])).to.deep.equal(Result.err(new DecodeError(Number, '3', new Index(2))));
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

    const user = {
      email: 'foo@bar',
      person: { firstName: 'Foo', lastName: 'Bar', age: 30 },
    };

    it('decodes by key', () => {
      expect(userDecoder(user)).to.deep.equal(Result.ok(user));
    });

    it('enforces that the structure matches the type', () => {
      /**
       * Note: This isn't directly testable, since types are verified at runtime.
       */
      type User2 = {
        email: string;
        person: { firstName: string, lastName: string, age: number };
      };

      const user2Decoder = object<User2, Error>('User2', {
        email: string,
        person: object('Person', { firstName: string, lastName: string, age: number })
      });

      expect(user2Decoder(user)).to.deep.equal(Result.ok(user));
    });

    it('fails if any key fails', () => {
      const user2 = { person: { firstName: 'Foo', lastName: 'Bar', age: 30 } };

      expect(userDecoder(user2)).to.deep.equal(Result.err(new DecodeError(String, undefined, [
        new TypedObject('User'),
        new ObjectKey('email')
      ])));
    });

    it('fails on nested key failure', () => {
      const user2 = { email: 'foo@bar', person: { firstName: 'Foo', lastName: 'Bar', age: '30' } };
      expect(userDecoder(user2)).to.deep.equal(
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
      expect(nullable(string)(null)).to.deep.equal(Result.ok(null));
      expect(nullable(string)('Hello')).to.deep.equal(Result.ok('Hello'));
    });

    it('treats undefined as null', () => {
      expect(nullable(string)(undefined)).to.deep.equal(Result.ok(null));
    });

    it('fails if underlying decoder fails', () => {
      expect(nullable(string)(123)).to.deep.equal(Result.err(new DecodeError(String, 123)));
    });

    describe('with default', () => {
      it('returns if value is null', () => {
        expect(nullable(string, 'default!')(null)).to.deep.equal(Result.ok('default!'));
      });

      it('fails on non-null value of incorrect type', () => {
        expect(nullable(string, 'default!')(123)).to.deep.equal(Result.err(
          new DecodeError(String, 123)
        ));
      });
    });

    describe('with mapping function', () => {
      const decoder = nullable(string, Maybe.emptyOf<string>(), Maybe.of);

      it('maps success values', () => {
        expect(decoder('hello')).to.deep.equal(Result.ok(Maybe.of('hello')));
      });

      it('ignores failed decodes', () => {
        expect(decoder(null)).to.deep.equal(Result.ok(Maybe.empty));
      });
    });
  });

  describe('oneOf', () => {
    it('decodes if any decoder matches', () => {
      expect(oneOf<string | number>([string, number])(1138)).to.deep.equal(Result.ok(1138));
      expect(oneOf<string | number>([string, number])('1138')).to.deep.equal(Result.ok('1138'));
    });

    it('fails if all decoders fail', () => {
      expect(oneOf<boolean | number>([bool, number])('1138')).to.deep.equal(
        Result.err(new DecodeError(Number, '1138'))
      );
    });
  });

  describe('dict', () => {
    it('decodes arbitrary key/value pairs', () => {
      expect(dict(bool)({ foo: true, bar: false })).to.deep.equal(Result.ok({ foo: true, bar: false }));

      expect(dict(bool)({ foo: true, bar: 1 }).error()!.toString()).to.equal(
        'Decode Error: Expected Boolean, got `1` in path .bar'
      );

      expect(dict(oneOf<string | number>([string, number]))({ one: '1', two: 2 })).to.deep.equal(
        Result.ok({ one: '1', two: 2 })
      );

      expect(dict(oneOf<string | number>([string, number]))({ one: '1', two: false }).error()!.toString()).to.equal(
        'Decode Error: Expected Number, got `false` in path .two'
      );
    });
  });

  describe('errors', () => {
    const thingDecoder = object('Things', { things: array(object('Thing', { id: number })) });

    it('nest failure paths', () => {
      expect(thingDecoder({ things: [{ id: 123 }, { id: 456 }, { id: 'bad' }] })).to.deep.equal(
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

  describe('composition', () => {
    it('composes with other functions', () => {
      const isUrl = (val: string) => new URL(val) && val;
      const url = 'https://google.com/foo?bar';

      const thingDecoder = object('Thing', {
        url: pipe(string, Result.chain<DecodeError<never>, string, Error, string>(Result.attempt(isUrl))) as Decoder<string, DecodeError<Error>>
      });

      expect(thingDecoder({ url }).value()).to.deep.equal({ url });

      expect(thingDecoder({ url: '/' }).error()!.toString()).to.equal(
        'Decode Error: [TypeError [ERR_INVALID_URL]]: Invalid URL: / in path Decoder.object(Thing).url'
      );
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
  });

});
