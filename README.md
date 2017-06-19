# DGraphQL

Create a Relay compatible GraphQL server from a schema using [Dgraph](https://github.com/dgraph-io/dgraph)

[![npm](https://img.shields.io/npm/v/dgraphql.svg)](https://www.npmjs.com/package/dgraphql)
[![Documentation](https://img.shields.io/badge/support-docs-blue.svg)](http://dpeek.com/dgraphql/)
[![Travis](https://img.shields.io/travis/dpeek/dgraphql.svg)](https://travis-ci.org/dpeek/dgraphql)
[![Coveralls](https://img.shields.io/coveralls/dpeek/dgraphql.svg)](https://coveralls.io/github/dpeek/dgraphql)

Dgraph is a distributed, highly available graph database that uses a language
similar to GraphQL to query and mutate data. Unlike GraphQL, Dgraph only defines
schema for predicates (properties) within the graph; there is no concept of
complex types or groups of properties. Because of this it is straight forward to
store any GraphQL schema in Dgraph provided a few restrictions are met.

Given a GraphQL schema, DgraphQL can do four things:

1. Generate a GraphQL-JS schema that maps GraphQL queries to Dgraph queries
2. Transform Dgraph responses into GraphQL responses (including support for the
   relay connection specification)
3. Generate defaults for create/update/delete/query operations (with filtering,
   ordering and nested create/update mutations)
4. Configure Dgraph's schema with types and indexes each property.

## Getting Started

The example describes basic usage. First, install dependencies:

```sh
yarn install
```

The example and expects a Dgraph instance that you don't mind filling with junk
running at <http://localhost:8080>. You can either [install Dgraph](https://docs.dgraph.io/v0.7.7/get-started#system-installation)
or (much better) run it in Docker:

Install the Dgraph Docker image:

```sh
docker pull dgraph/dgraph
```

And run Dgraph:

```sh
yarn run dgraph
```

Run the example (in another terminal):

```sh
yarn start
```

Or run the test suite:

```sh
yarn test
```

## Using DgraphQL

Install DgraphQL from npm

With yarn:

```sh
yarn add dgraphql
```

The entry point to the library is `buildSchema`

```javascript
import { graphql } from 'graphql'
import { buildSchema } from 'dgraphql'

const config = {
  server: 'http://localhost:8080/query'
}

const source = `
type Person {
  id: ID!
  name: String @index(type: "exact")
  children: [Person!]! @reverse(name: "parents")
  parents: [Person!]! @reverse(name: "children")
}`

const schema = buildSchema(source, config)

const mutation = `
mutation {
  createPerson(input: { name: "David" }) {
    person {
      id
    }
  }
}`

graphql(schema, mutation).then(result => {
  console.log(result);
})
```

## Directives

The following directives can be applied to type properties to
customize behavior:

- `@index(type: "type")` adds a [Dgraph index](https://docs.dgraph.io/v0.7.7/query-language/#indexing)
to the property.
- `@localize` creates a [localized property](https://docs.dgraph.io/v0.7.7/query-language/#language):
the locale is decided by the language property of the graphql-js context (see `example/index.js`)
- `@reverse` specifies the reverse edge to create when the relation is created

## Notes

`buildSchema` currently updates the schema of the configured Dgraph instance
based on the input schema (without even asking – how rude).

Dgraph requires indexes on properties on which filtering/ordering operations are
performed. Eventually the available operations will be driven by the indexes.

Relay mode turns one to many edges into connections with pagination etc.
