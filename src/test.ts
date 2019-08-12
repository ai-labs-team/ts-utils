import Decoder, { DecodeError } from './decoder';
import Result from './result';
import Maybe from './maybe';
import { path, pipe, prop } from 'ramda';

export class Post {
  public static new(args: any): Post {
    return new Post();
  }
}

// export const ok = <A>(value: A): Result<A> => new Ok(value);

// export const err = <A>(error: string): Result<A> => new Err<A>(error);

// export type Result<A> = Ok<A> | Err<A>;

// export abstract class Result<A> {

//   public static map<A, B>(fn: (a: A) => B): (result: Result<A>) => Result<B> {
//     return (result: Result<A>) => result.map(fn);
//   }

//   // @TODO
//   public static all<A, B>(fn: (a: A[]) => B): (as: Array<Result<A>>) => Result<B> {
//     return (as: Array<Result<A>>) => as.map(fn);
//   }

//   public abstract map<B>(_: (a: A) => B): Result<B>;
// }

// export class Ok<A> {
//   constructor(readonly value: A) { }

//   public map<B>(fn: (a: A) => B): Result<B> {
//     return ok(fn(this.value));
//   }
// }

// export class Err<A> {
//   constructor(readonly error: string) { }

//   public map<B>(_: (a: A) => B): Result<B> {
//     return err<B>(this.error);
//   }
// }


export const nullString = Decoder.nullable(Decoder.string);
export const alwaysString = Decoder.nullable(Decoder.string, '');
export const maybeString = Decoder.nullable(Decoder.string, Maybe.emptyOf<string>(), Maybe.of);

export type User = {
  email: string;
  // foo: string;
  person: {
    firstName: string;
    lastName: string;
  };
};

export const userDecoder = Decoder.object('User', {
  email: Decoder.string,
  person: Decoder.object('Person', {
    firstName: Decoder.string,
    lastName: Decoder.string,
  }),
});

export const u: Result<DecodeError, User> = userDecoder.decode({ foo: 'bar' });

const name = u.map(({ person }) => person.firstName);
const person = u.map(prop('person'));

console.log(name, person);

