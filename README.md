# DGraphQL

Generate [graphql.js](https://github.com/graphql/graphql-js) schema for [dgraph](https://github.com/dgraph-io/dgraph).

[![Build Status](https://travis-ci.org/dpeek/dgraphql.svg?branch=master)](https://travis-ci.org/dpeek/dgraphql?branch=master)
[![Coverage Status](https://coveralls.io/repos/dpeek/dgraphql/badge.svg?branch=master)](https://coveralls.io/r/dpeek/dgraphql?branch=master)

## Usage

First, install dependencies:

`yarn install`

The example and test suite expect a Dgraph instance that you don't mind filling
with junk running at <http://localhost:8080>. You can either [install  Dgraph](https://docs.dgraph.io/v0.7.7/get-started#system-installation) or
run it in Docker:

Install the Dgraph Docker image:

`docker pull dgraph/dgraph`

And run Dgraph:

`yarn run dgraph`

Run the example (in another terminal):

`yarn start`

Or run the test suite:

`yarn test`

## Notes

You can run in relay mode by passing in `{relay: true}` to `buildSchema`. This
turns one-to-many edges into connections with pagination etc.

You can specify the Dgraph predicate for an edge using a directive. This is
useful when doing `@reverse` relationships:

```graphql
type SomeType {
  someField: [AnotherType!]! @dgraph(predicate: "~predicateName")
}
```
