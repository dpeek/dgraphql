---
title: Schema Directives
---

## Directives

DgraphQL supports a number of custom GraphQL directives for customizing the
configuration of both Dgraph and the generated schema.

## Indexing Properties

Dgraph requires properties used in filter and order operations to be indexed.
The `@index` directive automatically creates indexes for the specified property
when the DgraphQL client first connects to the database.

String property types support a number of indexes:

```
type TypeName {
  # Allows `name_eq`
  name: String @index(type: "exact")
  # Allows `type_eq`, smaller memory footprint that `exact`
  type: String @index(type: "hash")
  # Allows `tags_anyofterms` and `tags_allofterms`
  tags: String @index(type: "term")
  # Allows `content_anyofterms` and `content_allofterms` with with language
  # specific stemming and stopwords
  content: String @index(type: "fulltext")
}
```

You can also create multiple indexes for a single property:

```
type TypeName {
  name: String @index(type: "exact") @index(type: "term")
}
```

Each property type has an equivalent index:

- Int: `@index(type: "int")`
- Float: `@index(type: "int")`
- Boolean: `@index(type: "bool")`

Note that, as Dgraph property schema as universal (ie. a property can only have
one type and index configuration applied to it), applying an index to one
property is equivalent to applying it to all properties of the same name.

As the available indexes on a property effectively dictate the kinds of query
that can be performed against it, a future improvement would be specifying the
queries allowed on the property and inferring the indexes to create from that.

Dgraph also supports `trigram`, `geo`, `date` and `datetime` indexes. These
indexes can be created by are not currently exposed by the generated schema or
available types.

For more information on the available indexes see the [Dgraph documentation](https://docs.dgraph.io/v0.7.7/query-language/#indexing)

## Localizing Properties

Properties in Dgraph can have multiple, [localized values](https://docs.dgraph.io/v0.7.7/query-language/#language). Marking a
property as localized will store values under the current `language` of the
GraphQL-JS execution context. You can see an demo of this in [the example](https://github.com/dpeek/dgraphql/blob/master/example/index.js#L25).

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
