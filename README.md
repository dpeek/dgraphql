# DGraphQL

Generate [graphql.js](https://github.com/graphql/graphql-js) schema for [dgraph](https://github.com/dgraph-io/dgraph).

[![Build Status](https://travis-ci.org/dpeek/dgraphql.svg?branch=master)](https://travis-ci.org/dpeek/dgraphql?branch=master)
[![Coverage Status](https://coveralls.io/repos/dpeek/dgraphql/badge.svg?branch=master)](https://coveralls.io/r/dpeek/dgraphql?branch=master)

## Usage

Install dgraph:

<https://docs.dgraph.io/v0.7.7/get-started#system-installation>

The example and test suite expect a dgraph instance that you don't mind filling
with junk running at <http://localhost:8080>. Rather than get clever with npm
scripts or the example I'll let you figure that one out.

Install dependencies:

`yarn install`

Run the example:

`yarn start`

Run the test suite:

`yarn test`

## Notes and Warnings

You can run in relay mode by passing in `{relay: true}` to build schema. This
turns one-to-many edges into connections with pagination etc.

You can specify the dgraph predicate for an edge using a directive. This is
useful when doing `@reverse` relationships:

```graphql
type SomeType {
  someField: [AnotherType!]! @dgraph(predicate: "~predicateName")
}
```

> Please note that this is a proof of concept and very far from ready for any
> kind of real-world use. There are some coding atrocities in here, committed
> in the interest of getting things working. Please forgive me.
