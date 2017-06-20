---
title: Schema Directives
---

## Directives

DgraphQL supports a number of GraphQL directives for configuring Dgraph and the
generated schema.

## Filter Operations

The `@filter` directive controls the filter operations available on a field.
There are currently two filter types: `EQUALITY` and `TERM`. The `@filter`
directive accepts an array of `types`.

The `EQUALITY` filter type adds filters for the following types:

- String, Boolean, Enum: `field_eq`
- Float, Int: `_eq`, `_lt`, `_le`, `_gt`, `_ge`

The `TERM` filter is only supported on `String` fields, and adds
`_anyofterms` and `_allofterms` filters.

Example:

```
type TypeName {
  # name_eq, name_anyofterms, name_allofterms
  name: String @filter(types: [EQUALITY, TERM])
  # active_eq
  active: Boolean @filter(types: [EQUALITY])
  # height_eq, height_lt, height_le, height_gt, height_ge
  height: Float @filter(types: [EQUALITY])
}
```

## Order Operations

The `@order` directive controls whether a type can be ordered by a field. Order
operations are only supported on `String`, `Int` and `Float` fields.

Example:

```
type TypeName {
  # order: name_asc, order: name_desc
  name: String @order
}
```

## Dgraph Indexes

Dgraph requires predicates used in filter and order operations to be indexed.
The `@filter` and `@order` directives create the required indexes for each
predicate when the DgraphQL client first connects to the database.

Note that, as Dgraph predicate schema are universal (ie. a property can only
have one type and index configuration applied to it), applying an index to one
property is equivalent to applying it to all properties of the same name.
DgrapQL will limit the operations in the generated schema even where the
underlying indexes might support them.

For more information on indexes see the [Dgraph documentation](https://docs.dgraph.io/v0.7.7/query-language/#indexing)

## Localizing Properties

Properties in Dgraph can have multiple, [localized values](https://docs.dgraph.io/v0.7.7/query-language/#language).
Marking a property as localized will store values under the current `language`
of the GraphQL-JS execution context. You can see an demo of this in [the example](https://github.com/dpeek/dgraphql/blob/master/example/index.js#L25).

```
type TypeName {
  # Mutations and queries will use the `language` of the graphql-js context
  name: String @localize
}
```

## Reverse Relationships

Often we want a GraphQL relationship to have an automatically managed reverse
relationship. When we add Person A to a Person B's children, we might also want
Person B added to Person A's parents. Similarly with a one-to-one relationship
we might want a Person partner relationship to automatically manage a reverse
partner relationship.

```
type Person {
  # Setting `Person A.manager` to `Person B` adds `Person A` to `Person B.staff`
  manager: Person @reverse(name: "staff")
  # Adding `Person A` to `Person B.staff` sets `Person A.manager` to `Person B`
  staff: [Person!]! @reverse(name: "manager")
}
```
