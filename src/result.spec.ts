import { expect } from 'chai';
import { identity } from 'ramda';
import 'mocha';

import Result from './result';
import Maybe from './maybe';

describe('Result', () => {

  describe('fold', () => {
    it('unifies result and error values', () => {
      const toStr = (val: any) => Number.prototype.toString.call(val);
      expect(Result.ok<number, string>('Hello').fold(toStr, identity)).to.equal('Hello');
      expect(Result.err<number, string>(3).fold(toStr, identity)).to.equal('3');
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

