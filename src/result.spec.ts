import { expect, assert } from 'chai';
import { identity } from 'ramda';
import 'mocha';

import Result from './result';
import Maybe from './maybe';

describe('Result', () => {

  describe('mapError', () => {
    it('Maps the error value', () => {
      expect(Result.mapError(() => 'Mapped')(Result.err('Bad'))).to.deep.equal(Result.err('Mapped'));
      expect(Result.mapError(() => 'Mapped')(Result.ok('Good'))).to.deep.equal(Result.ok('Good'));
    });
  });

  describe('fold', () => {
    it('unifies result and error values', () => {
      const toStr = (val: any) => Number.prototype.toString.call(val);
      expect(Result.ok<number, string>('Hello').fold(toStr, identity)).to.equal('Hello');
      expect(Result.err<number, string>(3).fold(toStr, identity)).to.equal('3');
    });
  });

  describe('toPromise', () => {
    it('Resolves promise when result has no error', () => {
      Result.toPromise(Result.ok('Good'))
        .then(result => expect(result).to.equal('Good'))
        .catch(() => assert(false, 'Promise rejected when Result had no error'))
    });

    it('Rejects promise when result errors', () => {
      Result.toPromise(Result.err('Bad'))
        .then(() => assert(false, 'Result error promise did not reject'))
        .catch(err => expect(err).to.equal('Bad'));
    });
  });

  describe('fromMaybe', () => {
    it('Adds an error to an empty value', () => {
      const err = new Error('Badness')
      expect(Result.fromMaybe('Badness')(Maybe.of('Hello'))).to.deep.equal(Result.ok('Hello'));
      expect(Result.fromMaybe(err)(Maybe.empty)).to.deep.equal(Result.err(err));
    });
  });

  describe('chain', () => {
    it('unwraps results', () => {
      expect(Result.ok(5).chain(val => Result.ok(val * 2))).to.deep.equal(Result.ok(10));
    });

    it('propagates errors', () => {
      expect(Result.err<string, number>('Badness').chain(val => Result.ok(val * 2))).to.deep.equal(
        Result.err('Badness')
      );
    });
  });
});

