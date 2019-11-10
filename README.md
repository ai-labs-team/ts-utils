# TypeScript Utility Modules

A collection of TypeScript utility classes and functions for safe, principled data manipulation. Class modules support both instance methods and static (curried) functions.

## Prior Art

 - Elm (particularly [`Json.Decode`](https://package.elm-lang.org/packages/elm/json/latest/Json-Decode))
 - [`ts.data.json`](https://github.com/joanllenas/ts.data.json)

## Modules

### `Maybe`

Represents a value that may or may not be present. While it provides equivalent functionality to the definition of `Maybe` found in other programming environments, it doesn't fully map to formal definition. Rather, the design goals are ease of use, and coherence with TypeScript's type checker.

```typescript
Maybe.of('Hello').map(str => str.toUpperCase()).defaultTo('??') // ==> 'HELLO'
Maybe.of(null).map(str => str.toUpperCase()).defaultTo('??') // ==> '??'
```

### `Result`

Represents an operation that could succeed or fail, and encapsulates both cases.

### `Decoder`

A module of utility functions for safely consuming untyped data. Provides strong type-safety guarantees that data from APIs or other third-party sources is correct.

Also includes utlities to derive type definitions from decoders, to avoid redundancy and multiple sources of truth. Example:

```typescript
// Original code

type User = {
  name: string;
  email: string;
  created: number;
  isActive: boolean;
};
```

Using decoders, this type can be written directly as a function that accepts a value, and returns a `Result` with a success value of `User`:

```typescript
// Step 1

import { boolean, object, string } from '@ailabs/ts-utils/dist/decoder';

const user = object('User', {
  name: string,
  email: string,
  created: number,
  isActive: boolean
});

const valueFromAPI: any = {
  name: 'Will',
  email: 'will@gmail.com',
  created: 1342828800,
  isActive: true
};

user(valueFromAPI) // ==> Result<..., { name: string, ... }>
```

The final step is to _derive_ the original type from the decoder, so that it can be used elsewhere in the application, the same as a manually-defined type:

```typescript
// Step 2

import { Decoded, ... } from '@ailabs/ts-utils/dist/decoder';

const user = object('User', {
  // ...
});

// The `User` type is now equivalent to the `User` type in the original example
type User = Decoded<typeof user>;
```

`Decoder` also includes utilites for mapping common type definitions, such as union types and enums:

##### `inList`: Converts a value to a member of a union type

Given the following union:

```typescript
type Union = 'one' | 'two' | 'three';
```

It can be converted to an equivalent type + decoder as follows:

```typescript
import { inList } from '@ailabs/ts-utils/dist/decoder';

type Union = typeof union[number];

const union = ['one', 'two', 'three'] as const;
const toUnion = inList(union);
```

##### `toEnum`: Converts a value to a member of an enum type

```typescript
import { toEnum } from '@ailabs/ts-utils/dist/decoder';

enum Status {
  Pending = 'Pending',
  Approved = 'Approved',
  Cancelled = 'Cancelled',
  Declined = 'Declined'
}

const toStatus = toEnum('Status', Status);

toStatus('Pending') // ==> Result<..., Status>
```

##### `and`: Intersects decoders, analogous to TypeScript's `&` operator

```typescript
import { and, string, object } from '@ailabs/ts-utils/dist/decoder';

const foo = object('Foo', { foo: string });
const bar = object('Bar', { bar: string });

const fooAndBar = and(foo, bar);
// ==> Decoder<..., { foo: string } & { bar: string }>;
```

### Decoder Composition & Error Handling

The `Decoder` module strives to facilitate the representation of any valid JSON value, and to handle the challenges of varying or inconsistent formats. The following example demonstrates a `Task` type, with the following attributes:

 - An optional `due` field (a `Date` type)
 - An `owner` field, which is either a `Person` type, or a URL to a `Person` resource

(**Note**: The [`pipe()`](https://ramdajs.com/docs/#pipe) function imported from the Ramda library provides left-to-right function composition).

```typescript
import { pipe } from 'ramda';
import Result from '@ailabs/ts-utils/dist/result';
import {
  DecodeError, Decoded, object, string, parse,
  number, boolean, nullable, oneOf, array
} from '@ailabs/ts-utils/dist/decoder';

/**
 * Utility function to convert a parseable string to a date, or
 * else fail with an error.
 */
const toDate = (val: string): Result<Error, Date> => (
  isNaN(Date.parse(val))
    ? Result.err(new Error('[Invalid date]'))
    : Result.ok(new Date(val))
);

/**
 * Utility function to validate that a string is a URL. The `URL`
 * constructor will throw an error if the parameter is not a valid URL, so
 * `Result.attempt()` is used trap the error and convert it to a failed
 * `Result` object.
 */
const isUrl = Result.attempt((val: string) => new URL(val) && val);

/* ... */

/**
 * Extract domain model type definitions from decoders
 */
type Person = Decoded<typeof person>;
type Task = Decoded<typeof task>;
type TaskList = Decoded<typeof tasks>;

/**
 * Define the decoder for the `Person` type—this could be inlined
 * inside of `task`, except that the type definition is needed for
 * `oneOf()`, which requires an explicit type parameter of the union
 * of all possible decoder types.
 */
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

console.log(taskList.error()!.toString());

// ==> Decode Error: [TypeError [ERR_INVALID_URL]]: 'Invalid URL: invalid.url' \
//       in path: [0] > \
//       Decoder.object(Task).owner > \
//       Decoder.object(Person).avatarUrl
```

Decoders produce highly detailed errors, reporting the exact path of invalid data, as well as the value(s) that failed to decode.

The structural information that errors are generated from is also exposed on `DecodeError` for consumption by other tools.