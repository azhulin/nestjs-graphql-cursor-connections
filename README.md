# NestJS GraphQL Cursor Connections

[GraphQL Cursor Connections](https://relay.dev/graphql/connections.htm) 
specification implementation for NestJS.

## Contents
- [Installation](#installation)
- [Usage](#usage)
  - [Connection Edge](#connection-edge)
  - [Connection](#connection)
  - [Connection Arguments](#connection-arguments)
  - [Connection Builder](#connection-builder)
  - [Connection Resolver](#connection-resolver)
- [Arguments Adjusting](#arguments-adjusting)
- [Pagination Algorithm](#pagination-algorithm)
- [Offset Pagination](#offset-pagination)
- [Dynamic Cursor (Sorting)](#dynamic-cursor-sorting)
- [Additional Fields](#additional-fields)
  - [Connection Edge Additional Fields](#connection-edge-additional-fields) 
  - [Connection Additional Fields](#connection-additional-fields)
- [Fake Cursor Pagination](#fake-cursor-pagination)
  - [Fake Cursor Connection Builder](#fake-cursor-connection-builder)
  - [Fake Cursor Connection Resolver](#fake-cursor-connection-resolver)

## Installation

```shell
npm i nestjs-graphql-cursor-connections
```

## Usage

Assume we have users assigned to groups, and we need to provide a list of users 
of a specific group ordered by email address using connections pagination 
pattern.

```ts
import { Field, Int, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class User {
  @Field(() => Int)
  public id!: number

  @Field()
  public email!: string

  @Field()
  public name!: string

  @Field()
  public groupId!: string
}
```

```
type User {
  id: Int!
  email: String!
  name: String!
  groupId: String!
}
```

### Connection Edge

Create a connection edge type extending the class returned by the 
`ConnectionEdge()` function passing the target GraphQL type to it.

```ts
import { ObjectType } from '@nestjs/graphql'
import { ConnectionEdge } from 'nestjs-graphql-cursor-connections'

@ObjectType()
export class UserConnectionEdge extends ConnectionEdge(User) {}
```

This will produce the following GraphQL type:

```
type UserConnectionEdge {
  node: User!
  cursor: String!
}
```

### Connection

Create a connection type extending the class returned by the `Connection()` 
function passing the connection edge type to it.

```ts
import { ObjectType } from '@nestjs/graphql'
import { Connection } from 'nestjs-graphql-cursor-connections'

@ObjectType()
export class UserConnection extends Connection(UserConnectionEdge) {}
```

This will produce the following GraphQL type:

```
type UserConnection {
  pageInfo: PageInfo!
  edges: [UserConnectionEdge!]!
  totalEdges: Int!
}
```

### Connection Arguments

Create a connection arguments type extending the `ConnectionArgs` class and add 
any extra filtering/sorting arguments if needed. In our case we need a `groupId` 
argument to filter users.

```ts
import { ArgsType, Field } from '@nestjs/graphql'
import { IsNotEmpty } from 'class-validator'
import { ConnectionArgs } from 'nestjs-graphql-cursor-connections'

@ArgsType()
export class UserConnectionArgs extends ConnectionArgs {
  @Field()
  @IsNotEmpty()
  groupId!: string
}
```

This will produce the following GraphQL arguments:

```
after: String
before: String
first: Int
last: Int
groupId: String!
```

### Connection Builder

Create a connection builder extending the `ConnectionBuilder` class and 
implement all of its abstract methods.

```ts
import { ConnectionBuilder } from 'nestjs-graphql-cursor-connections'

type UserCursorData = string

export class UserConnectionBuilder extends ConnectionBuilder<
  UserConnection, UserConnectionEdge, User, UserCursorData
> {
  /**
   * Cursor data is a node field or a set of node fields that uniquely identify
   * the node position in the list.
   * Cursor data can be a number, a string, an array, or an object.
   */
  protected getCursorData(node: User): UserCursorData {
    // In our case the cursor data is a string representing user email address.
    return node.email
  }

  /**
   * Since the cursor is an input argument, the unpacked cursor data must be
   * validated to be sure it can be safely used.
   */
  protected isValidCursorData(data: unknown): boolean {
    return 'string' === typeof data && 0 < data.length
  }

  /**
   * When cursor argument can not be unpacked or unpacked cursor data fails
   * validation, the cursor argument can be ignored (return null), or an error
   * can be thrown (return an error).
   */
  protected getCursorDataError(name: 'after' | 'before', value: string): null | Error {
    return new Error(`Cursor argument '${name}' has invalid value '${value}'.`)
  }
}
```

### Connection Resolver

Here is an example implementation of a query resolver. The implementation of a 
field resolver is similar.

```ts
import { Injectable } from '@nestjs/common'
import { Args, Query, Resolver } from '@nestjs/graphql'

@Injectable()
@Resolver()
export class UserGraphqlResolver {
  public constructor(private readonly repository: UserRepository) {}

  @Query(() => UserConnection, { nullable: true })
  public async groupUsers(@Args() args: UserConnectionArgs): Promise<null | UserConnection> {
    const maxEdgesToReturn = 10
    const connectionBuilder = new UserConnectionBuilder(args, maxEdgesToReturn)
    const { groupId } = args
    // Contains the unpacked cursor data (user email) or `undefined`.
    const { after, before } = connectionBuilder
    // The result of the count users query below.
    const totalEdges = await this.repository.countGroupUsers(groupId, { after, before })
    // Returns the result set bounds: start, end, skip (start), take (end - start).
    const { take, skip } = connectionBuilder.getBounds(totalEdges)
    // The result of the find users query below.
    const users = await this.repository.findGroupUsers(groupId, { after, before, skip, take })
    return connectionBuilder.build(users, totalEdges)
  }
}
```

#### Count users query

```postgresql
SELECT COUNT(*) FROM users
WHERE groupId = :groupId AND email > :after AND email < :before;
```

#### Find users query

```postgresql
SELECT * FROM users
WHERE groupId = :groupId AND email > :after AND email < :before 
ORDER BY email ASC 
LIMIT :take OFFSET :skip;
```

## Arguments Adjusting

If `maxEdgesToReturn` connection builder parameter is specified, and it is 
greater than 0, the `first` and `last` arguments are being adjusted, so that the 
number of edges returned never exceeds `maxEdgesToReturn`:
- If both, `first` and `last` arguments are omitted, the `first` argument is set
  to `maxEdgesToReturn`.
- If only `first` argument is specified, and is greater than `maxEdgesToReturn`, 
the `first` argument is set to `maxEdgesToReturn`.
- If only `last` argument is specified, or both `first` and `last` arguments are 
specified, and `last` argument is greater than `maxEdgesToReturn`, the `last` 
argument is set to `maxEdgesToReturn`.

## Pagination Algorithm

To determine what edges to return, the connection evaluates the `after` and 
`before` cursors to filter the edges, then evaluates `first` to slice the edges, 
then `last` to slice the edges.

Let we have a set of all edges: 

**A B C D E F G H I J K L M N O P Q R S T U V W X Y Z**

If `after` is set and exists (`E`), remove all edges before and including 
`after` edge:

~~A B C D E~~ **F G H I J K L M N O P Q R S T U V W X Y Z**

If `before` is set and exists (`U`), remove all edges after and including 
`before` edge:

<sub>A B C D E</sub> **F G H I J K L M N O P Q R S T** ~~U V W X Y Z~~

If `first` is set (`10`), and edges length greater than `first`, slice edges to 
be of length `first` by removing edges from the end.

<sub>A B C D E</sub> **F G H I J K L M N O** ~~P Q R S T~~ <sub>U V W X Y Z</sub>

If `last` is set (`5`), and edges length greater than `last`, slice edges to be 
of length `last` by removing edges from the start.

<sub>A B C D E</sub> ~~F G H I J~~ **K L M N O** <sub>P Q R S T U V W X Y Z</sub>

Edges to return:

<sub>A B C D E F G H I J</sub> **K L M N O** <sub>P Q R S T U V W X Y Z</sub>

## Offset Pagination

Offset pagination can be achieved by combining `first` and `last` connection 
arguments.

Let `edgesPerPage` is a number of edges to display per page, then the `N`th
page can be retrieved using the following arguments:

```
first: edgesPerPage * N 
last: edgesPerPage
```

And a total number of pages can be calculated in the following way:

```ts
const totalPages = Math.ceil(connection.totalEdges / edgesPerPage)
```

## Dynamic Cursor (Sorting)

There are cases where connection arguments can affect the cursor data
generation. For example, `sortBy` argument.

Assume we need the ability to sort users by ID and email fields:

```ts
export enum UsersSortBy {
  Id = 'id',
  Email = 'email',
}
```

And we have the following connection arguments type:

```ts
import { ArgsType, Field } from '@nestjs/graphql'
import { IsEnum } from 'class-validator'
import { ConnectionArgs } from 'nestjs-graphql-cursor-connections'

@ArgsType()
export class UserConnectionArgs extends ConnectionArgs {
  @IsEnum(UsersSortBy)
  @Field(() => UsersSortBy)
  public readonly sortBy!: UsersSortBy
}
```

This connection arguments type produces the following GraphQL arguments:

```
after: String
before: String
first: Int
last: Int
sortBy: UsersSortBy!
```

Create a connection builder extending the `ConnectionBuilder` class and
specifying `UserConnectionArgs` as the 5th generic argument. After this the
`sortBy` argument can be accessed from `this.args`:

```ts
import { ConnectionBuilder } from 'nestjs-graphql-cursor-connections'

type UserCursorData = { id: number } | { email: string }

export class UserConnectionBuilder extends ConnectionBuilder<
  UserConnection,
  UserConnectionEdge,
  User,
  UserCursorData,
  UserConnectionArgs
> {
  protected getCursorData(node: User): UserCursorData {
    switch (this.args.sortBy) {
      case UsersSortBy.Id:
        return { id: node.id }
      case UsersSortBy.Email:
        return { email: node.email }
    }
  }

  protected isValidCursorData(data: unknown): boolean {
    switch (this.args.sortBy) {
      case UsersSortBy.Id:
        // Check that data is `{ id: number }`.
        return this.isValidIdCursorData(data)
      case UsersSortBy.Email:
        // Check that data is `{ email: string }`.
        return this.isValidEmailCursorData(data)
    }
  }

  protected getCursorDataError(name: 'after' | 'before', value: string): null | Error {
    return new Error(`Cursor argument '${name}' has invalid value '${value}'.`)
  }
  ...
}
```

## Additional Fields

### Connection Edge Additional Fields

Connection edge types may have additional fields related to the edge. There are 
two ways to provide additional fields:
- By creating a field resolver for a connection edge

```ts
import { Injectable } from '@nestjs/common'
import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

@Injectable()
@Resolver(() => UserConnectionEdge)
export class UserConnectionEdgeResolver {
  @ResolveField(() => Boolean)
  public additionalField(@Parent() edge: UserConnectionEdge): Promise<boolean> {
    return this.getAdditionalField(edge)
  }
  ...
}
```

- By extending a connection edge type and overriding `createConnectionEdge()` 
method of the connection builder

```ts
import { Field, ObjectType } from '@nestjs/graphql'
import { ConnectionEdge } from 'nestjs-graphql-cursor-connections'

@ObjectType()
export class UserConnectionEdge extends ConnectionEdge(User) {
  @Field()
  additionalField!: boolean
}
```

```ts
import { ConnectionBuilder, ConnectionEdge } from 'nestjs-graphql-cursor-connections'

export class UserConnectionBuilder extends ConnectionBuilder<...> {
  ...
  protected async createConnectionEdge(edge: ConnectionEdge<User>): Promise<UserConnectionEdge> {
    const additionalField = await this.getAdditionalField(edge)
    return { ...edge, additionalField }
  }
  ...
}
```

In both cases the following GraphQL type will be produced:

```
type UserConnectionEdge {
  node: User!
  cursor: String!
  additionalField: Boolean!
}
```

### Connection Additional Fields

Connection types may have additional fields related to the connection. There are 
two ways to provide additional fields:
- By creating a field resolver for a connection

```ts
import { Injectable } from '@nestjs/common'
import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

@Injectable()
@Resolver(() => UserConnection)
export class UserConnectionResolver {
  @ResolveField(() => Boolean)
  public additionalField(@Parent() connection: UserConnection): Promise<boolean> {
    return this.getAdditionalField(connection)
  }
  ...
}
```

- By extending a connection type and overriding `createConnection()` method of 
the connection builder

```ts
import { Field, ObjectType } from '@nestjs/graphql'
import { Connection } from 'nestjs-graphql-cursor-connections'

@ObjectType()
export class UserConnection extends Connection(UserConnectionEdge) {
  @Field()
  additionalField!: boolean
}
```

```ts
import { Connection, ConnectionBuilder } from 'nestjs-graphql-cursor-connections'

export class UserConnectionBuilder extends ConnectionBuilder<...> {
  ...
  protected async createConnection(connection: Connection<UserConnectionEdge>): Promise<UserConnection> {
    const additionalField = await this.getAdditionalField(connection)
    return { ...connection, additionalField }
  }
  ...
}
```

In both cases the following GraphQL type will be produced:

```
type UserConnection {
  pageInfo: PageInfo!
  edges: [UserConnectionEdge!]!
  totalEdges: Int!
  additionalField: Boolean!
}
```

## Fake Cursor Pagination

In cases when node fields can not uniquely identify the node position in the 
list, there is no way to create a real cursor, and the only way to paginate 
through the list is to use offset pagination. 

It is possible to hide the offset pagination behind the cursor pagination 
interface, assuming that cursor is a node position in the list – a fake cursor.

Create [Connection Edge](#connection-edge), [Connection](#connection), and 
[Connection Arguments](#connection-arguments).

### Fake Cursor Connection Builder

Create a connection builder extending the `FakeCursorConnectionBuilder` class 
and implement all of its abstract methods.

```ts
import { FakeCursorConnectionBuilder } from 'nestjs-graphql-cursor-connections'

export class UserFakeCursorConnectionBuilder extends FakeCursorConnectionBuilder<
  UserConnection, UserConnectionEdge, User
> {
  /**
   * When cursor can not be unpacked or unpacked cursor data fails validation,
   * the cursor argument can be ignored (return null), or an error can be thrown
   * (return an error).
   */
  protected getCursorDataError(name: string, value: string): null | Error {
    return new Error(`Cursor argument '${name}' has invalid value '${value}'.`)
  }
}
```

### Fake Cursor Connection Resolver

Here is an example implementation of a query resolver. The implementation of a 
field resolver is similar.

```ts
import { Injectable } from '@nestjs/common'
import { Args, Query, Resolver } from '@nestjs/graphql'

@Injectable()
@Resolver()
export class UserGraphqlResolver {
  public constructor(private readonly repository: UserRepository) {}

  @Query(() => UserConnection, { nullable: true })
  public async groupUsers(@Args() args: UserConnectionArgs): Promise<null | UserConnection> {
    const maxEdgesToReturn = 10
    const connectionBuilder = new UserFakeCursorConnectionBuilder(args, maxEdgesToReturn)
    const { groupId } = args
    // The result of the count users query below.
    const totalEdges = await this.repository.countGroupUsers(groupId)
    // Returns the result set bounds: start, end, skip (start), take (end - start).
    const { take, skip } = connectionBuilder.getBounds(totalEdges)
    // The result of the find users query below.
    const users = await this.repository.findGroupUsers(groupId, { skip, take })
    return connectionBuilder.build(users, totalEdges)
  }
}
```

#### Count users query

```postgresql
SELECT COUNT(*) FROM users
WHERE groupId = :groupId
```

#### Find users query

```postgresql
SELECT * FROM users
WHERE groupId = :groupId 
ORDER BY email ASC
LIMIT :take OFFSET :skip;
```
