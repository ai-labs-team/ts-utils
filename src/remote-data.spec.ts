import { expect } from 'chai';
import 'mocha';
import { always, identity, inc, pipe } from 'ramda';
import Maybe from './maybe';
import * as RemoteData from './remote-data';

describe('RemoteData', () => {

  describe('map()', () => {
    it('maps loaded values', () => {
      expect(RemoteData.Loaded(1).map(inc)).to.deep.equal(RemoteData.Loaded(2));
    });

    it('no-ops on non-loaded values', () => {
      expect(RemoteData.Failed('badness').map(always('!'))).to.deep.equal(RemoteData.Failed('badness'));
    });
  });

  describe('defaultTo()', () => {
    it('defaults when no loaded value', () => {
      expect(RemoteData.defaultTo([], RemoteData.NotLoaded)).to.deep.eq([]);
    });

    it('returns loaded value', () => {
      expect(RemoteData.defaultTo(0, RemoteData.Loaded(1))).to.deep.eq(1);
    });
  });

  describe('mapKeys()', () => {
    it('maps when all keys are loaded', () => {
      expect(RemoteData.mapKeys(identity, {
        foo: RemoteData.Loaded(1),
        bar: RemoteData.Loaded(2),
        baz: RemoteData.Loaded(3),
      })).to.deep.equal(Maybe.of({ foo: 1, bar: 2, baz: 3 }));
    });

    it('returns Nothing when keys are not loaded', () => {
      expect(RemoteData.mapKeys(identity, {
        foo: RemoteData.Failed('badness'),
        bar: RemoteData.Loaded(2),
        baz: RemoteData.Loaded(3),
      })).to.deep.equal(Maybe.empty);
    });
  });

  describe('JSON conversion', () => {
    it('serializes 0-arity states', () => {
      expect(JSON.stringify(RemoteData.NotLoaded)).to.equal('{"state":"notLoaded"}');
      expect(JSON.stringify(RemoteData.Loading)).to.equal('{"state":"loading"}');
    });

    it('deserializes to correct types', () => {
      const serde = pipe(JSON.stringify, JSON.parse, RemoteData.fromJSON);
      expect(serde(RemoteData.NotLoaded)).to.equal(RemoteData.NotLoaded);
      expect(serde(RemoteData.Loading)).to.equal(RemoteData.Loading);
    });
  });
});
