import { expect } from 'chai';
import 'mocha';

import {
  DecodeError, Index, TypedObject, ObjectKey, all, number, string, inList, boolean,
  array, oneOf, bool, object, nullable, dict, parse, toEnum, and, Decoded, lazy, Decoder, partial
} from './decoder';

import Result from './result';
import Maybe from './maybe';
import { is, over, lensPath, concat, pipe } from 'ramda';
import { URL } from 'url';

const toDate = (val: string): Result<Error, Date> => (
  (isNaN(Date.parse(val)) || !is(String, val))
    ? Result.err(new Error('[Invalid date]'))
    : Result.ok(new Date(val))
);

const newDate = () => {
  const d = new Date();
  d.setMilliseconds(0);
  return d;
};
const isUrl = Result.attempt((val: string) => new URL(val) && val);

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
       *
       * Basically it works if the test compiles.
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

    it('supports arbitrary `Result` functions', () => {
      const any = object('Any', { foo: Result.ok });

      expect(any({ foo: 'bar' })).to.deep.equal(Result.ok({ foo: 'bar' }));
      expect(any({ foo: 1138 })).to.deep.equal(Result.ok({ foo: 1138 }));
      expect(any({ foo: {} })).to.deep.equal(Result.ok({ foo: {} }));
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

    it('handles missing object keys', () => {
      expect(object('Foo', { bar: nullable(string) })({})).to.deep.equal(Result.ok({ bar: null }));
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

    it('properly fails over from composed decoders', () => {
      const date = newDate();
      const decoder = oneOf<Date | number[], Error>([toDate, array(number)]);

      expect(decoder(date.toString())).to.deep.equal(Result.ok(date));
      expect(decoder([-12345])).to.deep.equal(Result.ok([-12345]));

      expect(decoder(date).error()!.expected).to.equal(Array);
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
        'Decode Error: Expected Boolean, got `1` in path: .bar'
      );

      expect(dict(oneOf<string | number>([string, number]))({ one: '1', two: 2 })).to.deep.equal(
        Result.ok({ one: '1', two: 2 })
      );

      expect(dict(oneOf<string | number>([string, number]))({ one: '1', two: false }).error()!.toString()).to.equal(
        'Decode Error: Expected Number, got `false` in path: .two'
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
      const url = 'https://google.com/foo?bar';

      const thingDecoder = object('Thing', {
        url: pipe(string, parse(isUrl))
      });

      expect(thingDecoder({ url })).to.deep.equal(Result.ok({ url }));

      expect(thingDecoder({ url: '/' }).error()!.toString()).to.equal(
        `Decode Error: [TypeError [ERR_INVALID_URL]]: 'Invalid URL: /' in path: Decoder.object(Thing).url`
      );
    });

    it('correctly infers composed types', () => {
      const date = newDate();
      const thingDecoder = object('Thing', { date: pipe(string, parse(toDate)) });

      expect(thingDecoder({ date: date.toString() })).to.deep.eq(Result.ok({ date }));

      const result = thingDecoder({ date: 'foo' });

      expect((result.error()!.expected as Error).message).to.equal('[Invalid date]');
      expect(result.error()!.val).to.equal('foo');
      expect(result.error()!.key).to.deep.equal([
        new TypedObject('Thing'),
        new ObjectKey('date'),
      ]);
    });
  });

  describe('toEnum', () => {
    enum Opts {
      One,
      Two,
      Three
    };

    enum StringOpts {
      One = 'ONE',
      Two = 'TWO',
      Three = 'THREE',
    };

    it('matches enum options', () => {
      expect(toEnum('Opts', Opts)(0)).to.deep.equal(Result.ok(Opts.One));
    });

    it('matches string options', () => {
      expect(toEnum('StringOpts', StringOpts)('ONE')).to.deep.equal(Result.ok(StringOpts.One));
    });

    it('fails on out of range values', () => {
      expect(toEnum('Opts', Opts)(3)).to.deep.equal(
        Result.err(new DecodeError('Expected a value in enum `Opts`', 3))
      );
      expect(toEnum('StringOpts', StringOpts)('One')).to.deep.equal(
        Result.err(new DecodeError('Expected a value in enum `StringOpts`', 'One'))
      );
    });
  });

  describe('inList', () => {
    const opts = ['one', 'two', 'three'] as const;
    type Opts = typeof opts[number];
    const decoder = pipe(string, Result.chain(inList<Opts>(opts)));

    it('matches a value to a list entry', () => {
      expect(decoder('one' as any)).to.deep.equal(Result.ok('one'));
    });

    it('fails if a value is out of range', () => {
      expect(decoder('ONE')).to.deep.equal(Result.err(new DecodeError(
        'Expected one of [one, two, three]',
        'ONE',
      )));
    })
  });

  describe('and', () => {
    const intersection = and(
      object('Foo', { foo: string }),
      object('Bar', { bar: string })
    );

    it('combines decoders', () => {
      expect(intersection({ foo: '1', bar: '2' })).to.deep.equal(Result.ok({ foo: '1', bar: '2' }));
    });

    it('fails if either decoder fails', () => {
      expect(intersection({ foo: '', bar: 2 })).to.deep.equal(
        Result.err(new DecodeError(String, 2, [
          new TypedObject('Bar'),
          new ObjectKey('bar'),
        ]))
      );
    });

    it('fails if either decoder fails, 2', () => {
      expect(intersection({ foo: null, bar: '2' })).to.deep.equal(
        Result.err(new DecodeError(String, null, [
          new TypedObject('Foo'),
          new ObjectKey('foo'),
        ]))
      );
    });

    it('composes with unions', () => {
      const bar = object('Bar', { bar: boolean })
      const baz = object('Baz', { baz: boolean });
      const comp = and(
        object('Foo', { foo: string }),
        oneOf<Decoded<typeof bar> | Decoded<typeof baz>>([bar, baz])
      );

      expect(comp({ foo: '!', bar: true })).to.deep.equal(Result.ok({ foo: '!', bar: true }));
      expect(comp({ foo: '!', baz: false })).to.deep.equal(Result.ok({ foo: '!', baz: false }));
    });
  });

  describe('lazy', () => {
    type Node<A> = {
      value: A,
      children: Node<A>[];
    };

    const nodeTree: Decoder<Node<string>, never> = object('Node', {
      value: string,
      children: nullable(array(lazy(() => nodeTree)), [])
    });

    const json: any = {
      value: 'root',
      children: [
        { value: '1' },
        { value: '2', children: [{ value: '2.1' }, { value: '2.2' }] },
        {
          value: '3',
          children: [
            { value: '3.1', children: [] },
            { value: '3.2', children: [{ value: '3.2.1' }] }
          ]
        }
      ]
    };

    it('decodes recursive structures', () => {
      expect(nodeTree(json)).to.deep.equal(Result.ok({
        value: 'root',
        children: [
          { value: '1', children: [] },
          { value: '2', children: [{ value: '2.1', children: [] }, { value: '2.2', children: [] }] },
          {
            value: '3',
            children: [
              { value: '3.1', children: [] },
              { value: '3.2', children: [{ value: '3.2.1', children: [] }] }
            ]
          }
        ]
      }))
    });

    it('fails if any child fails', () => {
      const newData = over(
        lensPath(['children', 1, 'children']),
        concat<any>([{ children: [] }] as any) as any
      );
      const json2 = newData(json);

      expect(nodeTree(json2)).to.deep.equal(Result.err(new DecodeError(String, undefined, [
        new TypedObject('Node'),
        new ObjectKey('children'),
        new Index(1),
        new TypedObject('Node'),
        new ObjectKey('children'),
        new Index(0),
        new TypedObject('Node'),
        new ObjectKey('value')
      ])));
    });
  });

  describe('partial', () => {
    it('allows object keys to be nullable', () => {
      const objDecoder = object('Obj', { foo: string });
      const partialDecoder = partial(objDecoder);

      expect(objDecoder({ foo: 'bar' })).to.deep.equal(Result.ok({ foo: 'bar' }));
      expect(objDecoder({})).to.deep.equal(Result.err(new DecodeError(String, undefined, [
        new TypedObject('Obj'),
        new ObjectKey('foo'),
      ])));
      expect(partialDecoder({})).to.deep.equal(Result.ok({ foo: null }));
    });

    it('allows array elements to be nullable', () => {
      const decoder = partial(array(number));
      expect(decoder([123, null, undefined, 456])).to.deep.equal(Result.ok([123, null, null, 456]));
    });
  });

  describe('all', () => {
    it('converts single errors to an array', () => {
      const decoder = all(number);

      expect(decoder('Hello')).to.deep.equal(Result.err([
        new DecodeError(Number, 'Hello')
      ]));
    });

    it('it aggregates array errors', () => {
      const data = [123, 'foobar', 456];
      const decoder = all(array(string));

      expect(decoder(data)).to.deep.equal(Result.err([
        new DecodeError(String, 123),
        new DecodeError(String, 456)
      ]));
    });
  });

  describe('DecodeError', () => {
    describe('arrays', () => {
      it('get index of failed element', () => {
        const decoder = array(string);

        expect(decoder(['foo', 123])).to.deep.equal(Result.err(
          new DecodeError(String, 123, [new Index(1)])
        ));
      })
    });

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
          'Decode Error: Expected Number, got `"bad"` in path: Decoder.object(Things).things[2] > Decoder.object(Thing).id'
        );
      });
    });
  });

  /**
   * Validates example from the documentation.
   */
  describe('Doc Example', () => {
    it('works', () => {
      type Person = Decoded<typeof person>;
      type Task = Decoded<typeof task>;
      type TaskList = Decoded<typeof tasks>;

      const person = object('Person', {
        name: string,
        email: string,
        avatarUrl: pipe(string, parse(isUrl))
      });

      const task = object('Task', {
        id: number,
        title: string,
        completed: boolean,
        dueDate: nullable(pipe(string, parse(toDate))),
        owner: oneOf<string | Person, Error>([
          pipe(string, parse(isUrl)),
          person
        ])
      });

      const tasks = array(task);

      const data: any = [{
        id: 1138,
        title: 'Implement to-do example',
        completed: true,
        owner: {
          name: 'Will',
          email: 'will@gmail.com',
          avatarUrl: 'invalid.url'
        }
      }];

      const taskList: Result<DecodeError<Error>, TaskList> = tasks(data);

      expect(taskList.error()!.toString()).to.equal([
        `Decode Error: [TypeError [ERR_INVALID_URL]]: 'Invalid URL: invalid.url'`,
        'in path: [0] > Decoder.object(Task).owner > Decoder.object(Person).avatarUrl'
      ].join(' '))
    });
  });
});
