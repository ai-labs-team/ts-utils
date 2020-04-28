import { expect } from 'chai';
import { pipe } from 'ramda';
import Maybe from './maybe';

describe('Maybe', () => {

  describe('all', () => {
    it('transforms a list of non-empty maybes to a maybe of a list', () => {
      expect(Maybe.all([1, 2, 3, 4, 5].map(Maybe.of))).to.deep.equal(Maybe.of([1, 2, 3, 4, 5]));
    });

    it('returns Nothing when a list item is Nothing', () => {
      expect(Maybe.all([1, 2, 3, 4, 5].map(Maybe.of).concat([Maybe.empty]))).to.deep.equal(Maybe.empty);
    });
  });

  describe('defaultTo', () => {
    it('uses default values when empty', () => {
      expect((new Maybe<number>(null)).defaultTo(1)).to.equal(1);
      expect(pipe<any, any, any>(Maybe.of, Maybe.defaultTo(1))(null)).to.equal(1);
    });
  });

  describe('defaultToLazy', () => {
    let evaluated: boolean;

    beforeEach(() => evaluated = false);

    it('does not evaluate when present', () => {
      expect(Maybe.of(41).defaultToLazy(() => {
        evaluated = true;
        return 42;
      })).to.equal(41);

      expect(evaluated).to.equal(false);
    });

    it('evaluates when empty', () => {
      expect(Maybe.emptyOf<number>().defaultToLazy(() => {
        evaluated = true;
        return 42;
      })).to.equal(42);

      expect(evaluated).to.equal(true);
    });
  });

  describe('map', () => {
    /**
     * @link https://github.com/sanctuary-js/sanctuary-maybe#maybefantasy-landmap--maybeaa-b---maybeb
     */
    describe(`sanctuary-maybe spec`, () => {
      it('mimics spec 1', () => {
        expect(Maybe.empty.map(Math.sqrt)).to.deep.eq(Maybe.empty);
      });

      it('mimics spec 2', () => {
        expect(Maybe.of(9).map(Math.sqrt)).to.deep.eq(Maybe.of(3));
      });
    });
  });

  describe('chain', () => {
    /**
     * @link https://github.com/sanctuary-js/sanctuary-maybe#maybefantasy-landchain--maybeaa-maybeb---maybeb
     */
    describe(`sanctuary-maybe spec`, () => {
      const ofHead = <Val>(xs: Val[]) => xs.length === 0 ? Maybe.empty : Maybe.of(xs[0]);

      it('mimics spec 1', () => {
        expect(Maybe.empty.chain(ofHead)).to.deep.eq(Maybe.empty);
      });

      it('mimics spec 2', () => {
        expect(Maybe.of([]).chain(ofHead)).to.deep.eq(Maybe.empty);
      });

      it('mimics spec 3', () => {
        expect(Maybe.of(['foo', 'bar', 'baz']).chain(ofHead)).to.deep.eq(Maybe.of('foo'));
      });
    });
  });
});
